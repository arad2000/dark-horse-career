"""
Dark Horse Engine v10.0 Final
فرمول ساده سند اجرایی: Total = 0.60×M + 0.20×S + 0.20×V
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger("darkhorse_engine")

_micro_motives_dict: Dict[str, str] = {}

def _load_micro_motives():
    global _micro_motives_dict
    if _micro_motives_dict:
        return
    try:
        base_path = Path(__file__).parent
        possible_paths = [
            base_path / "data" / "micro_motives.json",
            base_path / "micro_motives.json",
        ]
        for path in possible_paths:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    motives_list = json.load(f)
                    _micro_motives_dict = {
                        item["code"]: item.get("description_fa", "")
                        for item in motives_list if "code" in item
                    }
                logger.info(f"✅ {len(_micro_motives_dict)} میکروموتیو بارگذاری شد")
                return
    except Exception as e:
        logger.warning(f"خطا در بارگذاری micro_motives.json: {e}")

_load_micro_motives()


def _compute_m_score(user_motives: List[str], major_motives: List[str]) -> Tuple[float, List[Dict]]:
    if not user_motives or not major_motives:
        return 0.0, []
    
    user_set = {m.strip().lower() for m in user_motives if m and m.strip()}
    major_set = {m.strip().lower() for m in major_motives if m and m.strip()}
    
    matched = user_set & major_set
    matched_count = len(matched)
    
    if matched_count == 0:
        return 0.0, []
    
    score = matched_count / len(major_set)
    
    matched_details = [
        {"code": code, "description": _micro_motives_dict.get(code, "")}
        for code in user_motives
        if code.strip().lower() in matched
    ]
    
    return min(1.0, score), matched_details


def _compute_s_score(strategy_answers: List[int], strategy_weights: List[List[float]]) -> float:
    if not strategy_answers or not strategy_weights:
        return 0.0
    
    min_len = min(len(strategy_answers), len(strategy_weights))
    total = 0.0
    valid = 0
    
    for i in range(min_len):
        idx = strategy_answers[i]
        row = strategy_weights[i]
        if 0 <= idx < len(row):
            total += row[idx]
            valid += 1
    
    return min(1.0, total / 20.0) if valid > 0 else 0.0


def _compute_v_score(value_choices: List[str], value_weights: Dict[str, float]) -> float:
    if not value_choices or not value_weights:
        return 0.0
    
    total = sum(value_weights.get(v.strip(), 0) for v in value_choices if v and v.strip())
    return min(1.0, total / len(value_choices)) if value_choices else 0.0


def _get_fit_level(score: float) -> str:
    if score >= 80:
        return "همخوانی بسیار بالا"
    elif score >= 60:
        return "همخوانی بالا"
    elif score >= 40:
        return "همخوانی متوسط"
    else:
        return "همخوانی پایین"


def discover_individuality(
    majors_database: Dict,
    user_motives: List[str],
    sjt_answers: Dict[str, str],
    conjoint_choices: Dict[str, str],
    reality_check: Optional[Dict] = None,
) -> Dict:
    # تبدیل sjt_answers به strategy_answers
    strategy_answers = []
    for i in range(1, 21):
        key = f"sjt_{i}"
        answer = (sjt_answers or {}).get(key, "").strip().upper()
        idx = ord(answer) - ord('A') if len(answer) == 1 and answer.isalpha() else 0
        strategy_answers.append(max(0, min(4, idx)))
    
    # تبدیل conjoint_choices به value_choices
    value_choices = []
    for i in range(1, 11):
        key = f"conj_{i}"
        answer = (conjoint_choices or {}).get(key, "").strip().upper()
        value_choices.append(f"Q{i}{answer}")
    
    # محاسبه برای همه رشته‌ها
    discovered_majors = []
    failed = 0
    
    for major_id, major_data in (majors_database or {}).items():
        try:
            # لایه ۱
            m_score, matched_motives = _compute_m_score(
                user_motives or [],
                major_data.get("micro_motive_codes", [])
            )
            
            # لایه ۲
            s_score = _compute_s_score(
                strategy_answers,
                major_data.get("strategy_weights", [])
            )
            
            # لایه ۳
            v_score = _compute_v_score(
                value_choices,
                major_data.get("value_weights", {})
            )
            
            # فرمول نهایی
            total = 0.60 * m_score + 0.20 * s_score + 0.20 * v_score
            final_score = round(total * 100, 1)
            
            # فیلتر ۳۰٪
            if final_score < 30.0:
                continue
            
            discovered_majors.append({
                "major_id": major_id,
                "major_name_fa": major_data.get("name_fa", major_data.get("name", "")),
                "realm_fa": major_data.get("realm_fa", ""),
                "individuality_fit": {
                    "score": final_score,
                    "level": _get_fit_level(final_score),
                    "prestige_level": major_data.get("prestige_level", 2),
                    "raw_components": {
                        "m_score": round(m_score * 100, 1),
                        "s_score": round(s_score * 100, 1),
                        "v_score": round(v_score * 100, 1),
                    },
                    "evidence": {
                        "micro_motives_matched": matched_motives,
                    },
                },
            })
        except Exception as e:
            logger.error(f"خطا در رشته {major_id}: {e}")
            failed += 1
    
    # مرتب‌سازی نزولی
    discovered_majors.sort(key=lambda x: x["individuality_fit"]["score"], reverse=True)
    
    # آمار
    total_analyzed = len(majors_database or {})
    high = sum(1 for m in discovered_majors if m["individuality_fit"]["score"] >= 80)
    medium = sum(1 for m in discovered_majors if 60 <= m["individuality_fit"]["score"] < 80)
    low = sum(1 for m in discovered_majors if m["individuality_fit"]["score"] < 60)
    
    return {
        "discovered_majors": discovered_majors,
        "summary": {
            "total_majors_analyzed": total_analyzed,
            "total_matches": len(discovered_majors),
            "high_compatibility": high,
            "medium_compatibility": medium,
            "low_compatibility": low,
            "failed_calculations": failed,
        },
        "method": {
            "principle": "کشف فردیت بر اساس ریزانگیزه‌ها، ۲۰ سوال استراتژی، ۱۰ سوال ارزشی",
            "scoring": "Total = 0.60×M + 0.20×S + 0.20×V (سند اجرایی)",
            "filter": "نمایش رشته‌ها با Total ≥ 30%",
            "policy_decision": "تصمیم نهایی با داوطلب است",
            "version": "10.0 Final",
        },
        "next_step": "برای مشاهده شانس قبولی دانشگاه‌ها، اطلاعات سنجش خود را وارد کنید",
    }
