"""
اسکریپت بررسی کیفیت داده‌های رشته‌ها - نسخه اصلاح‌شده
اجرا: python check_data_quality.py
"""

import json
import statistics
from pathlib import Path
from typing import Dict, List

DATA_DIR = Path(__file__).parent / "data"

FILES = {
    "medical_majors.json": "درمانگر",
    "engineering_majors.json": "سازنده",
    "basic_sciences_majors.json": "کاشف",
    "humanities_majors.json": "اندیشمند",
    "art_majors.json": "هنرمند",
    "language_majors.json": "ارتباط‌گر",
}

print("=" * 60)
print("🔍 بررسی کیفیت داده‌های ۱۵۰ رشته")
print("=" * 60)

all_majors: List[Dict] = []

for filename, realm in FILES.items():
    filepath = DATA_DIR / filename
    if not filepath.exists():
        print(f"❌ {filename} یافت نشد")
        continue
    
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            majors = json.load(f)
        
        for m in majors:
            m["realm_name"] = realm
        all_majors.extend(majors)
        print(f"✅ {filename}: {len(majors)} رشته ({realm})")
    except Exception as e:
        print(f"❌ خطا در خواندن {filename}: {e}")

print(f"\n📊 کل رشته‌ها: {len(all_majors)}")
print("\n" + "=" * 60)
print("🧪 بررسی strategy_weights (ماتریس ۲۰×۵)")
print("=" * 60)

all_strategies = []
majors_without_strategy = []

for m in all_majors:
    weights = m.get("strategy_weights", [])
    if not weights or len(weights) == 0:
        majors_without_strategy.append(m.get("name", m.get("major_id", "?")))
        continue
    all_strategies.append(weights)

print(f"✅ رشته‌های دارای strategy_weights: {len(all_strategies)}")
print(f"❌ رشته‌های بدون strategy_weights: {len(majors_without_strategy)}")

if all_strategies:
    all_variances = []
    for weights in all_strategies:
        for row in weights:
            if len(row) >= 2:
                try:
                    v = statistics.variance(row)
                    all_variances.append(v)
                except:
                    pass
    
    if all_variances:
        avg_var = sum(all_variances) / len(all_variances)
        max_var = max(all_variances)
        min_var = min(all_variances)
        print(f"\n📈 Variance در strategy_weights:")
        print(f"   میانگین: {avg_var:.4f}")
        print(f"   حداکثر: {max_var:.4f}")
        print(f"   حداقل:  {min_var:.4f}")
        
        if avg_var < 0.01:
            print("   ⚠️  WARNING: Variance خیلی پایین! داده‌ها متمایز نیستند")
        elif avg_var < 0.05:
            print("   ⚠️  WARNING: Variance پایین - تمایز کم")
        else:
            print("   ✅ Variance مناسب")

# نمونه‌گیری
print("\n🔬 نمونه strategy_weights از ۵ رشته مختلف:")
for m in all_majors[:5]:
    weights = m.get("strategy_weights", [])
    name = m.get("name", m.get("major_id", "?"))
    if weights and len(weights) > 0:
        print(f"\n   [{name}]")
        for i, row in enumerate(weights[:3]):
            print(f"   سوال {i+1}: {row}")

print("\n" + "=" * 60)
print("💎 بررسی value_weights (دیکشنری Q1A-Q10B)")
print("=" * 60)

all_values = []
majors_without_values = []
unique_value_signatures = set()

for m in all_majors:
    vw = m.get("value_weights", {})
    if not vw:
        majors_without_values.append(m.get("name", m.get("major_id", "?")))
        continue
    
    all_values.append(vw)
    sig = tuple(sorted(vw.items()))
    unique_value_signatures.add(sig)

print(f"✅ رشته‌های دارای value_weights: {len(all_values)}")
print(f"❌ رشته‌های بدون value_weights: {len(majors_without_values)}")
print(f"🆔 امضاهای منحصربه‌فرد value_weights: {len(unique_value_signatures)} از {len(all_values)}")

if len(unique_value_signatures) == 1:
    print("   ⚠️  WARNING: همه رشته‌ها value_weights یکسان دارند!")
elif len(unique_value_signatures) < len(all_values) * 0.5:
    print("   ⚠️  WARNING: تمایز کم در value_weights")
else:
    print("   ✅ تمایز خوب در value_weights")

print("\n🔬 نمونه value_weights از ۵ رشته:")
for m in all_majors[:5]:
    vw = m.get("value_weights", {})
    name = m.get("name", m.get("major_id", "?"))
    if vw:
        items = list(vw.items())[:5]
        print(f"   [{name}]: {dict(items)}")

print("\n" + "=" * 60)
print("🏷️  بررسی micro_motive_codes")
print("=" * 60)

total_motives = 0
all_codes = set()
for m in all_majors:
    codes = m.get("micro_motive_codes", [])
    total_motives += len(codes)
    all_codes.update(codes)

print(f"📊 کل میکروموتیوها (با تکرار): {total_motives}")
print(f"🆔 میکروموتیوهای منحصربه‌فرد: {len(all_codes)}")
print(f"📈 میانگین در هر رشته: {total_motives / len(all_majors):.1f} (اگر رشته وجود داشته باشد)")

print("\n" + "=" * 60)
print("📋 خلاصه نهایی")
print("=" * 60)
print(f"✅ کل رشته‌ها: {len(all_majors)}")
print(f"✅ میکروموتیوهای منحصربه‌فرد: {len(all_codes)}")
print(f"✅ تمایز value_weights: {len(unique_value_signatures)} از {len(all_values)}")
if all_strategies and 'avg_var' in locals():
    print(f"✅ Variance strategy: {avg_var:.4f}")
