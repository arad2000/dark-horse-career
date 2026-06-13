"""
اسکریپت زیر-الگوهای مهندسی - نسخه نهایی و کامل
================================================
پوشش همه ۴۰ رشته مهندسی با الگوهای معنادار + نویز مناسب
"""

import json
import random
import shutil
from datetime import datetime
from pathlib import Path

random.seed(42)

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
BACKUP_DIR = BASE_DIR / "backup_subrealm" / datetime.now().strftime("%Y%m%d_%H%M%S")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# =========================================================================
# زیر-الگوها: کلیدواژه → [A, B, C, D, E]
# =========================================================================
SUB_PATTERNS = {
    # کامپیوتر و IT
    "فناوری اطلاعات و علوم داده": [0.25, 0.92, 0.30, 0.88, 0.80],
    "فناوری اطلاعات": [0.25, 0.90, 0.35, 0.88, 0.78],
    "علوم داده": [0.20, 0.95, 0.28, 0.85, 0.75],
    "علوم کامپیوتر": [0.22, 0.93, 0.32, 0.82, 0.80],
    "کامپیوتر": [0.25, 0.90, 0.35, 0.85, 0.78],
    
    # برق و الکترونیک
    "برق": [0.25, 0.80, 0.75, 0.88, 0.65],
    
    # مکانیک و هوافضا
    "هوافضا": [0.20, 0.70, 0.90, 0.82, 0.72],
    "کشتی‌سازی": [0.22, 0.55, 0.88, 0.78, 0.60],
    "مکانیک": [0.20, 0.60, 0.90, 0.80, 0.65],
    "دریا": [0.22, 0.55, 0.88, 0.75, 0.60],
    "کشتی": [0.22, 0.55, 0.88, 0.75, 0.60],
    
    # عمران و معماری
    "آب و فاضلاب": [0.28, 0.50, 0.85, 0.78, 0.55],
    "شهرسازی": [0.55, 0.50, 0.65, 0.70, 0.75],
    "معماری": [0.40, 0.55, 0.75, 0.60, 0.85],
    "عمران": [0.28, 0.50, 0.88, 0.75, 0.60],
    
    # صنایع و مدیریت
    "لجستیک": [0.70, 0.60, 0.50, 0.85, 0.65],
    "صنایع": [0.72, 0.62, 0.48, 0.82, 0.68],
    
    # شیمی و مواد
    "پلیمر": [0.22, 0.62, 0.85, 0.78, 0.60],
    "متالورژی": [0.22, 0.60, 0.85, 0.78, 0.60],
    "سرامیک": [0.22, 0.60, 0.85, 0.75, 0.62],
    "نفت": [0.20, 0.65, 0.85, 0.80, 0.58],
    "گاز": [0.20, 0.62, 0.82, 0.78, 0.55],
    "شیمی": [0.25, 0.68, 0.82, 0.78, 0.62],
    "مواد": [0.22, 0.62, 0.85, 0.78, 0.62],
    
    # معدن
    "اکتشاف معدن": [0.25, 0.72, 0.88, 0.60, 0.55],
    "معدن": [0.25, 0.68, 0.88, 0.62, 0.52],
    
    # نساجی و پوشاک
    "طراحی پوشاک": [0.35, 0.50, 0.70, 0.55, 0.88],
    "نساجی": [0.30, 0.55, 0.78, 0.65, 0.75],
    
    # کشاورزی و منابع طبیعی
    "ماشین‌های کشاورزی": [0.25, 0.50, 0.88, 0.72, 0.55],
    "ماشین‌های صنایع غذایی": [0.25, 0.52, 0.88, 0.75, 0.58],
    "مرتع و آبخیزداری": [0.40, 0.48, 0.68, 0.62, 0.55],
    "منابع طبیعی": [0.42, 0.50, 0.68, 0.60, 0.58],
    "علوم دامی": [0.38, 0.52, 0.72, 0.65, 0.52],
    "شیلات": [0.35, 0.52, 0.72, 0.62, 0.55],
    "باغبانی": [0.40, 0.50, 0.70, 0.60, 0.62],
    "کشاورزی": [0.38, 0.52, 0.75, 0.65, 0.58],
    
    # محیط زیست و بهداشت
    "بیوسیستم": [0.42, 0.62, 0.72, 0.68, 0.60],
    "محیط زیست": [0.55, 0.55, 0.65, 0.70, 0.68],
    "بهداشت محیط": [0.52, 0.55, 0.72, 0.75, 0.55],
    
    # ایمنی و بازرسی
    "ایمنی و بازرسی": [0.40, 0.55, 0.82, 0.85, 0.48],
    
    # نقشه‌برداری و ژئوماتیک
    "ژئوماتیک": [0.22, 0.78, 0.82, 0.78, 0.55],
    "نقشه‌برداری": [0.22, 0.78, 0.85, 0.78, 0.55],
    
    # راه‌آهن
    "راه‌آهن": [0.25, 0.55, 0.85, 0.82, 0.55],
    
    # پیش‌فرض
    "پیش‌فرض": [0.30, 0.60, 0.75, 0.70, 0.60],
}


def find_sub_pattern(name: str):
    """یافتن الگوی مناسب بر اساس نام رشته"""
    if not name:
        return SUB_PATTERNS["پیش‌فرض"], "پیش‌فرض"
    
    name_clean = name.strip()
    for keyword, pattern in SUB_PATTERNS.items():
        if keyword != "پیش‌فرض" and keyword in name_clean:
            return pattern, keyword
    return SUB_PATTERNS["پیش‌فرض"], "پیش‌فرض"


def add_noise(row, noise_range=0.16):
    """اضافه کردن نویز مناسب"""
    return [
        max(0.05, min(0.98, round(x + random.uniform(-noise_range, noise_range), 3)))
        for x in row
    ]


def enhance_major(major: dict):
    """اعمال الگو به یک رشته"""
    name = major.get("name", "") or major.get("major_name_fa", "") or major.get("name_fa", "")
    base_pattern, keyword = find_sub_pattern(name)
    
    new_matrix = []
    for i in range(20):
        # چرخش ملایم + نویز
        shift = i % 5
        rotated = base_pattern[shift:] + base_pattern[:shift]
        noisy = add_noise(rotated[:5])
        new_matrix.append(noisy)
    
    major["strategy_weights"] = new_matrix
    return keyword


def process_file(filepath: Path):
    print(f"\n🔧 پردازش: {filepath.name}")
    
    # بک‌آپ
    backup_path = BACKUP_DIR / filepath.name
    shutil.copy2(filepath, backup_path)
    print(f"   📦 بک‌آپ: {backup_path.name}")
    
    with open(filepath, "r", encoding="utf-8") as f:
        majors = json.load(f)
    
    stats = {}
    updated = 0
    
    for major in majors:
        if "strategy_weights" in major:
            keyword = enhance_major(major)
            stats[keyword] = stats.get(keyword, 0) + 1
            updated += 1
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(majors, f, ensure_ascii=False, indent=2)
    
    print(f"   ✅ {updated} رشته به‌روزرسانی شد")
    print(f"   📊 توزیع الگوها:")
    for kw, count in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"      {kw}: {count} رشته")
    
    return stats


if __name__ == "__main__":
    target = DATA_DIR / "engineering_majors.json"
    if not target.exists():
        print(f"❌ فایل یافت نشد: {target}")
        exit(1)
    
    stats = process_file(target)
    
    default_count = stats.get("پیش‌فرض", 0)
    if default_count > 0:
        print(f"\n⚠️  {default_count} رشته الگوی پیش‌فرض گرفتند")
    else:
        print(f"\n🎉 عالی! همه رشته‌ها الگوی اختصاصی گرفتند!")
    
    print(f"\n📦 بک‌آپ در: {BACKUP_DIR}")
    print(f"\n💡 حالا اسکریپت check_data_quality.py را اجرا کنید")
