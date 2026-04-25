from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np

app = Flask(__name__)
CORS(app)

# Load model
try:
    with open('fraud_model.pkl', 'rb') as f:
        model_data = pickle.load(f)
    model = model_data['model']
    scaler = model_data['scaler']
    print("✅ ML model loaded successfully")
except Exception as e:
    model = None
    print(f"⚠ Model not loaded: {e}")

TYPE_MAP = { 'PAYMENT': 0, 'TRANSFER': 1, 'CASH_OUT': 2, 'DEBIT': 3, 'CASH_IN': 4 }

@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model not loaded'}), 503

    data = request.json
    try:
        amount = float(data.get('amount', 0))
        old_balance = float(data.get('oldBalanceOrig', 0))
        new_balance = float(data.get('newBalanceOrig', 0))
        tx_type = TYPE_MAP.get(data.get('type', 'PAYMENT'), 0)

        features = np.array([[tx_type, amount, old_balance, new_balance]])

        fraud_score = float(model.predict_proba(features)[0][1])
        is_fraud = fraud_score >= 0.75
        risk_level = 'critical' if fraud_score >= 0.75 else 'high' if fraud_score >= 0.4 else 'medium' if fraud_score >= 0.2 else 'low'

        return jsonify({
            'is_fraud': is_fraud,
            'fraud_score': round(fraud_score, 4),
            'risk_level': risk_level,
            'reason': 'ML model prediction'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': model is not None})

if __name__ == '__main__':
    app.run(port=8000, debug=True)