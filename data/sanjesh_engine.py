"""
Sanjesh Engine v8.3 - Dark Horse
Implementation of Iran's Sanjesh rules 1403-1405
Critical fixes: Bomi two-pool model, Z-score rank transformation
"""
import logging
from typing import Dict, List, Optional, Tuple, Any

logger = logging.getLogger("sanjesh_engine")

# ====================== Constants ======================
ADMISSION_DISPLAY_THRESHOLD = 50
PROBABILITY_MAX = 99.0
PROBABILITY_HIGH = 85.0
PROBABILITY_MEDIUM = 70.0
PROBABILITY_LOW = 50.0

RANK_RATIO_HIGH = 0.85
RANK_RATIO_MEDIUM = 1.0
RANK_RATIO_LOW = 1.15

SCORE_EXCELLENT = 1.10
SCORE_GOOD = 1.0
SCORE_ACCEPTABLE = 0.90

ISARGARAN_70_RULE = 0.70
ISARGARAN_85_RULE = 0.85

GPA_IMPACT_BY_YEAR = {
    1402: {"konkur": 0.60, "gpa": 0.40},
    1403: {"konkur": 0.50, "gpa": 0.50},
    1404: {"konkur": 0.40, "gpa": 0.60},
    1405: {"konkur": 0.40, "gpa": 0.60},
}

HISTORICAL_WEIGHTS = {"1404": 0.50, "1403": 0.30, "1402": 0.15, "1401": 0.05}

COURSE_TYPE_MULTIPLIER = {
    "roozaneh": 1.00,
    "shabaneh": 1.15,
    "pardis": 1.40,
    "majazi": 1.50,
    "azad": 1.60,
    "payam_noor": 2.00,
    "gheir_entefaei": 1.70,
    "mazad": 1.80,
}

SAVABEGH_QUOTA_BOOST = {
    "isargaran_25": 1.30,
    "shahid": 1.30,
    "isargaran_5": 1.15,
    "zone_3": 1.10,
    "zone_2": 1.00,
    "zone_1": 0.95,
}

DEFAULT_QUOTA = "zone_2"

METHOD_KONKUR = ("با آزمون", "konkur", "farhangian", "shahed", "boursie")
METHOD_SAVABEGH = ("سوابق تحصیلی", "savabegh")

MAJOR_GROUP_TO_DIPLOMAS = {
    "ریاضی-فیزیک": ["ریاضی", "فنی"],
    "علوم تجربی": ["تجربی"],
    "علوم انسانی": ["انسانی", "علوم و معارف"],
    "هنر": ["هنر", "ریاضی", "تجربی", "انسانی"],
    "فنی": ["فنی", "کاردانش", "ریاضی"],
}

ZONE_1_CITIES = {
    "تهران", "اصفهان", "مشهد", "تبریز", "شیراز", "کرج", "اهواز", "کرمانشاه",
    "قم", "رشت", "ارومیه", "زاهدان", "کرمان", "همدان", "اراک", "یزد",
}

POLES = {
    "قطب ۱": {"تهران", "البرز", "قم", "قزوین", "سمنان", "مرکزی"},
    "قطب ۲": {"اصفهان", "یزد", "چهارمحال و بختیاری"},
    "قطب ۳": {"فارس", "بوشهر", "هرمزگان", "کهگیلویه و بویراحمد"},
    "قطب ۴": {"خراسان رضوی", "خراسان شمالی", "خراسان جنوبی", "سیستان و بلوچستان", "کرمان"},
    "قطب ۵": {"آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "زنجان", "گیلان", "مازندران", "گلستان", "کردستان", "کرمانشاه", "ایلام", "لرستان", "همدان"},
}

ZONES_MAP = {
    "ناحیه ۱": {"تهران", "البرز", "قم", "قزوین", "سمنان"},
    "ناحیه ۲": {"اصفهان", "یزد"},
    "ناحیه ۳": {"فارس", "بوشهر", "هرمزگان"},
    "ناحیه ۴": {"آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "زنجان"},
    "ناحیه ۵": {"گیلان", "مازندران", "گلستان"},
    "ناحیه ۶": {"خراسان رضوی", "خراسان شمالی", "خراسان جنوبی"},
    "ناحیه ۷": {"کرمان", "سیستان و بلوچستان"},
    "ناحیه ۸": {"کردستان", "کرمانشاه", "ایلام", "لرستان", "همدان", "چهارمحال و بختیاری", "کهگیلویه و بویراحمد", "مرکزی", "خوزستان"},
}

# ====================== Helper Functions ======================
def determine_zone_from_education(education_history: Optional[Dict]) -> Optional[str]:
    if not education_history:
        return None
    zones = []
    cities = [
        education_history.get("grade_10_city", ""),
        education_history.get("grade_11_city", ""),
        education_history.get("grade_12_city", ""),
    ]
    for city in cities:
        if city in ZONE_1_CITIES:
            zones.append(1)
        elif city:
            zones.append(2)
        else:
            zones.append(3)
    if zones:
        return "zone_" + str(min(zones))
    return None

def resolve_user_quota(user: Dict) -> Tuple[str, List[str]]:
    warnings = []
    quota = user.get("quota")
    if quota:
        return quota, warnings
    edu_hist = user.get("education_history")
    quota = determine_zone_from_education(edu_hist)
    if quota:
        return quota, warnings
    return DEFAULT_QUOTA, ["⚠️ سهمیه مشخص نیست، منطقه ۲ فرض شد"]

def get_pole_of_province(province: str) -> Optional[str]:
    for pole, provinces in POLES.items():
        if province in provinces:
            return pole
    return None

def get_zone_of_province(province: str) -> Optional[str]:
    for zone, provinces in ZONES_MAP.items():
        if province in provinces:
            return zone
    return None

def gender_compatibility_check(user_gender: str, program_gender_policy: str) -> bool:
    if not program_gender_policy or program_gender_policy == "مختلط":
        return True
    return user_gender == program_gender_policy

def validate_user_input(user: Dict) -> List[str]:
    warnings = []
    rank = user.get("rank", 99999)
    if rank is not None and rank < 0:
        warnings.append("⚠️ رتبه منفی - مقدار پیش‌فرض استفاده شد")
        user["rank"] = 99999
    final_gpa = user.get("final_gpa", 0)
    if final_gpa is not None and (final_gpa < 0 or final_gpa > 20):
        warnings.append("⚠️ معدل خارج از بازه ۰-۲۰")
    gpa = user.get("gpa", 0)
    if gpa is not None and (gpa < 0 or gpa > 20):
        warnings.append("⚠️ معدل کل خارج از بازه ۰-۲۰")
    traz = user.get("traz", 0)
    if traz is not None and traz < 0:
        warnings.append("⚠️ تراز منفی")
    age = user.get("age")
    if age is not None and (age < 10 or age > 80):
        warnings.append("⚠️ سن نامعتبر")
    return warnings

def check_basic_eligibility(user: Dict, program: Dict) -> Tuple[bool, List[str]]:
    warnings = []
    is_eligible = True
    user_gender = user.get("gender", "")
    uni = program.get("university", {})
    gender_policy = uni.get("gender_policy", "مختلط")
    if not gender_compatibility_check(user_gender, gender_policy):
        return False, [f"این رشته فقط برای {gender_policy} است"]
    spec_req = program.get("special_requirements", {})
    min_gpa = spec_req.get("min_gpa_required", 0)
    if min_gpa > 0:
        user_gpa = user.get("final_gpa", 0)
        if user_gpa < min_gpa:
            warnings.append(f"معدل شما ({user_gpa}) کمتر از حد نصاب ({min_gpa}) است")
            is_eligible = False
    admission_info = program.get("admission_info", {})
    special_cond = admission_info.get("special_conditions", {})
    max_age = special_cond.get("max_age")
    user_age = user.get("age")
    if max_age and user_age and user_age > max_age:
        warnings.append(f"⚠️ سن شما ({user_age} سال) بیشتر از حد مجاز ({max_age} سال) است")
    if special_cond.get("has_interview"):
        warnings.append("⚠️ این رشته نیاز به مصاحبه دارد")
    if special_cond.get("has_practical_exam"):
        warnings.append("⚠️ این رشته نیاز به آزمون عملی دارد")
    if spec_req.get("has_service_commitment"):
        years = spec_req.get("service_years", 4)
        warnings.append(f"⚠️ تعهد خدمت {years * 2} سال در مناطق محروم")
    return is_eligible, warnings

def validate_diploma_match(user_diploma_type: str, program: Dict) -> Tuple[bool, Optional[str]]:
    admission_info = program.get("admission_info", {})
    is_floating = admission_info.get("is_floating", False)
    if is_floating:
        return True, None
    diploma_req = admission_info.get("diploma_requirements", {})
    accepts_types = diploma_req.get("accepts_diploma_types", [])
    if accepts_types:
        if user_diploma_type in accepts_types:
            return True, None
        types_str = ", ".join(accepts_types)
        return False, f"❌ این رشته فقط از دیپلم‌های {types_str} می‌پذیرد (دیپلم شما: {user_diploma_type})"
    major_group = program.get("major_group", "")
    if major_group in MAJOR_GROUP_TO_DIPLOMAS:
        accepted = MAJOR_GROUP_TO_DIPLOMAS[major_group]
        if user_diploma_type in accepted:
            return True, None
        return False, f"❌ این رشته فقط از دیپلم‌های {', '.join(accepted)} می‌پذیرد"
    return True, None

# ====================== Effective Cutoff with Two-Pool Bomi ======================
def calculate_effective_cutoff(
    cutoffs: Dict[str, Any],
    user_quota: str,
    program: Dict[str, Any],
    user: Dict[str, Any]
) -> Tuple[float, List[str]]:
    warnings = []
    admission_info = program.get("admission_info", {})
    course_type = admission_info.get("course_type", "roozaneh")
    cutoff = 0
    
    # Determine if user is bomi (local)
    user_province = user.get("province", "")
    uni = program.get("university", {})
    university_province = uni.get("province", "")
    is_bomi = (user_province == university_province and user_province != "")
    
    if is_bomi:
        cutoff_dict = program.get("cutoffs_bomi", cutoffs)
        warnings.append("✓ شما بومی این استان هستید - در 80% ظرفیت رقابت می‌کنید")
    else:
        cutoff_dict = program.get("cutoffs_non_bomi", {})
        if not cutoff_dict:
            # Estimate non-bomi cutoffs from bomi cutoffs (factor 3)
            bomi_cutoffs = program.get("cutoffs_bomi", cutoffs)
            if bomi_cutoffs:
                cutoff_dict = {k: int(v * 3) for k, v in bomi_cutoffs.items()}
                warnings.append("⚠️ داده غیربومی موجود نبود - تخمین تقریبی (×3) استفاده شد")
            else:
                cutoff_dict = cutoffs
        warnings.append("⚠️ شما غیربومی هستید - فقط در 20% ظرفیت رقابت می‌کنید")
    
    # Apply isargaran rules
    if user_quota in ("isargaran_25", "shahid"):
        free_cutoff = cutoff_dict.get("zone_2") or cutoff_dict.get("zone_1", 0)
        if free_cutoff > 0:
            cutoff = free_cutoff / ISARGARAN_70_RULE
            warnings.append(f"✓ قانون ۷۰٪ ایثارگران اعمال شد (cutoff آزاد: {int(free_cutoff)} → شما: {int(cutoff)})")
        else:
            cutoff = cutoff_dict.get("isargaran_25", 0) or cutoff_dict.get("shahid", 0)
    elif user_quota == "isargaran_5":
        free_cutoff = cutoff_dict.get("zone_2") or cutoff_dict.get("zone_1", 0)
        if free_cutoff > 0:
            cutoff = free_cutoff / ISARGARAN_85_RULE
            warnings.append(f"✓ قانون ۸۵٪ ایثارگران اعمال شد (cutoff آزاد: {int(free_cutoff)} → شما: {int(cutoff)})")
        else:
            cutoff = cutoff_dict.get("isargaran_5", 0)
    else:
        cutoff = cutoff_dict.get(user_quota, 0)
    
    if cutoff == 0:
        return 0, [f"❌ این رشته سهمیه {user_quota} را نمی‌پذیرد"]
    
    # Course type multiplier (unchanged)
    multiplier = COURSE_TYPE_MULTIPLIER.get(course_type, 1.0)
    cutoff *= multiplier
    return cutoff, warnings

# ====================== Z-score Rank Transformation ======================
def apply_gpa_impact(user: Dict[str, Any], program: Dict[str, Any]) -> float:
    """
    Convert rank and GPA to effective rank using Z-score approximation.
    Uses population estimates for MVP; can be calibrated with real data later.
    """
    try:
        # Population estimates (national)
        POP_MEAN_RANK_SCORE = 5000   # mean of transformed rank score
        POP_STD_RANK_SCORE = 2000    # std of transformed rank score
        POP_MEAN_GPA = 15.5
        POP_STD_GPA = 2.5
        
        gpa_impact = program.get("gpa_impact", {})
        if not gpa_impact:
            weights = GPA_IMPACT_BY_YEAR.get(1405, {"konkur": 0.40, "gpa": 0.60})
        else:
            weights = {
                "konkur": gpa_impact.get("konkur_weight", 0.40),
                "gpa": gpa_impact.get("gpa_weight", 0.60)
            }
        
        user_rank = user.get("rank", 99999)
        user_gpa = user.get("final_gpa", 17.0)
        
        # Convert rank to a score (lower rank = higher score)
        # Score range approx 0-10000 (rank 1 → 10000, rank 200000 → 0)
        rank_score = max(0, 10000 - (user_rank / 10))
        
        # Z-scores
        z_rank = (rank_score - POP_MEAN_RANK_SCORE) / POP_STD_RANK_SCORE
        z_gpa = (user_gpa - POP_MEAN_GPA) / POP_STD_GPA
        
        # Weighted combination
        combined_z = (z_rank * weights["konkur"]) + (z_gpa * weights["gpa"])
        
        # Convert Z back to effective rank
        effective_score = 5000 + (combined_z * 2000)  # mean 5000, each Z=1 adds 2000
        effective_rank = max(1, 200000 - (effective_score * 20))
        effective_rank = max(1, min(200000, effective_rank))
        
        return effective_rank
    except Exception as e:
        logger.error(f"Error in apply_gpa_impact: {e}")
        return user.get("rank", 99999)

def calculate_weighted_historical_cutoffs(cutoffs_historical: Dict) -> Dict:
    cutoffs = {}
    quota_keys = ["zone_1", "zone_2", "zone_3", "isargaran_25", "isargaran_5", "shahid"]
    for key in quota_keys:
        weighted_sum = 0.0
        total_weight = 0.0
        for year, weight in HISTORICAL_WEIGHTS.items():
            if year in cutoffs_historical:
                year_data = cutoffs_historical[year]
                if key in year_data:
                    weighted_sum += year_data[key] * weight
                    total_weight += weight
        if total_weight > 0:
            cutoffs[key] = int(weighted_sum / total_weight)
    return cutoffs

# ====================== Konkur Probability ======================
def calculate_advanced_exam_probability(user: Dict, program: Dict) -> Tuple[float, List[str]]:
    try:
        all_warnings = []
        validation_warnings = validate_user_input(user)
        all_warnings.extend(validation_warnings)
        
        is_eligible, basic_warnings = check_basic_eligibility(user, program)
        all_warnings.extend(basic_warnings)
        if not is_eligible:
            return 0.0, all_warnings
        
        diploma_type = user.get("diploma_type", "ریاضی")
        is_valid, diploma_error = validate_diploma_match(diploma_type, program)
        if not is_valid:
            all_warnings.append(diploma_error)
            return 0.0, all_warnings
        
        user_quota, quota_warnings = resolve_user_quota(user)
        all_warnings.extend(quota_warnings)
        
        cutoffs_pred = program.get("cutoffs_predicted_1405", {})
        cutoffs_hist = program.get("cutoffs_historical", {})
        cutoffs_old = program.get("cutoffs_konkur", {})
        
        if cutoffs_pred:
            cutoffs = cutoffs_pred
        elif cutoffs_hist:
            cutoffs = calculate_weighted_historical_cutoffs(cutoffs_hist)
        else:
            cutoffs = cutoffs_old
        
        cutoff, cutoff_warnings = calculate_effective_cutoff(cutoffs, user_quota, program, user)
        all_warnings.extend(cutoff_warnings)
        if cutoff == 0:
            return 0.0, all_warnings
        
        effective_rank = apply_gpa_impact(user, program)
        rank_ratio = effective_rank / cutoff
        
        if rank_ratio <= RANK_RATIO_HIGH:
            probability = PROBABILITY_MAX
        elif rank_ratio <= RANK_RATIO_MEDIUM:
            probability = PROBABILITY_MAX - ((rank_ratio - RANK_RATIO_HIGH) * 260)
        elif rank_ratio <= RANK_RATIO_LOW:
            probability = 60.0 - ((rank_ratio - RANK_RATIO_MEDIUM) * 400)
        else:
            probability = 0.0
        
        admission_info = program.get("admission_info", {})
        special_cond = admission_info.get("special_conditions", {})
        if special_cond.get("has_interview"):
            probability *= 0.90
        if special_cond.get("has_practical_exam"):
            probability *= 0.85
        
        probability = max(0.0, min(PROBABILITY_MAX, probability))
        return round(probability, 1), all_warnings
    except Exception as e:
        logger.exception("Error in calculate_advanced_exam_probability")
        return 0.0, [f"خطا در محاسبه: {str(e)}"]

# ====================== Savabegh Probability (simplified for MVP) ======================
def calculate_savabegh_probability(user: Dict, program: Dict) -> Tuple[float, List[str]]:
    try:
        all_warnings = []
        validation_warnings = validate_user_input(user)
        all_warnings.extend(validation_warnings)
        
        is_eligible, basic_warnings = check_basic_eligibility(user, program)
        all_warnings.extend(basic_warnings)
        if not is_eligible:
            return 0.0, all_warnings
        
        diploma_type = user.get("diploma_type", "ریاضی")
        is_valid, diploma_error = validate_diploma_match(diploma_type, program)
        if not is_valid:
            all_warnings.append(diploma_error)
            return 0.0, all_warnings
        
        cutoffs = program.get("cutoffs_savabegh", {})
        min_gpa = cutoffs.get("minimum_gpa", 0)
        min_traz = cutoffs.get("minimum_traz", 0)
        user_gpa = user.get("gpa", 0)
        user_traz = user.get("traz", 0)
        score = 0.0
        
        if min_gpa > 0:
            gpa_ratio = user_gpa / min_gpa
            if gpa_ratio >= SCORE_EXCELLENT:
                score += 60
            elif gpa_ratio >= SCORE_GOOD:
                score += 45
            elif gpa_ratio >= SCORE_ACCEPTABLE:
                score += 25
            else:
                all_warnings.append(f"معدل شما ({user_gpa}) کمتر از حد نصاب ({min_gpa}) است")
        
        if min_traz > 0:
            traz_ratio = user_traz / min_traz
            if traz_ratio >= SCORE_EXCELLENT:
                score += 40
            elif traz_ratio >= SCORE_GOOD:
                score += 30
            elif traz_ratio >= SCORE_ACCEPTABLE:
                score += 15
        
        admission_info = program.get("admission_info", {})
        bomi_type = admission_info.get("bomi_type", "ostani")
        course_type = admission_info.get("course_type", "")
        user_province = user.get("province", "")
        uni = program.get("university", {})
        university_province = uni.get("province", "")
        
        if bomi_type == "ostani" and user_province != university_province:
            if course_type == "payam_noor":
                score *= 0.95
                all_warnings.append("⚠️ پیام نور اولویت کمی با بومی دارد")
            else:
                score *= 0.70
                all_warnings.append("⚠️ در سوابق، اولویت با بومی است")
        
        user_quota, quota_warnings = resolve_user_quota(user)
        all_warnings.extend(quota_warnings)
        
        quota_boost = SAVABEGH_QUOTA_BOOST.get(user_quota, 1.0)
        if quota_boost != 1.0:
            score *= quota_boost
            all_warnings.append(f"✓ سهمیه {user_quota} در سوابق تحصیلی اعمال شد")
        
        probability = min(PROBABILITY_MAX, max(0.0, score))
        return round(probability, 1), all_warnings
    except Exception as e:
        logger.exception("Error in calculate_savabegh_probability")
        return 0.0, [f"خطا در محاسبه: {str(e)}"]

# ====================== Probability Level ======================
def get_probability_level(probability: float) -> Dict[str, str]:
    if probability >= PROBABILITY_HIGH:
        return {
            "level": "بسیار بالا",
            "color": "green",
            "description": "قبولی تقریباً قطعی",
            "basis": "رتبه شما بسیار بهتر از آخرین رتبه قبولی است",
        }
    elif probability >= PROBABILITY_MEDIUM:
        return {
            "level": "بالا",
            "color": "yellow",
            "description": "احتمال قبولی زیاد",
            "basis": "رتبه شما بهتر از آخرین رتبه قبولی است",
        }
    elif probability >= PROBABILITY_LOW:
        return {
            "level": "متوسط",
            "color": "orange",
            "description": "شانس متوسط",
            "basis": "رتبه شما نزدیک به آخرین رتبه قبولی است",
        }
    else:
        return {
            "level": "پایین",
            "color": "red",
            "description": "فقط با تکمیل ظرفیت",
            "basis": "رتبه شما بدتر از آخرین رتبه قبولی است",
        }

def get_tuition_range(financial_cost: int) -> str:
    if financial_cost == 0:
        return "بدون شهریه"
    elif financial_cost <= 3_000_000:
        return "تا ۳ میلیون تومان در ترم"
    elif financial_cost <= 6_000_000:
        return "۳ تا ۶ میلیون تومان در ترم"
    elif financial_cost <= 10_000_000:
        return "۶ تا ۱۰ میلیون تومان در ترم"
    elif financial_cost <= 15_000_000:
        return "۱۰ تا ۱۵ میلیون تومان در ترم"
    elif financial_cost <= 20_000_000:
        return "۱۵ تا ۲۰ میلیون تومان در ترم"
    else:
        return "بیش از ۲۰ میلیون تومان در ترم"

# ====================== Eligible Universities ======================
def get_eligible_universities(
    programs_database: List[Dict],
    major_id: str,
    user: Dict
) -> Tuple[List[Dict], List[str]]:
    eligible = []
    all_rejection_reasons = []
    user_quota, quota_warnings = resolve_user_quota(user)
    user_gender = user.get("gender", "")
    
    for program in programs_database:
        if program.get("major_id") != major_id:
            continue
        uni = program.get("university", {})
        gender_policy = uni.get("gender_policy", "مختلط")
        if not gender_compatibility_check(user_gender, gender_policy):
            continue
        admission_info = program.get("admission_info", {})
        method = admission_info.get("method", "konkur")
        probability = 0.0
        warnings = []
        
        if method in METHOD_KONKUR:
            probability, warnings = calculate_advanced_exam_probability(user, program)
        elif method in METHOD_SAVABEGH:
            probability, warnings = calculate_savabegh_probability(user, program)
        
        if probability < ADMISSION_DISPLAY_THRESHOLD:
            for w in warnings:
                if w not in all_rejection_reasons:
                    all_rejection_reasons.append(w)
            continue
        
        level_info = get_probability_level(probability)
        financial = program.get("financial", {})
        tuition = financial.get("tuition_per_term", 0)
        
        eligible.append({
            "program_id": program.get("program_id"),
            "university_name": uni.get("name", ""),
            "province": uni.get("province", ""),
            "university_prestige_level": uni.get("prestige_level", 2),
            "course_type": admission_info.get("course_type", "roozaneh"),
            "admission_method": method,
            "probability": probability,
            "probability_label": level_info["level"],
            "probability_color": level_info["color"],
            "probability_description": level_info["description"],
            "probability_basis": level_info["basis"],
            "quota_used": user_quota,
            "bomi_type": admission_info.get("bomi_type", "keshvari"),
            "tuition_range": get_tuition_range(tuition),
            "warnings": warnings,
        })
    
    eligible.sort(key=lambda x: x["probability"], reverse=True)
    return eligible, all_rejection_reasons

# ====================== Single Major Admission ======================
def calculate_admission_for_major(
    programs_database: List[Dict],
    majors_database: Dict,
    major_id: str,
    user: Dict
) -> Dict:
    major_data = majors_database.get(major_id)
    if not major_data:
        return {"error": f"رشته {major_id} یافت نشد"}
    
    eligible, rejection_reasons = get_eligible_universities(programs_database, major_id, user)
    user_quota, _ = resolve_user_quota(user)
    
    status = "دانشگاه‌های در دسترس" if eligible else "دانشگاهی با شانس قابل توجه یافت نشد"
    
    free_count = 0
    paid_count = 0
    high_count = 0
    medium_count = 0
    for uni in eligible:
        if uni["tuition_range"] == "بدون شهریه":
            free_count += 1
        else:
            paid_count += 1
        prob = uni["probability"]
        if prob >= PROBABILITY_HIGH:
            high_count += 1
        elif PROBABILITY_LOW <= prob < PROBABILITY_HIGH:
            medium_count += 1
    
    return {
        "major_info": {
            "major_id": major_id,
            "major_name_fa": major_data.get("name_fa", ""),
        },
        "user_context": {
            "quota_used": user_quota,
            "province": user.get("province", ""),
            "rank": user.get("rank", 0),
            "final_gpa": user.get("final_gpa", 0),
            "diploma_type": user.get("diploma_type", ""),
            "age": user.get("age"),
        },
        "admission_possibilities": {
            "status": status,
            "basis": "بر اساس رتبه، سهمیه، بومی‌گزینی، جنسیت، معدل",
            "universities": eligible,
            "rejection_reasons": rejection_reasons,
        },
        "summary": {
            "total_universities_found": len(eligible),
            "free_education_count": free_count,
            "paid_education_count": paid_count,
            "high_probability_count": high_count,
            "medium_probability_count": medium_count,
        },
        "rules_applied": [
            "تأثیر قطعی ۶۰٪ معدل (۱۴۰۴+)",
            "قانون ۷۰٪ ایثارگران ۲۵٪",
            "قانون ۸۵٪ ایثارگران ۵٪",
            "بومی‌گزینی (کشوری/قطبی/ناحیه‌ای/استانی)",
            "تطابق دیپلم با رشته (کنکور و سوابق)",
            "تأثیر سهمیه در پذیرش سوابق تحصیلی",
            "میانگین وزن‌دار ۴ سال (۱۴۰۱-۱۴۰۴)",
        ],
    }

# ====================== All Majors Discovery ======================
def calculate_all_majors_admission(
    programs_database: List[Dict],
    majors_database: Dict,
    user: Dict,
    admission_type: str = "both"
) -> Dict:
    all_results = []
    for major_id in majors_database.keys():
        major_data = majors_database.get(major_id)
        if not major_data:
            continue
        filtered_programs = []
        for program in programs_database:
            if program.get("major_id") != major_id:
                continue
            method = program.get("admission_info", {}).get("method", "konkur")
            if admission_type == "exam" and method not in METHOD_KONKUR:
                continue
            if admission_type == "savabegh" and method not in METHOD_SAVABEGH:
                continue
            filtered_programs.append(program)
        if not filtered_programs:
            continue
        result = calculate_admission_for_major(filtered_programs, majors_database, major_id, user)
        if "error" in result:
            continue
        possibilities = result.get("admission_possibilities", {})
        universities = possibilities.get("universities", [])
        if not universities:
            continue
        top_universities = universities[:3]
        max_probability = max(u["probability"] for u in universities)
        top_list = [{
            "university_name": u["university_name"],
            "province": u["province"],
            "probability": u["probability"],
            "probability_label": u["probability_label"],
            "course_type": u["course_type"],
            "admission_method": u["admission_method"],
            "tuition_range": u["tuition_range"],
            "warnings": u["warnings"],
        } for u in top_universities]
        all_results.append({
            "major_id": major_id,
            "major_name_fa": major_data.get("name_fa", ""),
            "major_group": major_data.get("group", ""),
            "total_universities": len(universities),
            "max_probability": max_probability,
            "top_universities": top_list,
        })
    all_results.sort(key=lambda x: x["max_probability"], reverse=True)
    high_count = sum(1 for r in all_results if r["max_probability"] >= PROBABILITY_HIGH)
    medium_count = sum(1 for r in all_results if PROBABILITY_LOW <= r["max_probability"] < PROBABILITY_HIGH)
    user_quota, _ = resolve_user_quota(user)
    return {
        "user_context": {
            "quota_used": user_quota,
            "province": user.get("province", ""),
            "rank": user.get("rank", 0),
            "final_gpa": user.get("final_gpa", 0),
            "diploma_type": user.get("diploma_type", ""),
            "age": user.get("age"),
            "admission_type": admission_type,
        },
        "total_matches": len(all_results),
        "high_probability_majors": high_count,
        "medium_probability_majors": medium_count,
        "recommendations": all_results,
        "basis": "بر اساس رتبه، سهمیه، بومی‌گزینی، جنسیت، معدل، تطابق دیپلم",
        "rules_applied": [
            "تأثیر قطعی ۶۰٪ معدل (۱۴۰۴+)",
            "قانون ۷۰٪ ایثارگران ۲۵٪",
            "قانون ۸۵٪ ایثارگران ۵٪",
            "بومی‌گزینی (کشوری/قطبی/ناحیه‌ای/استانی)",
            "تطابق دیپلم با رشته (کنکور و سوابق)",
            "تأثیر سهمیه در پذیرش سوابق تحصیلی",
            "میانگین وزن‌دار ۴ سال (۱۴۰۱-۱۴۰۴)",
        ],
    }
