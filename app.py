"""
app.py
------
Flask microservice exposing the fraud detection ML model via REST.
Called by the Spring Boot backend for real-time transaction scoring.
"""

import os
import numpy as np
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.getenv("MODEL_PATH", "fraud_model.pkl")
SCALER_PATH = os.getenv("SCALER_PATH", "scaler.pkl")
MODEL_VERSION = "random-forest-v1.0"

# Load model on startup
model = None
scaler = None

def load_model():
    global model, scaler
    try:
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        log.info(f"Model loaded from {MODEL_PATH}")
    except FileNotFoundError:
        log.warning("Model not found. Run train_model.py first. Fallback scoring active.")

load_model()


def extract_features(data: dict) -> np.ndarray:
    """Extract and order features from incoming request."""
    features = []
    for i in range(1, 15):
        features.append(float(data.get(f"v{i}", 0.0)))

    amount = float(data.get("amount", 0.0))
    if scaler is not None:
        amount_scaled = scaler.transform([[amount]])[0][0]
    else:
        amount_scaled = amount / 1000.0  # simple normalization fallback

    features.append(amount_scaled)
    return np.array(features).reshape(1, -1)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "UP",
        "model_loaded": model is not None,
        "model_version": MODEL_VERSION
    }), 200


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data"}), 400

        features = extract_features(data)

        if model is not None:
            fraud_prob = float(model.predict_proba(features)[0][1])
            is_fraud = bool(fraud_prob >= 0.5)
        else:
            # Fallback when model is not trained yet
            amount = float(data.get("amount", 0.0))
            v3 = float(data.get("v3", 0.0))
            v14 = float(data.get("v14", 0.0))
            score = 0.0
            if amount > 5000: score += 0.3
            elif amount > 1000: score += 0.15
            if v3 < -3.0: score += 0.25
            if v14 < -5.0: score += 0.3
            fraud_prob = min(score, 0.95)
            is_fraud = fraud_prob >= 0.5

        log.info(f"Prediction: amount={data.get('amount')}, prob={fraud_prob:.4f}, fraud={is_fraud}")

        return jsonify({
            "fraudProbability": round(fraud_prob, 4),
            "isFraud": is_fraud,
            "modelVersion": MODEL_VERSION if model else "fallback-rules-v1"
        }), 200

    except Exception as e:
        log.error(f"Prediction error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/batch-predict", methods=["POST"])
def batch_predict():
    """Score multiple transactions at once."""
    try:
        transactions = request.get_json()
        if not isinstance(transactions, list):
            return jsonify({"error": "Expected a list of transactions"}), 400

        results = []
        for txn in transactions:
            features = extract_features(txn)
            if model is not None:
                prob = float(model.predict_proba(features)[0][1])
            else:
                prob = 0.1
            results.append({
                "transactionId": txn.get("transactionId"),
                "fraudProbability": round(prob, 4),
                "isFraud": prob >= 0.5,
                "modelVersion": MODEL_VERSION
            })

        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    log.info(f"Starting ML service on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
