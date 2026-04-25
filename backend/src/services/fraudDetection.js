const axios = require('axios');

const ML_API = process.env.ML_API_URL || 'http://localhost:8000';

const FRAUD_THRESHOLDS = {
  HIGH_AMOUNT: 50000,
  MAX_TX_PER_HOUR: 5,
  SUSPICIOUS_BALANCE_RATIO: 0.9,
};

const analyzeFraud = async (pool, { type, amount, userId, oldBalanceOrig, newBalanceOrig, nameDest }) => {
  // Try ML API first
  try {
    const response = await axios.post(`${ML_API}/predict`, {
      type,
      amount,
      oldBalanceOrig,
      newBalanceOrig,
      nameDest: nameDest || 'External',
    }, { timeout: 5000 });

    const d = response.data;
    return {
      fraudScore: d.fraud_score,
      isFraud: d.is_fraud,
      isFlaggedFraud: !d.is_fraud && d.fraud_score > 0.4,
      fraudReason: d.reason || null,
      riskLevel: d.risk_level,
    };
  } catch (err) {
    console.log('ML API unavailable, using rule-based fallback');
  }

  // Rule-based fallback
  let score = 0;
  const reasons = [];

  if (amount > FRAUD_THRESHOLDS.HIGH_AMOUNT) {
    score += 0.35;
    reasons.push('High-value transaction');
  } else if (amount > 20000) {
    score += 0.15;
  }

  if (oldBalanceOrig > 0 && newBalanceOrig === 0 && ['TRANSFER', 'CASH_OUT'].includes(type)) {
    score += 0.40;
    reasons.push('Account fully emptied after transaction');
  }

  if (oldBalanceOrig > 0) {
    const drainRatio = (oldBalanceOrig - newBalanceOrig) / oldBalanceOrig;
    if (drainRatio > FRAUD_THRESHOLDS.SUSPICIOUS_BALANCE_RATIO) {
      score += 0.20;
      reasons.push('Account balance drained >90%');
    }
  }

  const typeRisk = { 'CASH_OUT': 0.10, 'TRANSFER': 0.08, 'DEBIT': 0.03, 'PAYMENT': 0.02, 'CASH_IN': 0.01 };
  score += typeRisk[type] || 0;

  if (userId && pool) {
    try {
      const velocityResult = await pool.query(
        `SELECT COUNT(*) as count FROM transactions
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [userId]
      );
      const txCount = parseInt(velocityResult.rows[0].count);
      if (txCount >= FRAUD_THRESHOLDS.MAX_TX_PER_HOUR) {
        score += 0.25;
        reasons.push(`High velocity: ${txCount} transactions in 1 hour`);
      }
    } catch (e) {}
  }

  score = Math.min(score, 1.0);

  return {
    fraudScore: parseFloat(score.toFixed(4)),
    isFraud: score >= 0.75,
    isFlaggedFraud: score >= 0.40 && score < 0.75,
    fraudReason: reasons.length > 0 ? reasons.join('; ') : null,
    riskLevel: score >= 0.75 ? 'critical' : score >= 0.40 ? 'high' : score >= 0.20 ? 'medium' : 'low',
  };
};

module.exports = { analyzeFraud };