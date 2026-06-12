import json
import random
import os

random.seed(42)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

GROUPS = {
    "medical": "medical_majors.json",
    "engineering": "engineering_majors.json",
    "basic_sciences": "basic_sciences_majors.json",
    "humanities": "humanities_majors.json",
    "art": "art_majors.json",
    "language": "language_majors.json"
}

def enhance_weights(weights_matrix):
    new_matrix = []
    for row in weights_matrix:
        new_row = []
        for w in row:
            if w >= 0.6:
                w_new = 0.9
            elif w >= 0.4:
                w_new = 0.5
            else:
                w_new = 0.1
            noise = random.uniform(-0.05, 0.05)
            w_new = max(0.0, min(1.0, w_new + noise))
            new_row.append(round(w_new, 2))
        new_matrix.append(new_row)
    return new_matrix

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        majors = json.load(f)
    for major in majors:
        major['strategy_weights'] = enhance_weights(major['strategy_weights'])
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(majors, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    for group, fname in GROUPS.items():
        path = os.path.join(DATA_DIR, fname)
        if os.path.exists(path):
            print(f"🔧 در حال پردازش {group}...")
            process_file(path)
        else:
            print(f"⚠️ فایل {path} پیدا نشد.")
    print("✅ تمام فایل‌ها با وزن‌های استراتژی جدید جایگزین شدند.")
