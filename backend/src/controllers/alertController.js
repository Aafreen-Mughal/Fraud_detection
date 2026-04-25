const pool = require('../config/db');

// GET /api/alerts
const getAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, is_resolved } = req.query;
    const offset = (page - 1) * limit;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'analyst';

    let where = isAdmin ? 'WHERE 1=1' : 'WHERE fa.user_id = $1';
    const params = isAdmin ? [] : [req.user.id];
    let pc = params.length;

    if (severity) { pc++; where += ` AND fa.severity = $${pc}`; params.push(severity); }
    if (is_resolved !== undefined) { pc++; where += ` AND fa.is_resolved = $${pc}`; params.push(is_resolved === 'true'); }

    const countRes = await pool.query(`SELECT COUNT(*) FROM fraud_alerts fa ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT fa.*, 
              t.amount, t.type, t.merchant_name, t.status as tx_status,
              u.name as user_name, u.email as user_email, u.account_number
       FROM fraud_alerts fa
       LEFT JOIN transactions t ON fa.transaction_id = t.id
       LEFT JOIN users u ON fa.user_id = u.id
       ${where}
       ORDER BY fa.created_at DESC
       LIMIT $${pc + 1} OFFSET $${pc + 2}`,
      params
    );

    res.json({
      alerts: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/alerts/:id/resolve
const resolveAlert = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE fraud_alerts SET is_resolved = true, resolved_at = NOW(), resolved_by = $1
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json({ message: 'Alert resolved', alert: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/alerts/summary
const getAlertSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE is_resolved = false) as unresolved
      FROM fraud_alerts
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAlerts, resolveAlert, getAlertSummary };