from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import re
from pathlib import Path

app = Flask(__name__)
CORS(app)

# LOAD MODEL
MODEL_DIR = Path(__file__).resolve().parent
model = joblib.load(MODEL_DIR / "crime_model.pkl")
vectorizer = joblib.load(MODEL_DIR / "vectorizer.pkl")

# SOMALI CRIME KEYWORDS

CRIME_KEYWORDS = [

    # Dil
    "dil","dilka","dilay","dileen","la dilay","ladilay",
    "dilaa","gacan ku dhiigle","qisaas","laayay",

    # Dhaawac
    "dhaawac","dhaawacay","dhaawacmay","la dhaawacay",
    "dhaawac culus","dhaawacyo",

    # Toogasho
    "toogasho","toogtay","la toogtay","rasaas",
    "xabad","xabbad","furay rasaas",

    # Weerar
    "weerar","werar","weeraray","weerarkii",
    "weeraro","weerar hubeysan",

    # Hub
    "hub","hubeysan","hubaysan",
    "qori","bastoolad","ak47",
    "miino","bam","bambo",

    # Qarax
    "qarax","qarxay","qarxis","is qarxin",
    "miino qaraxday",

    # Tuugo
    "tuugo","tuug","xatooyo",
    "xaday","la xaday",
    "dhac",
    "boob","burcad","burcad badeed",

    # Afduub
    "afduub","afduubay","la afduubay",
    "la haysto",

    # Kufsi
    "kufsi","kufsaday","la kufsaday",
    "faraxumeyn","xadgudub galmo",

    # Dabley
    "dabley","maleeshiyaad",
    "koox hubeysan",

    # Argagixiso
    "argagixiso","argagaxiso",
    "argagaxisada",
    "alshabaab","al-shabaab",
    "isis","daacish",

    # Dambi
    "dambi","danbi",
    "fal dambiyeed",
    "dembiile","danbiile",

   

    # Hanjabaad
    "hanjabaad",
    "waan dilayaa",
    "waan ku dili doonaa",
    "cabsi gelin",
    "caga jugleyn",

    # Rabshad
    "rabshad","qalalaase",
    "isku dhac","dagaal",
    "gacan ka hadal",

    # Lacag sharci darro
    "musuqmaasuq",
    "laaluush",
    "lacag dhaqid",
    "been abuur",

    # Maandooriye
    "daroogo",
    "maandooriye",
    "xashiish",
    "kokain",
    "heroine",

    # Tahriib
    "tahriib",
    "tahriibiye",

    # Jidgooyo
    "jidgooyo",
    "isbaaro",

    # Falal kale
    "gubay",
    "gubid",
    "dab qabadsiiyay",
    "burburiyay",
    "halaag",
]

# MODEL ENRICHMENT: analysis kasta wuxuu soo celinayaa keyword iyo location si backend/dashboard-ku u helaan xog isku mid ah.
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


def find_keyword(text):
    text_lower = text.lower()

    for keyword in CRIME_KEYWORDS:
        if keyword in text_lower:
            return keyword

    return None


def find_locations(text):
    text_lower = text.lower()
    matches = []

    for location in SOMALI_LOCATIONS:
        pattern = r"\b" + re.escape(location["district_or_city"]) + r"\b"
        if re.search(pattern, text_lower):
            matches.append(location)

    return matches

# HEALTH CHECK

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "message": "AI Model Running"
    })

# PREDICT

@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    text = data.get("text", "")

    if not text:
        return jsonify({
            "message": "Text is required"
        }), 400

    text_lower = text.lower()
    matched_keyword = find_keyword(text)
    locations = find_locations(text)

    # KEYWORD CHECK
    if matched_keyword:

        return jsonify({
            "prediction": "crime-related",
            "confidence": 95,
            "isCrime": True,
            "matchedKeyword": matched_keyword,
            "location": locations
        })

    # MODEL CHECK
    vector = vectorizer.transform([text])

    prediction = model.predict(vector)[0]

    confidence = 90

    if hasattr(model, "predict_proba"):
        confidence = round(
            max(model.predict_proba(vector)[0]) * 100,
            2
        )

    is_crime = str(prediction).lower() in [
        "crime",
        "crime-related",
        "criminal",
        "1",
        "yes"
    ]

    return jsonify({
        "prediction": str(prediction),
        "confidence": confidence,
        "isCrime": is_crime,
        "matchedKeyword": matched_keyword,
        "location": locations
    })

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )
