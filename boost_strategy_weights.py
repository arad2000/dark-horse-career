"""
اسکریپت بهبود strategy_weights - نسخه ایمن و هوشمند
"""

import json
import random
import os
import shutil
from datetime import datetime
from pathlib import Path

random.seed(42)

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = BASE_DIR / "data"
BACKUP_DIR = BASE_DIR / "backup" / datetime.now().strftime("%Y%m%d_%H%M%S")

print("📁 مسیر داده:", DATA_DIR)
print("📁 مسیر بک‌آپ:", BACKUP_DIR)

# ایجاد پوشه بک‌آپ
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

GROUPS = {
    "medical": "medical_majors.json",
    "engineering": "engineering_majors.json",
    "basic_sciences": "basic_sciences_majors.json",
    "humanities": "humanities_majors.json",
    "art": "art_majors.json",
    "language": "language_majors.json"
}

def enhance_weights(weights_matrix):
    """بهبود هوشمند وزن‌ها با حفظ تنوع بیشتر"""
    new_matrix = []
    for row in weights_matrix:
        new_row = []
        for w in row:
            # دسته‌بندی هوشمندتر
            if w >= 0.7:
                base = 0.85
            elif w >= 0.45:
                base = 0.55
            elif w >= 0.25:
                base = 0.35
            else:
                base = 0.10
            
            # نویز بیشتر برای ایجاد تمایز
            noise = random.uniform(-0.12, 0.12)
            w_new = base + noise
            w_new = max(0.0, min(1.0, round(w_new, 3)))
            new_row.append(w_new)
        new_matrix.append(new_row)
    return new_matrix


def process_file(filepath: Path):
    print(f"\n🔧 پردازش: {filepath.name}")
    
    # بک‌آپ
    backup_path = BACKUP_DIR / filepath.name
    shutil.copy2(filepath, backup_path)
    print(f"   📦 بک‌آپ گرفته شد: {backup_path.name}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        majors = json.load(f)
    
    updated_count = 0
    for major in majors:
        if "strategy_weights" in major and isinstance(major["strategy_weights"], list):
            original = major["strategy_weights"]
            major["strategy_weights"] = enhance_weights(original)
            updated_count += 1
        else:
            print(f"   ⚠️  {major.get('name', 'نامشخص')} فاقد strategy_weights")
    
    # ذخیره
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(majors, f, ensure_ascii=False, indent=2)
    
    print(f"   ✅ {updated_count} رشته به‌روزرسانی شد")


if __name__ == "__main__":
    if not DATA_DIR.exists():
        print("❌ پوشه data پیدا نشد!")
        print("محتویات فعلی:", os.listdir(BASE_DIR))
        exit(1)
    
    print(f"📊 تعداد گروه‌ها: {len(GROUPS)}\n")
    
    for group, fname in GROUPS.items():
        path = DATA_DIR / fname
        if path.exists():
            process_file(path)
        else:
            print(f"⚠️ فایل {fname} پیدا نشد")
    
    print("\n🎉 عملیات با موفقیت به پایان رسید.")
    print(f"📦 بک‌آپ در پوشه: {BACKUP_DIR}")
