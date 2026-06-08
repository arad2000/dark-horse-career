import json
import os

class DarkHorseMatcher:
    def __init__(self, data_folder="../data"):
        self.majors = []
        self._load_all_majors(data_folder)

    def _load_all_majors(self, folder):
        """۶ فایل JSON را می‌خواند و در یک لیست ادغام می‌کند."""
        files = [
            "medical_majors.json",
            "engineering_majors.json",
            "basic_sciences_majors.json",
            "humanities_majors.json",
            "art_majors.json",
            "language_majors.json"
        ]
        for fname in files:
            path = os.path.join(folder, fname)
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.majors.extend(data)
        print(f"✅ {len(self.majors)} رشته از ۶ فایل بارگذاری شد.")

    def calculate_match(self, user_micro_motives, user_strategies, user_values):
        """
        محاسبهٔ امتیاز تطابق برای همهٔ رشته‌ها.
        user_micro_motives: لیست کدهای میکروموتیو انتخابی
        user_strategies: لیست ۲۰ تایی از اعداد ۰ تا ۴
        user_values: لیست ۱۰ تایی از کلیدهای انتخابی (مثلاً "Q1A")
        """
        results = []
        for major in self.majors:
            # لایهٔ اول: خرده‌انگیزه‌ها (۶۰٪)
            common = len(set(user_micro_motives) & set(major["micro_motive_codes"]))
            m_score = common / len(user_micro_motives) if user_micro_motives else 0

            # لایهٔ دوم: راهبردها (۲۰٪)
            s_total = 0
            for i, choice in enumerate(user_strategies):
                if i < len(major["strategy_weights"]) and choice < len(major["strategy_weights"][i]):
                    s_total += major["strategy_weights"][i][choice]
            s_score = s_total / len(user_strategies)

            # لایهٔ سوم: ارزش‌ها (۲۰٪)
            v_total = sum(major["value_weights"].get(v, 0) for v in user_values)
            v_score = v_total / len(user_values)

            # امتیاز نهایی
            final_score = (0.60 * m_score) + (0.20 * s_score) + (0.20 * v_score)

            if final_score >= 0.30:
                results.append({
                    "id": major["id"],
                    "name": major["name"],
                    "group": major["group"],
                    "total_score": round(final_score * 100, 1),
                    "m_score": round(m_score * 100, 1),
                    "s_score": round(s_score * 100, 1),
                    "v_score": round(v_score * 100, 1)
                })

        # مرتب‌سازی نزولی
        results.sort(key=lambda x: x["total_score"], reverse=True)
        return results


# ======================= تست با داده‌های فرضی =======================
if __name__ == "__main__":
    matcher = DarkHorseMatcher("../data")

    # یک کاربر فرضی: عاشق تحلیل، دقت، کمک به دیگران
    user_micro = ["MED-001", "MED-002", "CS-001", "CS-005", "LAW-001", "LAW-004", "PSY-003", "ACC-005"]
    user_strategies = [0, 0, 0, 0, 2, 2, 3, 1, 0, 1, 0, 2, 3, 1, 2, 0, 2, 0, 0, 0]  # ۲۰ عدد
    user_values = ["Q1A", "Q2B", "Q3A", "Q4A", "Q5A", "Q6A", "Q7B", "Q8A", "Q9A", "Q10B"]  # ۱۰ کلید

    print("\n🔍 در حال محاسبهٔ تناسب با ۱۵۰ رشته...\n")
    matches = matcher.calculate_match(user_micro, user_strategies, user_values)

    print("=" * 70)
    print(f"{'رتبه':<5} {'رشته':<25} {'گروه':<15} {'کل':<7} {'انگیزه':<7} {'راهبرد':<7} {'ارزش':<7}")
    print("-" * 70)
    for i, m in enumerate(matches[:15], 1):
        print(f"{i:<5} {m['name']:<25} {m['group']:<15} {m['total_score']:<6}% {m['m_score']:<6}% {m['s_score']:<6}% {m['v_score']:<6}%")
    print("=" * 70)
    print(f"\n📊 {len(matches)} رشته بالای ۳۰٪ تطابق دارند.")
