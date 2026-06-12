"""
Dark Horse Engine v9.1 - موتور کشف فردیت
==========================================
اصلاحات فاز ۱ (فوری):
  1. ✅ Cache کردن code_to_realm در startup (حل گلوگاه سرعت)
  2. ✅ POLE_MAPPING مرکزی (DRY)
  3. ✅ Uniqueness Bonus اصلاح‌شده (پشتیبانی از کدهای بدون "-")
  4. ✅ مقدار پیش‌فرض Strategy از 0.5 به 0.0 (واقع‌گرایانه‌تر)

سازگار با:
  - main.py v8.3.5 (ساختار خروجی)
  - ۱۵۰ رشته در ۶ قلمرو
  - ۹۶۰ میکروموتیو کدگذاری‌شده

نسخه: 9.1
"""

import logging
import math
from typing import Dict, List, Optional, Set, Tuple

logger = logging.getLogger("darkhorse_engine")


# =========================================================================
# ثابت‌های سیستم
# =========================================================================

# Trait های Dark Horse (غیرخطی، خلاق)
MISFIT_TRAITS: Set[str] = {
    "ماجراجو", "شهودی", "خلاق", "چابک", "بداهه‌پرداز",
    "شیرجه‌ای", "اکتشافی", "فرهنگ‌خوان", "مستقل", "ناظر",
    "خودمختار", "فراتر از حد", "ایده‌پرداز", "واکنش‌سریع",
    "شخصی‌ساز", "اصلاح‌گر", "سناریوساز", "انعطاف‌پذیر",
    "تدریجی", "حسی-بدنی", "بازنویس", "تمثیلی",
    "خودمختاری", "ابهام‌پذیری", "ریسک‌پذیری", "کنجکاوی",
    "خلاقیت", "استقلال", "فرصت‌طلبی", "یادگیری‌محور",
    "فشارپذیری", "انعطاف‌پذیری",
}

# Trait های White Horse (خطی، ساختاریافته)
LINEAR_TRAITS: Set[str] = {
    "ساختاریافته", "قانون‌مدار", "صبور", "ایمنی‌محور",
    "تطبیق‌پذیر", "وابسته به ساختار", "منطقی", "آکادمیک",
    "مستندات‌محور", "الگوبردار", "نظام‌گرا", "پشتکار",
    "تحلیلی", "مشاهده‌گر", "ریشه‌یاب", "قانون‌یاب",
    "ساختارگرایی", "سلسله‌مراتبی", "قانون‌مداری",
    "کمال‌گرایی", "اجتناب از تعارض", "اولویت درآمد", "تحمل فشار",
}
# پیشوندهای کلیشه‌ای میکروموتیوها
COMMON_MOTIVE_PREFIXES: Set[str] = {
    "HELP", "TEACH", "LEARN", "ORGANIZE", "PLAN", "SERVE"
}

# آستانه‌های CMS
CMS_STRONG: float = 0.65
CMS_MEDIUM: float = 0.50
CMS_BALANCED: float = 0.35

# آستانه‌های امتیاز
FIT_HIGH_THRESHOLD: float = 80.0
FIT_MEDIUM_THRESHOLD: float = 60.0
FIT_LOW_THRESHOLD: float = 40.0
FIT_MINIMUM_SHOW: float = 30.0

# پارامترهای الگوریتم
EXP_SCALING_FACTOR: float = 2.5
MAX_PENALTY: float = 0.30
MAX_PATHWAY_BONUS: float = 0.15
MAX_UNIQUENESS_BONUS: float = 0.15
F1_BETA: float = 1.5

# =========================================================================
# 🎯 اصلاح فاز ۱ - مورد ۲: POLE_MAPPING مرکزی (DRY)
# =========================================================================

POLE_MAPPING: Dict[str, Tuple[str, str]] = {
    "Q1": ("انسان‌محور", "سیستم‌محور"),
    "Q2": ("میراث مادی", "میراث فکری"),
    "Q3": ("تنوع‌طلب", "عمیق‌گرا"),
    "Q4": ("مسئولیت فردی", "مسئولیت سیستمی"),
    "Q5": ("نظم‌گرا", "خلاق‌گرا"),
    "Q6": ("تعامل‌گرا", "تمرکزگرا"),
    "Q7": ("مخترع", "مربی"),
    "Q8": ("ساختارگرا", "آزادی‌خواه"),
    "Q9": ("خدمت‌گرا", "خالق"),
    "Q10": ("رهبر", "وفاق‌ساز"),
}


# =========================================================================
# 🎯 اصلاح فاز ۱ - مورد ۱: Cache class برای code_to_realm
# =========================================================================

class RealmCache:
    """
    Cache برای نگاشت کد میکروموتیو به قلمرو
    
    این cache یک بار در startup ساخته می‌شود و در همه محاسبات استفاده می‌شود.    پیچیدگی: O(N × M) فقط یک بار (N رشته، M کد در هر رشته)
    به جای O(K × N × M) در هر درخواست (K تعداد انتخاب‌های کاربر)
    """
    
    def __init__(self, majors_database: Dict):
        self.code_to_realm: Dict[str, str] = {}
        self._build_cache(majors_database)
    
    def _build_cache(self, majors_database: Dict) -> None:
        """ساخت cache یک بار در startup"""
        for major_data in majors_database.values():
            realm = major_data.get("realm", "")
            if not realm:
                continue
            for code in major_data.get("micro_motive_codes", []):
                if code and code.strip():
                    code_clean = code.strip().lower()
                    # اگر کد تکراری بود، اولین قلمرو نگه داشته می‌شود
                    if code_clean not in self.code_to_realm:
                        self.code_to_realm[code_clean] = realm
        
        logger.info(f"✅ RealmCache built: {len(self.code_to_realm)} codes mapped")
    
    def get_realm(self, code: str) -> Optional[str]:
        """دریافت قلمرو یک کد با O(1)"""
        if not code:
            return None
        return self.code_to_realm.get(code.strip().lower())


# =========================================================================
# توابع کمکی
# =========================================================================

def extract_traits_from_strategies(
    strategy_answers: List[int],
    strategy_questions: List[Dict]
) -> Set[str]:
    """استخراج trait_hint از پاسخ‌های استراتژی"""
    traits: Set[str] = set()
    
    if not strategy_answers or not strategy_questions:
        return traits
    
    for i, ans_idx in enumerate(strategy_answers):
        if 0 <= i < len(strategy_questions):
            options = strategy_questions[i].get("options", [])
            if 0 <= ans_idx < len(options):
                opt = options[ans_idx]
                if isinstance(opt, dict):                
                    trait = opt.get("trait_hint", "")
                    if trait and trait.strip():
                        traits.add(trait.strip())
    
    return traits


def constructive_misfit_score(traits: Set[str]) -> float:
    """محاسبه CMS - سه‌گانه Misfit/Neutral/Linear"""
    if not traits:
        return 0.40
    
    total = len(traits)
    misfit_count = len(traits & MISFIT_TRAITS)
    linear_count = len(traits & LINEAR_TRAITS)
    neutral_count = max(0, total - misfit_count - linear_count)
    
    cms = (
        0.70 * (misfit_count / total) +
        0.50 * (neutral_count / total) +
        0.20 * (linear_count / total)
    )
    return max(0.15, min(0.95, cms))


def calculate_dynamic_weights(cms: float) -> Tuple[float, float, float]:
    """وزن‌های پویا بر اساس CMS"""
    if cms >= CMS_STRONG:
        return 0.60, 0.25, 0.15
    if cms >= CMS_MEDIUM:
        return 0.52, 0.30, 0.18
    if cms >= CMS_BALANCED:
        return 0.43, 0.32, 0.25
    return 0.35, 0.38, 0.27


def _classify_personality(cms: float) -> str:
    """طبقه‌بندی شخصیت"""
    if cms >= CMS_STRONG:
        return "Dark Horse قوی"
    if cms >= CMS_MEDIUM:
        return "Dark Horse متوسط"
    if cms >= CMS_BALANCED:
        return "شخصیت متعادل"
    return "White Horse"


# =========================================================================
# توابع محاسبه سه لایه
# =========================================================================
def micro_motives_match(
    user_motives: List[str],
    major_motives: List[str]
) -> Tuple[float, List[str]]:
    """
    محاسبه امتیاز میکروموتیو (هوشمند بر اساس تعداد انتخاب)
    """
    if not user_motives or not major_motives:
        return 0.0, []
    
    user_set = {m.strip().lower() for m in user_motives if m and m.strip()}
    major_set = {m.strip().lower() for m in major_motives if m and m.strip()}
    
    if not user_set or not major_set:
        return 0.0, []
    
    matched = user_set & major_set
    matched_count = len(matched)
    
    if matched_count == 0:
        return 0.0, []
    
    precision = matched_count / len(user_set)
    recall = matched_count / len(major_set)
    
    # F1 با β=1.5
    beta_sq = F1_BETA * F1_BETA
    denom = beta_sq * precision + recall
    f1 = ((1 + beta_sq) * precision * recall) / denom if denom > 1e-10 else 0.0
    
    coverage = matched_count / len(user_set)
    union_size = len(user_set | major_set)
    union_score = matched_count / union_size if union_size > 0 else 0.0
    
    # ترکیب هوشمند
    if len(user_set) <= 5:
        score = 0.5 * coverage + 0.3 * recall + 0.2 * union_score
    elif len(user_set) <= 20:
        score = 0.4 * f1 + 0.35 * recall + 0.25 * union_score
    else:
        score = 0.5 * f1 + 0.3 * recall + 0.2 * union_score
    
    matched_original = [
        m for m in user_motives 
        if m and m.strip().lower() in matched
    ]
    
    return min(1.0, score), matched_original

def sjt_environment_score(
    strategy_answers: List[int],
    strategy_weights: List[List[float]]
) -> float:
    """
    محاسبه امتیاز راهبردها
    
    🎯 اصلاح فاز ۱ - مورد ۴: مقدار پیش‌فرض 0.0 به جای 0.5
    دلیل: اگر کاربر پاسخ ندهد، نباید نمره ۵۰٪ بگیرد (کاذب است)
    """
    if not strategy_answers or not strategy_weights:
        return 0.0  # ← تغییر از 0.5 به 0.0
    
    min_len = min(len(strategy_answers), len(strategy_weights))
    
    total_score = 0.0
    valid_count = 0
    
    for i in range(min_len):
        chosen_idx = strategy_answers[i]
        weights_row = strategy_weights[i]
        if 0 <= chosen_idx < len(weights_row):
            total_score += weights_row[chosen_idx]
            valid_count += 1
    
    if valid_count == 0:
        return 0.0  # ← تغییر از 0.5 به 0.0
    
    return min(1.0, total_score / valid_count)


def calculate_value_score(
    value_choices: List[str],
    value_weights: Dict[str, float]
) -> float:
    """محاسبه امتیاز ارزش‌ها"""
    if not value_choices or not value_weights:
        return 0.0  # ← تغییر از 0.5 به 0.0
    
    total_score = 0.0
    valid_count = 0
    value_poles: Dict[str, str] = {}
    for choice in value_choices:
        if choice and choice.strip():
            choice_clean = choice.strip()
            if choice_clean in value_weights:
                total_score += value_weights[choice_clean]
                valid_count += 1
        if valid_count == 0:
          return 0.0
    
    return min(1.0, total_score / valid_count)


# =========================================================================
# Bonuses و Penalty
# =========================================================================

def _extract_motive_prefix(code: str) -> str:
    """
    🎯 اصلاح فاز ۱ - مورد ۳: استخراج هوشمند پیشوند کد
    
    پشتیبانی از چندین فرمت:
      - MED-001 → MED
      - CREATIVITY_ART → CREATIVITY
      - painting003 → paint (4 حرف اول)
    """
    if not code:
        return ""
    
    code_clean = code.strip()
    
    # حالت ۱: دارای "-"
    if "-" in code_clean:
        return code_clean.split("-")[0].upper()
    
    # حالت ۲: دارای "_"
    if "_" in code_clean:
        return code_clean.split("_")[0].upper()
    
    # حالت ۳: فقط حروف و اعداد → ۴ حرف اول
    return code_clean[:4].upper()


def calculate_uniqueness_bonus(user_motives: List[str]) -> float:
    """
    پاداش برای میکروموتیوهای غیرکلیشه‌ای
    
    🎯 اصلاح فاز ۱ - مورد ۳: پشتیبانی از همه فرمت‌های کد
    """
    if not user_motives:
        return 0.0
    
    unique_set = {m.strip() for m in user_motives if m and m.strip()}
    if not unique_set:
        return 0.0
    
    non_common: Set[str] = set()    
    for code in unique_set:
        prefix = _extract_motive_prefix(code)
        if prefix and prefix not in COMMON_MOTIVE_PREFIXES:
            non_common.add(code)
    
    # پاداش: هر میکروموتیو خاص 0.05 (تا سقف 0.15)، سپس × 0.1
    bonus = min(0.15, len(non_common) * 0.05) * 0.1
    return bonus


def calculate_pathway_bonus(
    major_data: Dict,
    user_motives: List[str],
    realm_cache: RealmCache,
    cms_value: float
) -> float:
    """
    پاداش برای مسیرهای غیرخطی
    
    🎯 اصلاح فاز ۱ - مورد ۱: استفاده از RealmCache (O(1) به جای O(N×M))
    """
    if not user_motives or not realm_cache:
        return 0.0
    
    current_realm = major_data.get("realm", "")
    if not current_realm:
        return 0.0
    
    # استفاده از cache: O(K) به جای O(K × N × M)
    touched_realms: Set[str] = set()
    for code in user_motives:
        realm = realm_cache.get_realm(code)
        if realm:
            touched_realms.add(realm)
    
    if len(touched_realms) < 2:
        return 0.0
    
    non_current = [r for r in touched_realms if r != current_realm]
    
    if len(non_current) >= 2:
        base = 0.06 + 0.03 * len(non_current)
        cms_delta = max(0.0, min(0.5, (cms_value - 0.5) * 1.0))
        cms_factor = 1.0 + cms_delta
        raw_bonus = base * cms_factor
        return min(MAX_PATHWAY_BONUS, raw_bonus)
    
    return 0.0

def calculate_penalties(
    reality_check: Optional[Dict],
    major_data: Dict
) -> float:
    """محاسبه جریمه بر اساس واقعیت‌های کاربر"""
    if not reality_check:
        return 0.0
    
    penalty = 0.0
    realm = major_data.get("realm", "")
    
    # جریمه فشار
    pressure_tolerance = float(reality_check.get("pressure_tolerance", 3))
    if realm in {"healer", "builder"} and pressure_tolerance < 3.0:
        pressure_factor = (3.0 - pressure_tolerance) / 4.0
        penalty += min(0.12, 0.15 * pressure_factor)
    
    # جریمه پرستیژ
    prestige_sensitivity = float(reality_check.get("prestige_sensitivity", 3))
    if realm == "communicator" and prestige_sensitivity > 3.5:
        prestige_factor = (prestige_sensitivity - 3.0) / 4.0
        penalty += min(0.08, 0.08 * prestige_factor)
    
    # جریمه مالی
    financial_constraint = float(reality_check.get("financial_constraint", 3))
    if realm in {"explorer", "artist", "thinker"} and financial_constraint > 3.5:
        financial_factor = (financial_constraint - 3.0) / 4.0
        penalty += min(0.10, 0.10 * financial_factor)
    
    return min(MAX_PENALTY, penalty)


def get_fit_level(score: float) -> str:
    """تبدیل امتیاز به سطح کیفی"""
    if score >= FIT_HIGH_THRESHOLD:
        return "همخوانی بسیار بالا"
    if score >= FIT_MEDIUM_THRESHOLD:
        return "همخوانی بالا"
    if score >= FIT_LOW_THRESHOLD:
        return "همخوانی متوسط"
    return "همخوانی پایین"


# =========================================================================
# کلاس اصلی موتور (با cache)
# =========================================================================

class DarkHorseEngine:
    """
    موتور اصلی با cache داخلی    
    استفاده:
        engine = DarkHorseEngine(majors_database)
        result = engine.discover_individuality(
            user_motives=[...],
            strategy_answers=[...],
            value_choices=[...],
        )
    """
    
    def __init__(
        self,
        majors_database: Dict,
        strategy_questions: Optional[List[Dict]] = None,
    ):
        self.majors_database = majors_database
        self.strategy_questions = strategy_questions or []
        
        # ساخت cache در startup (فقط یک بار)
        self.realm_cache = RealmCache(majors_database)
        
        logger.info("✅ DarkHorseEngine v9.1 initialized")
        logger.info(f"   📚 {len(majors_database)} majors")
        logger.info(f"   🗺️  {len(self.realm_cache.code_to_realm)} codes cached")
    
    def discover_individuality(
        self,
        user_motives: List[str],
        strategy_answers: List[int],
        value_choices: List[str],
        reality_check: Optional[Dict] = None,
    ) -> Dict:
        """
        کشف فردیت با استفاده از cache داخلی
        """
        # گام ۱: CMS و وزن‌ها
        user_traits = extract_traits_from_strategies(
            strategy_answers, self.strategy_questions
        )
        cms = constructive_misfit_score(user_traits)
        w1, w2, w3 = calculate_dynamic_weights(cms)
        
        logger.info(f"🎯 CMS: {cms:.3f} ({_classify_personality(cms)})")
        logger.info(f"⚖️  Weights: M={w1:.2f}, S={w2:.2f}, V={w3:.2f}")
        
        # گام ۲: محاسبه برای همه رشته‌ها
        all_fits: List[Dict] = []
        failed_majors: List[Tuple[str, str]] = []  # ← اصلاح فاز ۱: ذخیره (id, error)
        
        for major_id, major_data in self.majors_database.items():            
            try:
                fit = self._calculate_major_fit(
                    major_id, major_data,
                    user_motives, strategy_answers, value_choices,
                    cms, w1, w2, w3, reality_check
                )
                all_fits.append(fit)
            except Exception as e:
                logger.error(f"Error calculating fit for {major_id}: {e}")
                failed_majors.append((major_id, str(e)))
        
        # گام ۳: فیلتر و مرتب‌سازی
        filtered = [
            f for f in all_fits
            if f["individuality_fit"]["score"] >= FIT_MINIMUM_SHOW
        ]
        filtered.sort(key=lambda x: x["individuality_fit"]["score"], reverse=True)
        
        # گام ۴: discovered_majors
        discovered_majors = []
        for order, fit in enumerate(filtered, start=1):
            discovered_majors.append({
                "order": order,
                "major_id": fit["major_id"],
                "major_name_fa": fit["major_name_fa"],
                "realm_fa": fit.get("realm_fa", ""),
                "individuality_fit": fit["individuality_fit"],
                "is_nonlinear": fit.get("is_nonlinear", False),
            })
        
        # گام ۵: مسیرهای غیرخطی
        nonlinear_pathways = []
        top_5_ids = {m["major_id"] for m in discovered_majors[:5]}
        for fit in filtered:
            if fit.get("is_nonlinear") and fit["major_id"] not in top_5_ids:
                nonlinear_pathways.append({
                    "major_id": fit["major_id"],
                    "major_name_fa": fit["major_name_fa"],
                    "realm_fa": fit.get("realm_fa", ""),
                    "score": fit["individuality_fit"]["score"],
                })
            if len(nonlinear_pathways) >= 5:
                break
        
        # گام ۶: آمار
        high = sum(1 for f in filtered if f["individuality_fit"]["score"] >= FIT_HIGH_THRESHOLD)
        medium = sum(1 for f in filtered if FIT_MEDIUM_THRESHOLD <= f["individuality_fit"]["score"] < FIT_HIGH_THRESHOLD)
        low = sum(1 for f in filtered if f["individuality_fit"]["score"] < FIT_MEDIUM_THRESHOLD)
        
        # گام ۷: اثر انگشت (با استفاده از POLE_MAPPING مرکزی)        value_poles: Dict[str, str] = {}
        for choice in value_choices:
            q_num = choice[:-1] if len(choice) >= 2 else ""
            pole_idx = 0 if choice.endswith("A") else 1
            if q_num in POLE_MAPPING:
               value_poles[q_num] = POLE_MAPPING[q_num][pole_idx]
        
        realms_touched: List[str] = []
        realm_fa_set: Set[str] = set()
        for code in user_motives:
            realm = self.realm_cache.get_realm(code)
            if realm:
                # پیدا کردن نام فارسی قلمرو
                for m in self.majors_database.values():
                    if m.get("realm") == realm:
                        realm_fa = m.get("realm_fa", "")
                        if realm_fa:
                            realm_fa_set.add(realm_fa)
                        break
        realms_touched = list(realm_fa_set)
        
        uniqueness_bonus = calculate_uniqueness_bonus(user_motives)
        
        fingerprint = {
            "cms": round(cms, 3),
            "personality_type": _classify_personality(cms),
            "dominant_traits": list(user_traits)[:5],
            "value_poles": value_poles,
            "realms_touched": realms_touched,
            "uniqueness_bonus": round(uniqueness_bonus, 4),
        }
        
        return {
            "discovered_majors": discovered_majors,
            "nonlinear_pathways": nonlinear_pathways,
            "fingerprint": fingerprint,
            "summary": {
                "total_majors_analyzed": len(self.majors_database),
                "total_matches": len(filtered),
                "high_compatibility": high,
                "medium_compatibility": medium,
                "low_compatibility": low,
                "failed_calculations": len(failed_majors),
                "failed_major_ids": [f[0] for f in failed_majors],  # ← اصلاح فاز ۱
                "personality_type": _classify_personality(cms),
            },
            "method": {
                "principle": (
                    "کشف فردیت بر اساس ریزانگیزه‌های کدگذاری‌شده، "
                    "۲۰ سوال استراتژی، ۱۰ سوال ارزشی فلسفی "                    "و تعدیل واقعیت‌ها"
                ),
                "scoring": "وزن‌دهی پویا + Uniqueness Bonus + Pathway Bonus + Exponential Scaling",
                "policy_decision": "تصمیم نهایی با داوطلب است",
                "version": "9.1",
                "optimizations": [
                    "RealmCache (O(1) lookup)",
                    "Centralized POLE_MAPPING",
                    "Robust prefix extraction",
                ],
            },
            "next_step": "برای مشاهده شانس قبولی دانشگاه‌ها، اطلاعات سنجش خود را وارد کنید",
        }
    
    def _calculate_major_fit(
        self,
        major_id: str,
        major_data: Dict,
        user_motives: List[str],
        strategy_answers: List[int],
        value_choices: List[str],
        cms: float,
        w1: float, w2: float, w3: float,
        reality_check: Optional[Dict],
    ) -> Dict:
        """محاسبه تطابق یک رشته"""
        
        # لایه ۱
        major_motives = major_data.get("micro_motive_codes", [])
        motives_score, matched_motives = micro_motives_match(user_motives, major_motives)
        
        # لایه ۲
        strategy_weights = major_data.get("strategy_weights", [])
        sjt_score = sjt_environment_score(strategy_answers, strategy_weights)
        
        # لایه ۳
        value_weights = major_data.get("value_weights", {})
        value_score = calculate_value_score(value_choices, value_weights)
        
        # امتیاز پایه
        raw_score = w1 * motives_score + w2 * sjt_score + w3 * value_score
        
        # Bonuses
        bonus = calculate_pathway_bonus(
            major_data, user_motives, self.realm_cache, cms
        )
        uniqueness_bonus = calculate_uniqueness_bonus(user_motives)
        
        # Penalty
        penalty = calculate_penalties(reality_check, major_data)        
        # فرمول نهایی
        raw_final = (
            raw_score * (1.0 + bonus)
            + uniqueness_bonus
            - penalty
        )
        
        # Exponential Scaling
        scaled_final = 100.0 * (1.0 - math.exp(-raw_final * EXP_SCALING_FACTOR))
        final_score = max(0.0, min(100.0, scaled_final))
        
        # Evidence
        user_traits = extract_traits_from_strategies(
            strategy_answers, self.strategy_questions
        )
        env_profile = major_data.get("environment_profile", [])
        env_set = {t.strip() for t in env_profile if t and t.strip()}
        matched_traits = list(user_traits & env_set)
        
        # Matched values (با POLE_MAPPING مرکزی)
        matched_values: List[str] = []
        for choice in value_choices:
            if value_weights.get(choice, 0) >= 0.8:
                q_num = choice[:-1] if len(choice) >= 2 else ""
                pole_idx = 0 if choice.endswith("A") else 1
                if q_num in POLE_MAPPING:
                    matched_values.append(POLE_MAPPING[q_num][pole_idx])
        
        prestige = major_data.get("prestige_level", 3)
        
        return {
            "major_id": major_id,
            "major_name_fa": major_data.get("name", major_data.get("name_fa", "")),
            "major_group": major_data.get("group", ""),
            "realm": major_data.get("realm", ""),
            "realm_fa": major_data.get("realm_fa", ""),
            "individuality_fit": {
                "score": round(final_score, 1),
                "level": get_fit_level(final_score),
                "prestige_level": prestige,
                "raw_components": {
                    "m_score": round(motives_score * 100, 1),
                    "s_score": round(sjt_score * 100, 1),
                    "v_score": round(value_score * 100, 1),
                    "pathway_bonus": round(bonus * 100, 1),
                    "uniqueness_bonus": round(uniqueness_bonus * 100, 2),
                },
                "evidence": {
                    "micro_motives_matched": matched_motives,                    "traits_matched": matched_traits,
                    "values_matched": matched_values,
                },
            },
            "is_nonlinear": bonus > 0.03,
        }


# =========================================================================
# تابع wrapper برای سازگاری با main.py v8.3.5
# =========================================================================

def discover_individuality(
    majors_database: Dict,
    user_motives: List[str],
    sjt_answers: Dict[str, str],
    conjoint_choices: Dict[str, str],
    reality_check: Optional[Dict] = None,
    strategy_questions: Optional[List[Dict]] = None,
    value_questions: Optional[List[Dict]] = None,
) -> Dict:
    """
    تابع wrapper برای سازگاری با main.py v8.3.5
    
    تبدیل فرمت قدیمی به جدید و استفاده از DarkHorseEngine
    """
    # تبدیل sjt_answers به strategy_answers
    strategy_answers: List[int] = []
    if sjt_answers:
        for i in range(1, 21):
            key = f"sjt_{i}"
            if key in sjt_answers:
                answer = sjt_answers[key].strip().upper()
                idx = ord(answer) - ord('A') if len(answer) == 1 else 0
                strategy_answers.append(max(0, min(4, idx)))
            else:
                strategy_answers.append(0)
    else:
        strategy_answers = [0] * 20
    
    # تبدیل conjoint_choices به value_choices
    value_choices: List[str] = []
    if conjoint_choices:
        for i in range(1, 11):
            key = f"conj_{i}"
            if key in conjoint_choices:
                answer = conjoint_choices[key].strip().upper()
                value_choices.append(f"Q{i}{answer}")
            else:
                value_choices.append(f"Q{i}A")  
    else:
        value_choices = [f"Q{i}A" for i in range(1, 11)]
    
    # ایجاد موتور با cache
    engine = DarkHorseEngine(
        majors_database=majors_database,
        strategy_questions=strategy_questions or [],
    )
    
    return engine.discover_individuality(
        user_motives=user_motives,
        strategy_answers=strategy_answers,
        value_choices=value_choices,
        reality_check=reality_check,
    )
