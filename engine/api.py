from flask import Flask, jsonify, Response
from matcher import DarkHorseMatcher
import os
import json

app = Flask(__name__)

DATA_FOLDER = os.path.join(os.path.dirname(__file__), "..", "data")
matcher = DarkHorseMatcher(DATA_FOLDER)

@app.route("/test")
def test():
    user_micro = ["MED-001", "MED-002", "CS-001", "CS-005", "LAW-001", "LAW-004", "PSY-003", "ACC-005"]
    user_strategies = [0, 0, 0, 0, 2, 2, 3, 1, 0, 1, 0, 2, 3, 1, 2, 0, 2, 0, 0, 0]
    user_values = ["Q1A", "Q2B", "Q3A", "Q4A", "Q5A", "Q6A", "Q7B", "Q8A", "Q9A", "Q10B"]

    results = matcher.calculate_match(user_micro, user_strategies, user_values)

    # برای نمایش درست فارسی، از Response دستی استفاده می‌کنیم
    return Response(
        json.dumps(results[:15], ensure_ascii=False, indent=2),
        mimetype='application/json'
    )

@app.route("/debug")
def debug():
    """نمایش ساختار فایل‌ها و پوشه‌ها"""
    base = os.path.dirname(__file__)
    root = os.path.join(base, "..")
    data_path = os.path.join(root, "data")

    def list_dir(path):
        try:
            return os.listdir(path)
        except Exception as e:
            return str(e)

    return jsonify({
        "current_file": __file__,
        "base (engine)": os.path.abspath(base),
        "root": os.path.abspath(root),
        "data_path": os.path.abspath(data_path),
        "files_in_root": list_dir(root),
        "files_in_data": list_dir(data_path),
        "files_in_engine": list_dir(base)
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
