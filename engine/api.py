from flask import Flask, jsonify
from matcher import DarkHorseMatcher
import os

app = Flask(__name__)

# مسیر پوشهٔ data نسبت به این فایل (engine/../data)
DATA_FOLDER = os.path.join(os.path.dirname(__file__), "..", "data")

# یک نمونه از موتور می‌سازیم که با درخواست اول آماده می‌شود
matcher = DarkHorseMatcher(DATA_FOLDER)

@app.route("/test")
def test():
    """یک تست با داده‌های فرضی کاربر انجام می‌دهد و نتیجه را JSON برمی‌گرداند."""
    # کاربر فرضی
    user_micro = ["MED-001", "MED-002", "CS-001", "CS-005", "LAW-001", "LAW-004", "PSY-003", "ACC-005"]
    user_strategies = [0, 0, 0, 0, 2, 2, 3, 1, 0, 1, 0, 2, 3, 1, 2, 0, 2, 0, 0, 0]
    user_values = ["Q1A", "Q2B", "Q3A", "Q4A", "Q5A", "Q6A", "Q7B", "Q8A", "Q9A", "Q10B"]

    results = matcher.calculate_match(user_micro, user_strategies, user_values)
    return jsonify(results[:15])  # ۱۵ رشتهٔ برتر

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
