from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import re
from pathlib import Path

app = Flask(__name__)
CORS(app)

# LOAD MODEL
MODEL_DIR = Path(__file__).resolve().parent
TRAINING_DIR = MODEL_DIR.parent / "model"
model = joblib.load(MODEL_DIR / "crime_model.pkl")
vectorizer = joblib.load(MODEL_DIR / "vectorizer.pkl")

# MODEL ENRICHMENT: analysis kasta wuxuu soo celinayaa location si backend/dashboard-ku u helaan xog isku mid ah.
SOMALI_LOCATIONS = [
    {"district_or_city": "hodan", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "yaaqshiid", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "wadajir", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "dharkenley", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "daynile", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "xamar weyne", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "xamar jajab", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "kaaraan", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "shibis", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "boondheere", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "waaberi", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "wardhiigley", "city": "muqdisho", "region": "banaadir"},
    {"district_or_city": "kismaayo", "city": "kismaayo", "region": "jubbada hoose"},
    {"district_or_city": "baydhabo", "city": "baydhabo", "region": "bay"},
    {"district_or_city": "balcad", "city": "balcad", "region": "shabeellaha dhexe"},
    {"district_or_city": "jowhar", "city": "jowhar", "region": "shabeellaha dhexe"},
    {"district_or_city": "beledweyne", "city": "beledweyne", "region": "hiiraan"},
    {"district_or_city": "gaalkacyo", "city": "gaalkacyo", "region": "mudug"},
    {"district_or_city": "garowe", "city": "garowe", "region": "nugaal"},
    {"district_or_city": "hargeysa", "city": "hargeysa", "region": "woqooyi galbeed"},
    {"district_or_city": "boosaaso", "city": "boosaaso", "region": "bari"},
]

def find_locations(text):
    text_lower = text.lower()
    matches = []

    for location in SOMALI_LOCATIONS:
        pattern = r"\b" + re.escape(location["district_or_city"]) + r"\b"
        if re.search(pattern, text_lower):
            matches.append(location)

    return matches


def is_crime_prediction(prediction):
    return str(prediction).strip().lower() in [
        "crime",
        "crime-related",
        "crime related",
        "criminal",
        "1",
        "yes",
        "true",
    ]


def make_response(text):
    locations = find_locations(text)

    vector = vectorizer.transform([text])
    prediction = str(model.predict(vector)[0])
    confidence = 90.0

    if hasattr(model, "predict_proba"):
        confidence = round(max(model.predict_proba(vector)[0]) * 100, 2)

    is_crime = is_crime_prediction(prediction)

    normalized_prediction = "crime-related" if is_crime else "not crime-related"

    return {
        "prediction": normalized_prediction,
        "rawPrediction": prediction,
        "confidence": confidence,
        "isCrime": is_crime,
        "is_crime": is_crime,
        "matchedKeyword": None,
        "matched_keyword": None,
        "location": locations,
        "locations": locations,
        "model_loaded": True,
        "decision": "CRIME" if is_crime else "NOT_CRIME",
    }

# HEALTH CHECK

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "message": "AI Model Running",
        "modelLoaded": True
    })


@app.route("/api/model/info", methods=["GET"])
def model_info():
    return jsonify({
        "status": "ok",
        "modelLoaded": True,
        "modelFile": str(MODEL_DIR / "crime_model.pkl"),
        "vectorizerFile": str(MODEL_DIR / "vectorizer.pkl"),
        "trainingNotebook": str(TRAINING_DIR / "Automatic_crime.ipynb"),
        "trainingDataset": str(TRAINING_DIR / "dataset.csv.csv"),
        "features": ["text", "url", "file", "batch"],
        "predictEndpoint": "/predict",
    })

# PREDICT

@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json(silent=True) or {}

    text = data.get("text", "")

    if not text or not text.strip():
        return jsonify({
            "message": "Text is required"
        }), 400

    return jsonify(make_response(text))


@app.route("/api/classify/text", methods=["POST"])
def classify_text():
    return predict()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )
