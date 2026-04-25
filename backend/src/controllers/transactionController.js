const pool = require('../config/db');
const { analyzeFraud } = require('../services/fraudDetection');

// GET /api/transactions - list user's transactions
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_fraud, start_date, end_date, search } = req.query;
    const offset = (page - 1) * limit;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'analyst';

    let whereClause = isAdmin ? 'WHERE 1=1' : 'WHERE t.user_id = $1';
    const params = isAdmin ? [] : [req.user.id];
    let paramCount = params.length;

    if (type) {
      paramCount++;
      whereClause += ` AND t.type = $${paramCount}`;
      params.push(type);
    }
    if (is_fraud !== undefined) {
      paramCount++;
      whereClause += ` AND t.is_fraud = $${paramCount}`;
      params.push(is_fraud === 'true');
    }
    if (start_date) {
      paramCount++;
      whereClause += ` AND t.created_at >= $${paramCount}`;
      params.push(start_date);
    }
    if (end_date) {
      paramCount++;
      whereClause += ` AND t.created_at <= $${paramCount}`;
      params.push(end_date);
    }
    if (search) {
      paramCount++;
      whereClause += ` AND (t.merchant_name ILIKE $${paramCount} OR t.name_orig ILIKE $${paramCount} OR t.name_dest ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions t ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);

    const result = await pool.query(
      `SELECT t.*, u.name as user_name, u.email as user_email
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      transactions: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/transactions/:id
const getTransaction = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.name as user_name, u.email as user_email,
              fa.alert_type, fa.severity, fa.is_resolved
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN fraud_alerts fa ON fa.transaction_id = t.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = result.rows[0];
    if (req.user.role === 'user' && tx.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ transaction: tx });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/transactions - create new transaction
const createTransaction = async (req, res) => {
  const {
    type,
    amount,
    name_dest,
    merchant_name,
    merchant_category,
    device_type = 'web',
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get user's current balance
    const userResult = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    const currentBalance = parseFloat(userResult.rows[0].balance);

    if (['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT'].includes(type) && currentBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Run fraud detection
    const oldBalanceOrig = currentBalance;
    const newBalanceOrig = ['CASH_IN'].includes(type)
      ? currentBalance + parseFloat(amount)
      : currentBalance - parseFloat(amount);

    const fraudAnalysis = await analyzeFraud(pool, {
      type,
      amount: parseFloat(amount),
      userId: req.user.id,
      oldBalanceOrig,
      newBalanceOrig,
      nameDest: name_dest,
    });

    const status = fraudAnalysis.isFraud ? 'blocked' : 'completed';

    // Insert transaction
    const txResult = await client.query(
      `INSERT INTO transactions (
        step, type, amount, name_orig, old_balance_orig, new_balance_orig,
        name_dest, old_balance_dest, new_balance_dest,
        is_fraud, is_flagged_fraud, fraud_score, fraud_reason,
        status, user_id, merchant_name, merchant_category,
        device_type, ip_address
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        1, type, parseFloat(amount).toFixed(2),
        req.user.account_number, oldBalanceOrig.toFixed(2), newBalanceOrig.toFixed(2),
        name_dest || 'External', 0, parseFloat(amount).toFixed(2),
        fraudAnalysis.isFraud, fraudAnalysis.isFlaggedFraud,
        fraudAnalysis.fraudScore, fraudAnalysis.fraudReason,
        status, req.user.id,
        merchant_name || 'Direct Transfer', merchant_category || 'transfer',
        device_type, req.ip,
      ]
    );

    const tx = txResult.rows[0];

    // Update balance if not fraud
    if (!fraudAnalysis.isFraud) {
      await client.query(
        'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2',
        [newBalanceOrig.toFixed(2), req.user.id]
      );
    }

    // Create fraud alert if needed
    if (fraudAnalysis.isFraud || fraudAnalysis.isFlaggedFraud) {
      await client.query(
        `INSERT INTO fraud_alerts (transaction_id, user_id, alert_type, severity, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tx.id, req.user.id,
          fraudAnalysis.isFraud ? 'FRAUD_DETECTED' : 'SUSPICIOUS_ACTIVITY',
          fraudAnalysis.isFraud ? 'critical' : 'high',
          fraudAnalysis.fraudReason || 'Suspicious transaction pattern detected',
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      transaction: tx,
      fraudAnalysis: {
        score: fraudAnalysis.fraudScore,
        riskLevel: fraudAnalysis.riskLevel,
        isFraud: fraudAnalysis.isFraud,
        isFlagged: fraudAnalysis.isFlaggedFraud,
        reason: fraudAnalysis.fraudReason,
        status,
      },
      message: fraudAnalysis.isFraud
        ? '⚠️ Transaction blocked: Fraud detected'
        : fraudAnalysis.isFlaggedFraud
        ? '🚩 Transaction flagged for review'
        : '✅ Transaction completed successfully',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// GET /api/transactions/stats/summary
const getStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'analyst';
    const userFilter = isAdmin ? '' : 'AND user_id = $1';
    const params = isAdmin ? [] : [req.user.id];

    const [totals, byType, byDay, recentFraud] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(amount) as total_amount,
          COUNT(*) FILTER (WHERE is_fraud = true) as fraud_count,
          SUM(amount) FILTER (WHERE is_fraud = true) as fraud_amount,
          COUNT(*) FILTER (WHERE is_flagged_fraud = true) as flagged_count,
          AVG(fraud_score) as avg_fraud_score
        FROM transactions WHERE 1=1 ${userFilter}
      `, params),

      pool.query(`
        SELECT type, COUNT(*) as count, SUM(amount) as total
        FROM transactions WHERE 1=1 ${userFilter}
        GROUP BY type ORDER BY count DESC
      `, params),

      pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as transactions,
          COUNT(*) FILTER (WHERE is_fraud = true) as frauds,
          SUM(amount) as volume
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '30 days' ${userFilter}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, params),

      pool.query(`
        SELECT t.*, u.name as user_name
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.is_fraud = true ${userFilter}
        ORDER BY t.created_at DESC LIMIT 10
      `, params),
    ]);

    res.json({
      summary: totals.rows[0],
      byType: byType.rows,
      byDay: byDay.rows,
      recentFraud: recentFraud.rows,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getTransactions, getTransaction, createTransaction, getStats };