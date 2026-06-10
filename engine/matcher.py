"""
Dark Horse Engine v6.1 - The Ultimate Career Matcher
ترکیب هوشمند v5.3 (الگوریتم) + v6.0 (داده‌ها)
"""

import json
import math
import logging
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass, asdict
from collections import Counter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("darkhorse_v61")


# =========================================================================
# ثابت‌ها
# =========================================================================
MISFIT_TRAITS = {
    "ماجراجو", "شهودی", "خلاق", "چابک", "بداهه‌پرداز",
    "شیرجه‌ای", "اکتشافی", "فرهنگ‌خوان", "مستقل", "ناظر",
    "خودمختار", "فراتر از حد", "ایده‌پرداز", "واکنش‌سریع",
    "شخصی‌ساز", "اصلاح‌گر", "سناریوساز", "انعطاف‌پذیر",
    "تدریجی", "حسی-بدنی", "بازنویس", "تمثیلی"
}

LINEAR_TRAITS = {
    "ساختاریافته", "قانون‌مدار", "صبور", "ایمنی‌محور",
    "تطبیق‌پذیر", "وابسته به ساختار", "منطقی", "آکادمیک",
    "مستندات‌محور", "الگوبردار", "نظام‌گرا", "پشتکار"
}

CMS_STRONG = 0.65
CMS_MEDIUM = 0.50
CMS_BALANCED = 0.35
EXP_SCALING_FACTOR = 2.5
MAX_PATHWAY_BONUS = 0.15
MAX_PENALTY = 0.30
F1_BETA = 1.5

FIT_HIGH = 80.0
FIT_MEDIUM = 60.0
FIT_LOW = 40.0
FIT_MINIMUM = 30.0


# =========================================================================
# ساختارهای داده# =========================================================================
@dataclass
class MatchResult:
    major_id: int
    name: str
    group: str
    realm: str
    realm_fa: str
    total_score: float
    m_score: float
    s_score: float
    v_score: float
    pathway_bonus: float
    is_nonlinear: bool
    matched_motives: List[Dict]
    explanation: str
    fit_level: str


@dataclass
class UserFingerprint:
    cms: float
    personality_type: str
    strategic_profile: Dict[str, float]
    value_poles: Dict[str, str]
    dominant_traits: List[str]
    realms_touched: List[str]


# =========================================================================
# کلاس اصلی موتور
# =========================================================================
class DarkHorseMatcher:
    
    REALM_MAPPING = {
        "medical_majors.json":        {"realm": "healer",       "realm_fa": "درمانگر"},
        "engineering_majors.json":    {"realm": "builder",      "realm_fa": "سازنده"},
        "basic_sciences_majors.json": {"realm": "explorer",     "realm_fa": "کاشف"},
        "humanities_majors.json":     {"realm": "thinker",      "realm_fa": "اندیشمند"},
        "art_majors.json":            {"realm": "artist",       "realm_fa": "هنرمند"},
        "language_majors.json":       {"realm": "communicator", "realm_fa": "ارتباط‌گر"},
    }
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.majors_db: Dict[int, Dict] = {}
        self.micro_motives: Dict[str, str] = {}
        self.questions_data: List[Dict] = []
        
        self._load_all_majors()        
        self._load_micro_motives()
        self._load_questions()
        
        logger.info("✅ DarkHorseMatcher v6.1 initialized")
        logger.info(f"   📚 {len(self.majors_db)} majors loaded")
        logger.info(f"   💎 {len(self.micro_motives)} micro-motives loaded")
        logger.info(f"   ❓ {len(self.questions_data)} strategy questions loaded")
    
    # --- بارگذاری ---
    def _load_all_majors(self):
        for file_name, realm_info in self.REALM_MAPPING.items():
            file_path = self.data_dir / file_name
            if not file_path.exists():
                logger.warning(f"⚠️  {file_name} not found")
                continue
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    majors = json.load(f)
                for major in majors:
                    major["realm"] = realm_info["realm"]
                    major["realm_fa"] = realm_info["realm_fa"]
                    self.majors_db[major["id"]] = major
                logger.info(f"   ✓ {len(majors)} from {file_name}")
            except Exception as e:
                logger.error(f"❌ Error loading {file_name}: {e}")
    
    def _load_micro_motives(self):
        file_path = self.data_dir / "micro_motives.json"
        if not file_path.exists():
            logger.warning("⚠️  micro_motives.json not found")
            return
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                motives_list = json.load(f)
            self.micro_motives = {m["code"]: m["description_fa"] for m in motives_list}
        except Exception as e:
            logger.error(f"❌ Error loading micro_motives: {e}")
    
    def _load_questions(self):
        file_path = self.data_dir / "questions.json"
        if not file_path.exists():
            logger.warning("⚠️  questions.json not found")
            return
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.questions_data = data.get("layers", {}).get("strategies", {}).get("questions", [])
        except Exception as e:
            logger.error(f"❌ Error loading questions: {e}")
        # --- CMS و وزن‌های پویا ---
    def _extract_traits(self, strategy_answers: List[int]) -> Set[str]:
        traits = set()
        for i, ans_idx in enumerate(strategy_answers):
            if 0 <= i < len(self.questions_data):
                question = self.questions_data[i]
                options = question.get("options", [])
                if 0 <= ans_idx < len(options):
                    opt = options[ans_idx]
                    # سازگاری با هر دو ساختار (dict یا str)
                    if isinstance(opt, dict):
                        trait = opt.get("trait_hint", "")
                    else:
                        trait = ""
                    if trait:
                        traits.add(trait)
        return traits
    
    def _calculate_cms(self, traits: Set[str]) -> float:
        if not traits:
            return 0.40
        total = len(traits)
        misfit = len(traits & MISFIT_TRAITS)
        linear = len(traits & LINEAR_TRAITS)
        neutral = max(0, total - misfit - linear)
        
        cms = (
            0.70 * (misfit / total) +
            0.50 * (neutral / total) +
            0.20 * (linear / total)
        )
        return max(0.15, min(0.95, cms))
    
    def _calculate_dynamic_weights(self, cms: float) -> Tuple[float, float, float]:
        if cms >= CMS_STRONG:
            return 0.65, 0.25, 0.10
        elif cms >= CMS_MEDIUM:
            return 0.55, 0.30, 0.15
        elif cms >= CMS_BALANCED:
            return 0.45, 0.32, 0.23
        else:
            return 0.35, 0.38, 0.27
    
    def _classify_personality(self, cms: float) -> str:
        if cms >= CMS_STRONG:
            return "Dark Horse قوی"
        elif cms >= CMS_MEDIUM:
            return "Dark Horse متوسط"
        elif cms >= CMS_BALANCED:
            return "شخصیت متعادل"   
        else:
            return "White Horse"
    
    # --- امتیازهای سه لایه ---
    def _calculate_m_score(self, user_motives: List[str], major_motives: List[str]) -> Tuple[float, List[str]]:
        if not user_motives or not major_motives:
            return 0.0, []
        
        user_set = set(user_motives)
        major_set = set(major_motives)
        matched_codes = list(user_set & major_set)
        matched_count = len(matched_codes)
        
        if matched_count == 0:
            return 0.0, []
        
        precision = matched_count / len(user_set)
        recall = matched_count / len(major_set)
        
        if precision + recall < 1e-10:
            return 0.0, []
        
        beta_sq = F1_BETA * F1_BETA
        f1_score = ((1 + beta_sq) * precision * recall) / (beta_sq * precision + recall)
        
        return min(1.0, f1_score), matched_codes
    
    def _calculate_s_score(self, strategy_answers: List[int], strategy_weights: List[List[float]]) -> float:
        if not strategy_answers or not strategy_weights:
            return 0.5
        if len(strategy_answers) != len(strategy_weights):
            return 0.5
        
        total_score = 0.0
        valid_count = 0
        for i, chosen_idx in enumerate(strategy_answers):
            if 0 <= i < len(strategy_weights) and 0 <= chosen_idx < len(strategy_weights[i]):
                total_score += strategy_weights[i][chosen_idx]
                valid_count += 1
        
        if valid_count == 0:
            return 0.5
        return min(1.0, total_score / valid_count)
    
    def _calculate_v_score(self, value_choices: List[str], value_weights: Dict[str, float]) -> float:
        if not value_choices or not value_weights:
            return 0.5
        
        total_score = 0.0
        valid_count = 0        
        for choice in value_choices:
            if choice in value_weights:
                total_score += value_weights[choice]
                valid_count += 1
        
        if valid_count == 0:
            return 0.5
        return min(1.0, total_score / valid_count)
    
    # --- Pathway Bonus ---
    def _calculate_pathway_bonus(self, user_motives: List[str], current_major: Dict, cms: float) -> float:
        if not user_motives:
            return 0.0
        
        current_realm = current_major.get("realm", "")
        
        touched_realms = set()
        for code in user_motives:
            for mid, m in self.majors_db.items():
                if code in m.get("micro_motive_codes", []):
                    touched_realms.add(m["realm"])
                    break
        
        if len(touched_realms) < 2:
            return 0.0
        
        non_current = [r for r in touched_realms if r != current_realm]
        if len(non_current) >= 2 and current_realm:
            base_bonus = 0.06 + 0.03 * len(non_current)
            cms_factor = 1.0 + max(0, (cms - 0.5) * 2.0)
            raw_bonus = base_bonus * cms_factor
            return min(MAX_PATHWAY_BONUS, raw_bonus)
        
        return 0.0
    
    def _calculate_penalty(self, reality_check: Optional[Dict], major: Dict) -> float:
        if not reality_check:
            return 0.0
        
        penalty = 0.0
        pressure_tolerance = float(reality_check.get("pressure_tolerance", 3))
        if major.get("realm") in {"healer", "builder"} and pressure_tolerance < 3.0:
            penalty += min(0.10, 0.12 * (3.0 - pressure_tolerance) / 4.0)
        
        prestige_sensitivity = float(reality_check.get("prestige_sensitivity", 3))
        if major.get("realm") == "communicator" and prestige_sensitivity > 3.5:
            penalty += min(0.08, 0.08 * (prestige_sensitivity - 3) / 4.0)
        
        financial_constraint = float(reality_check.get("financial_constraint", 3))
        if major.get("realm") in {"explorer", "artist", "thinker"} and financial_constraint > 3.5:       
            penalty += min(0.10, 0.10 * (financial_constraint - 3) / 4.0)
        
        return min(MAX_PENALTY, penalty)
    
    # --- اثر انگشت ---
    def _generate_fingerprint(self, strategy_answers, value_choices, user_motives, cms) -> UserFingerprint:
        traits = self._extract_traits(strategy_answers)
        
        strategic_profile = {}
        dimension_counts = Counter()
        for i, ans_idx in enumerate(strategy_answers):
            if 0 <= i < len(self.questions_data):
                q = self.questions_data[i]
                dim = q.get("dimension", "unknown") if isinstance(q, dict) else "unknown"
                dimension_counts[dim] += 1
        total_answers = max(1, len(strategy_answers))
        for dim, count in dimension_counts.items():
            strategic_profile[dim] = round(count / total_answers, 2)
        
        value_poles = {}
        pole_mapping = {
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
        for choice in value_choices:
            q_num = choice[:-1]
            pole_idx = 0 if choice.endswith("A") else 1
            if q_num in pole_mapping:
                value_poles[q_num] = pole_mapping[q_num][pole_idx]
        
        realms_touched = []
        realm_set = set()
        for code in user_motives:
            for mid, m in self.majors_db.items():
                if code in m.get("micro_motive_codes", []):
                    realm_set.add(m["realm_fa"])
                    break
        realms_touched = list(realm_set)
        
        dominant_traits = list(traits)[:5]
        
        return UserFingerprint(            cms=round(cms, 3),
            personality_type=self._classify_personality(cms),
            strategic_profile=strategic_profile,
            value_poles=value_poles,
            dominant_traits=dominant_traits,
            realms_touched=realms_touched
        )
    
    def _generate_explanation(self, user_motives, strategy_answers, value_choices, major, matched_motives, m_score, s_score, v_score):
        parts = []
        if matched_motives:
            motive_texts = [self.micro_motives.get(c, c) for c in matched_motives[:2]]
            parts.append(f"شما به این فعالیت‌ها علاقه‌مندید: «{motive_texts[0]}»")
            if len(motive_texts) > 1:
                parts[-1] += f" و «{motive_texts[1]}»"
        
        traits = self._extract_traits(strategy_answers)
        if traits:
            sample_traits = list(traits)[:2]
            parts.append(f"سبک کاری شما: {', '.join(sample_traits)}")
        
        value_weights = major.get("value_weights", {})
        matched_values = [c for c in value_choices if value_weights.get(c, 0) >= 0.8]
        if matched_values:
            parts.append("ارزش‌های شما با این رشته هم‌خوان هستند")
        
        total = 0.6 * m_score + 0.2 * s_score + 0.2 * v_score
        parts.append(f"تطابق کلی: {total*100:.0f}%")
        
        return " | ".join(parts)
    
    # --- Scaling ---
    @staticmethod
    def _exponential_scale(raw_score: float) -> float:
        return 100.0 * (1.0 - math.exp(-raw_score * EXP_SCALING_FACTOR))
    
    @staticmethod
    def _get_fit_level(score: float) -> str:
        if score >= FIT_HIGH:
            return "همخوانی بسیار بالا"
        elif score >= FIT_MEDIUM:
            return "همخوانی بالا"
        elif score >= FIT_LOW:
            return "همخوانی متوسط"
        return "همخوانی پایین"
    
    # --- تابع اصلی ---
    def match(self, user_motives: List[str], strategy_answers: List[int],
              value_choices: List[str], reality_check: Optional[Dict] = None,
              top_n: int = 15) -> Dict:        
        traits = self._extract_traits(strategy_answers)
        cms = self._calculate_cms(traits)
        w1, w2, w3 = self._calculate_dynamic_weights(cms)
        
        logger.info(f"🎯 CMS: {cms:.3f} | {self._classify_personality(cms)}")
        logger.info(f"⚖️  Weights: M={w1:.2f}, S={w2:.2f}, V={w3:.2f}")
        
        fingerprint = self._generate_fingerprint(strategy_answers, value_choices, user_motives, cms)
        
        all_results = []
        for major_id, major in self.majors_db.items():
            try:
                m_score, matched_codes = self._calculate_m_score(
                    user_motives, major.get("micro_motive_codes", [])
                )
                s_score = self._calculate_s_score(
                    strategy_answers, major.get("strategy_weights", [])
                )
                v_score = self._calculate_v_score(
                    value_choices, major.get("value_weights", {})
                )
                
                raw_score = w1 * m_score + w2 * s_score + w3 * v_score
                pathway_bonus = self._calculate_pathway_bonus(user_motives, major, cms)
                penalty = self._calculate_penalty(reality_check, major)
                
                final_raw = raw_score * (1 + pathway_bonus) - penalty
                final_score = self._exponential_scale(final_raw)
                final_score = max(0.0, min(100.0, final_score))
                
                explanation = self._generate_explanation(
                    user_motives, strategy_answers, value_choices,
                    major, matched_codes, m_score, s_score, v_score
                )
                
                matched_motives_full = [
                    {"code": c, "description": self.micro_motives.get(c, "")}
                    for c in matched_codes
                ]
                
                all_results.append(MatchResult(
                    major_id=major_id,
                    name=major.get("name", ""),
                    group=major.get("group", ""),
                    realm=major.get("realm", ""),
                    realm_fa=major.get("realm_fa", ""),
                    total_score=round(final_score, 1),
                    m_score=round(m_score * 100, 1),
                    s_score=round(s_score * 100, 1),                    v_score=round(v_score * 100, 1),
                    pathway_bonus=round(pathway_bonus * 100, 1),
                    is_nonlinear=pathway_bonus > 0.03,
                    matched_motives=matched_motives_full,
                    explanation=explanation,
                    fit_level=self._get_fit_level(final_score)
                ))
            except Exception as e:
                logger.error(f"Error processing major {major_id}: {e}")
        
        filtered = [r for r in all_results if r.total_score >= FIT_MINIMUM]
        filtered.sort(key=lambda r: r.total_score, reverse=True)
        
        top_recommendations = filtered[:top_n]
        nonlinear_pathways = [
            r for r in filtered
            if r.is_nonlinear and r not in top_recommendations[:5]
        ][:5]
        
        recommendations = [asdict(r) for r in top_recommendations]
        pathways = [asdict(p) for p in nonlinear_pathways]
        
        high_count = sum(1 for r in filtered if r.total_score >= FIT_HIGH)
        medium_count = sum(1 for r in filtered if FIT_MEDIUM <= r.total_score < FIT_HIGH)
        
        return {
            "fingerprint": asdict(fingerprint),
            "recommendations": recommendations,
            "nonlinear_pathways": pathways,
            "summary": {
                "total_majors_analyzed": len(self.majors_db),
                "majors_above_threshold": len(filtered),
                "high_compatibility": high_count,
                "medium_compatibility": medium_count,
            },
            "method": {
                "version": "6.1",
                "cms": round(cms, 3),
                "personality_type": fingerprint.personality_type,
                "dynamic_weights": {"micro_motives": w1, "strategies": w2, "values": w3},
            }
        }


# =========================================================================
# تست
# =========================================================================
if __name__ == "__main__":
    print("=" * 70)
    print("🐎 Dark Horse Engine v6.1 - Test Run") 
    print("=" * 70)
    
    matcher = DarkHorseMatcher(data_dir="data")
    
    test_user = {
        "motives": ["MED-001", "MED-005", "CS-001", "CS-005", "PAINT-003"],
        "strategies": [1, 1, 1, 3, 4, 2, 3, 2, 3, 1, 1, 1, 1, 1, 4, 1, 3, 2, 2, 3],
        "values": ["Q1A", "Q2B", "Q3A", "Q4A", "Q5B", "Q6B", "Q7A", "Q8B", "Q9B", "Q10A"]
    }
    
    result = matcher.match(
        user_motives=test_user["motives"],
        strategy_answers=test_user["strategies"],
        value_choices=test_user["values"],
        top_n=10
    )
    
    print(f"\n✨ Fingerprint: {result['fingerprint']['personality_type']}")
    print(f"   CMS: {result['fingerprint']['cms']}")
    
    print("\n🎯 Top 10:")
    for i, rec in enumerate(result["recommendations"], 1):
        print(f"{i:2}. {rec['name']:<25} | {rec['realm_fa']:<8} | "
              f"Total: {rec['total_score']:5.1f}% | {rec['fit_level']}")
    
    print(f"\n🌟 Nonlinear pathways: {len(result['nonlinear_pathways'])}")
    for p in result["nonlinear_pathways"]:
        print(f"   • {p['name']} ({p['realm_fa']}) - {p['total_score']:.1f}%")
