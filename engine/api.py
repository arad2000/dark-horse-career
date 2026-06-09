from flask import Flask, request, jsonify, Response
from matcher import DarkHorseMatcher
import os, json

app = Flask(__name__)
DATA_FOLDER = os.path.join(os.path.dirname(__file__), "..", "data")
matcher = DarkHorseMatcher(DATA_FOLDER)

@app.route("/test")
def test():
    user_micro = ["MED-001", "MED-002", "CS-001", "CS-005", "LAW-001", "LAW-004", "PSY-003", "ACC-005"]
    user_strategies = [0,0,0,0,2,2,3,1,0,1,0,2,3,1,2,0,2,0,0,0]
    user_values = ["Q1A","Q2B","Q3A","Q4A","Q5A","Q6A","Q7B","Q8A","Q9A","Q10B"]
    results = matcher.calculate_match(user_micro, user_strategies, user_values)
    return Response(json.dumps(results[:15], ensure_ascii=False, indent=2), mimetype='application/json')

@app.route("/calculate", methods=["POST"])
def calculate():
    data = request.get_json()
    user_micro = data.get("micro_motives", [])
    user_strategies = data.get("strategies", [])
    user_values = data.get("values", [])
    results = matcher.calculate_match(user_micro, user_strategies, user_values)
    return Response(json.dumps(results, ensure_ascii=False, indent=2), mimetype='application/json')

@app.route("/debug")
def debug():
    base = os.path.dirname(__file__)
    root = os.path.join(base, "..")
    data_path = os.path.join(root, "data")
    def list_dir(p):
        try: return os.listdir(p)
        except: return str(p)
    return jsonify({"files_in_data": list_dir(data_path)})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
