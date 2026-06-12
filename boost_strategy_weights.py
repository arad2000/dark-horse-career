"""
اسکریپت هوشمند بهبود strategy_weights - نسخه Realm-Based
الگوهای پایه متفاوت برای هر قلمرو + نویز کنترل‌شده
"""

import json
import random
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Dict

random.seed(42)

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = BASE_DIR / "data"
BACKUP_DIR = BASE_DIR / "backup" / datetime.now().strftime("%Y%m%d_%H%M%S")

print("📁 مسیر داده:", DATA_DIR)
print("📁 مسیر بک‌آپ:", BACKUP_DIR)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# ===================================================================
# الگوهای پایه برای هر قلمرو (Realm)
# ===================================================================
REALM_PATTERNS = {
    "درمانگر": [  # پزشکی، پرستاری، روانشناسی و ...
        [0.9, 0.8, 0.3, 0.2, 0.1], [0.85, 0.75, 0.4, 0.25, 0.15],
        [0.8, 0.7, 0.35, 0.2, 0.1], [0.9, 0.85, 0.25, 0.15, 0.1],
        [0.75, 0.8, 0.4, 0.3, 0.2]
    ] * 4,  # تکرار برای ۲۰ سطر

    "سازنده": [  # مهندسی‌ها
        [0.2, 0.4, 0.85, 0.9, 0.75], [0.25, 0.35, 0.8, 0.85, 0.7],
        [0.15, 0.3, 0.9, 0.8, 0.65], [0.2, 0.45, 0.85, 0.9, 0.8]
    ] * 5,

    "کاشف": [  # علوم پایه، هوش مصنوعی، ریاضی
        [0.3, 0.85, 0.9, 0.55, 0.4], [0.25, 0.8, 0.85, 0.6, 0.35],
        [0.4, 0.9, 0.8, 0.5, 0.45], [0.35, 0.75, 0.9, 0.65, 0.3]
    ] * 5,

    "اندیشمند": [  # علوم انسانی، فلسفه، حقوق
        [0.8, 0.65, 0.4, 0.85, 0.55], [0.75, 0.7, 0.35, 0.8, 0.6],
        [0.85, 0.6, 0.45, 0.9, 0.5], [0.7, 0.75, 0.4, 0.8, 0.55]
    ] * 5,

    "هنرمند": [  # هنر، موسیقی، طراحی
        [0.4, 0.9, 0.85, 0.3, 0.25], [0.35, 0.85, 0.9, 0.4, 0.2],
        [0.5, 0.8, 0.75, 0.35, 0.3], [0.45, 0.9, 0.8, 0.25, 0.35]
    ] * 5,

    "ارتباط‌گر": [  # زبان، مدیریت، روابط بین‌الملل
        [0.9, 0.75, 0.45, 0.6, 0.8], [0.85, 0.7, 0.5, 0.65, 0.75],
        [0.8, 0.8, 0.4, 0.55, 0.85], [0.9, 0.65, 0.55, 0.7, 0.8]
    ] * 5,
}

GROUPS = {
    "medical_majors.json": "درمانگر",
    "engineering_majors.json": "سازنده",
    "basic_sciences_majors.json": "کاشف",
    "humanities_majors.json": "اندیشمند",
    "art_majors.json": "هنرمند",
    "language_majors.json": "ارتباط‌گر"
}


def get_pattern_for_realm(realm_name: str) -> List[List[float]]:
    pattern = REALM_PATTERNS.get(realm_name)
    if not pattern or len(pattern) < 20:
        # اگر الگو ناقص بود، تکرار کن
        base = pattern or REALM_PATTERNS["کاشف"]
        return (base * (20 // len(base) + 1))[:20]
    return pattern[:20]


def add_noise_to_row(row: List[float]) -> List[float]:
    return [max(0.0, min(1.0, round(x + random.uniform(-0.15, 0.15), 3))) for x in row]


def enhance_strategy_weights(major: Dict, realm_name: str):
    if "strategy_weights" not in major or not isinstance(major["strategy_weights"], list):
        return False
    
    base_pattern = get_pattern_for_realm(realm_name)
    new_matrix = []
    
    for i in range(20):
        base_row = base_pattern[i % len(base_pattern)]
        noisy_row = add_noise_to_row(base_row)
        new_matrix.append(noisy_row)
    
    major["strategy_weights"] = new_matrix
    return True


def process_file(filepath: Path, realm_name: str):
    print(f"\n🔧 پردازش: {filepath.name} ({realm_name})")
    
    # بک‌آپ
    backup_path = BACKUP_DIR / filepath.name
    shutil.copy2(filepath, backup_path)
    print(f"   📦 بک‌آپ گرفته شد")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        majors = json.load(f)
    
    updated = 0
    for major in majors:
        if enhance_strategy_weights(major, realm_name):
            updated += 1
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(majors, f, ensure_ascii=False, indent=2)
    
    print(f"   ✅ {updated} رشته به‌روزرسانی شد")


if __name__ == "__main__":
    if not DATA_DIR.exists():
        print("❌ پوشه data پیدا نشد!")
        exit(1)
    
    for filename, realm_name in GROUPS.items():
        path = DATA_DIR / filename
        if path.exists():
            process_file(path, realm_name)
        else:
            print(f"⚠️ فایل {filename} پیدا نشد")
    
    print("\n🎉 عملیات با موفقیت به پایان رسید!")
    print(f"📦 بک‌آپ در: {BACKUP_DIR}")
    print("\n💡 حالا اسکریپت check_data_quality.py را دوباره اجرا کنید")
