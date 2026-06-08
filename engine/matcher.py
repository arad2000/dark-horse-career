import json
import os

class DarkHorseMatcher:
    def __init__(self, data_folder="../data"):
        self.majors = []
        self.micro_motives_dict = {}
        self._load_all_majors(data_folder)
        self._load_micro_motives(data_folder)

    def _load_all_majors(self, folder):
        """۶ فایل JSON پروفایل رشته‌ها را می‌خواند و در یک لیست ادغام می‌کند."""
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

    def _load_micro_motives(self, folder):
        """فایل یکپارچهٔ میکروموتیوها را می‌خواند و به دیکشنری تبدیل می‌کند."""
        path = os.path.join(folder, "micro_motives.json")
        with open(path, "r", encoding="utf-8") as f:
            motives_list = json.load(f)
        self.micro_motives_dict = {item["code"]: item["description_fa"] for item in motives_list}
        print(f"✅ {len(self.micro_motives_dict)} میکروموتیو با توضیح فارسی بارگذاری شد.")

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
            common_codes = list(set(user_micro_motives) & set(major["micro_motive_codes"]))
            common_descriptions = [
                {"code": code, "description": self.micro_motives_dict.get(code, "")}
                for code in common_codes
            ]
            m_score = len(common_codes) / len(user_micro_motives) if user_micro_motives else 0

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
                    "v_score": round(v_score * 100, 1),
                    "common_micro_motives": common_descriptions
                })

        # مرتب‌سازی نزولی
        results.sort(key=lambda x: x["total_score"], reverse=True)
        return results
