"""
اسکریپت زیر-الگوهای مهندسی - نسخه ترکیبی (بهترین هر دو)
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

# ============================================================
# زیر-الگوها: کلیدواژه‌های من + اعداد Grok
# ============================================================
SUB_PATTERNS = {
    # === گروه کامپیوتر و IT ===
    "کامپیوتر":      [0.25, 0.90, 0.35, 0.85, 0.75],
    "فناوری اطلاعات":[0.20, 0.85, 0.40, 0.90, 0.80],
    "داده":          [0.20, 0.95, 0.30, 0.85, 0.70],
    
    # === گروه برق و الکترونیک ===
    "برق":           [0.25, 0.70, 0.65, 0.90, 0.75],
    
    # === گروه مکانیک و هوافضا ===
    "مکانیک":        [0.20, 0.50, 0.90, 0.75, 0.65],
    "هوافضا":        [0.25, 0.55, 0.90, 0.85, 0.70],
    "دریا":          [0.20, 0.50, 0.90, 0.75, 0.65],
    "کشتی":          [0.20, 0.50, 0.90, 0.75, 0.65],
    
    # === گروه عمران و معماری ===
    "عمران":         [0.30, 0.45, 0.85, 0.65, 0.75],
    "معماری":        [0.35, 0.60, 0.75, 0.55, 0.80],
    "آب":            [0.30, 0.45, 0.85, 0.65, 0.75],
    "فاضلاب":        [0.30, 0.45, 0.85, 0.65, 0.75],
    
    # === گروه مدیریت و صنایع ===
    "صنایع":         [0.75, 0.55, 0.50, 0.80, 0.70],
    "لجستیک":        [0.75, 0.55, 0.50, 0.80, 0.70],
    
    # === گروه شیمی و مواد ===
    "شیمی":          [0.25, 0.65, 0.80, 0.75, 0.60],
    "نفت":           [0.20, 0.60, 0.85, 0.80, 0.65],
    "گاز":           [0.20, 0.60, 0.85, 0.80, 0.65],
    "پلیمر":         [0.20, 0.60, 0.85, 0.80, 0.65],
    "مواد":          [0.20, 0.60, 0.85, 0.80, 0.65],    "متالورژی":      [0.20, 0.60, 0.85, 0.80, 0.65],
    "سرامیک":        [0.20, 0.60, 0.85, 0.80, 0.65],
    
    # === گروه معدن ===
    "معدن":          [0.30, 0.80, 0.85, 0.60, 0.50],
    "اکتشاف":        [0.30, 0.80, 0.85, 0.60, 0.50],
    
    # === گروه نساجی ===
    "نساجی":         [0.30, 0.70, 0.70, 0.50, 0.80],
    "پوشاک":         [0.30, 0.70, 0.70, 0.50, 0.80],
    
    # === گروه کشاورزی و منابع طبیعی ===
    "کشاورزی":       [0.35, 0.60, 0.70, 0.65, 0.55],
    "باغبانی":       [0.35, 0.60, 0.70, 0.65, 0.55],
    "شیلات":         [0.35, 0.60, 0.70, 0.65, 0.55],
    "دامی":          [0.35, 0.60, 0.70, 0.65, 0.55],
    "منابع طبیعی":   [0.35, 0.60, 0.70, 0.65, 0.55],
    "مرتع":          [0.35, 0.60, 0.70, 0.65, 0.55],
    "محیط زیست":     [0.40, 0.70, 0.70, 0.70, 0.60],
    "بیوسیستم":      [0.40, 0.70, 0.70, 0.70, 0.60],
    
    # === گروه پزشکی (مهندسی) ===
    "پزشکی":         [0.60, 0.50, 0.70, 0.80, 0.50],
    
    # === گروه ایمنی و بازرسی ===
    "ایمنی":         [0.40, 0.50, 0.80, 0.70, 0.50],
    "بازرسی":        [0.40, 0.50, 0.80, 0.70, 0.50],
    
    # === گروه نقشه‌برداری ===
    "نقشه":          [0.20, 0.60, 0.85, 0.80, 0.60],
    "ژئوماتیک":      [0.20, 0.60, 0.85, 0.80, 0.60],
    
    # === گروه حمل و نقل ===
    "راه‌آهن":       [0.30, 0.50, 0.85, 0.80, 0.60],
    
    # === گروه شهرسازی ===
    "شهرسازی":       [0.50, 0.50, 0.70, 0.70, 0.70],
    
    # === گروه ماشین ===
    "ماشین":         [0.20, 0.50, 0.90, 0.75, 0.65],
    
    # === پیش‌فرض ===
    "پیش‌فرض":       [0.25, 0.55, 0.80, 0.75, 0.65],
}


def find_sub_pattern(name: str):
    name_lower = name.lower()
    for keyword, pattern in SUB_PATTERNS.items():
        if keyword in name_lower:            return pattern, keyword
    return SUB_PATTERNS["پیش‌فرض"], "پیش‌فرض"


def add_noise(row, noise_range=0.18):
    """نویز قوی Grok"""
    return [
        max(0.0, min(1.0, round(x + random.uniform(-noise_range, noise_range), 3)))
        for x in row
    ]


def enhance_major(major: dict):
    name = major.get("name", "") or major.get("major_name_fa", "")
    base_pattern, keyword = find_sub_pattern(name)
    
    new_matrix = []
    for i in range(20):
        base = base_pattern[i % len(base_pattern):] + base_pattern[:i % len(base_pattern)]
        noisy = add_noise(base[:5])
        new_matrix.append(noisy)
    
    major["strategy_weights"] = new_matrix
    return keyword


def process_file(filepath: Path):
    print(f"\n🔧 پردازش: {filepath.name}")
    
    backup_path = BACKUP_DIR / filepath.name
    shutil.copy2(filepath, backup_path)
    print(f"   📦 بک‌آپ گرفته شد")
    
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
    for kw, count in sorted(stats.items(), key=lambda x: -x[1]):        print(f"      {kw}: {count} رشته")


if __name__ == "__main__":
    target = DATA_DIR / "engineering_majors.json"
    if not target.exists():
        print(f"❌ فایل یافت نشد: {target}")
        exit(1)
    
    process_file(target)
    
    print(f"\n🎉 عملیات پایان یافت!")
    print(f"📦 بک‌آپ در: {BACKUP_DIR}")
    print("\n💡 حالا check_data_quality.py را اجرا کنید")
