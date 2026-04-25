const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { getTransactions, getTransaction, createTransaction, getStats } = require('../controllers/transactionController');
const { getAlerts, resolveAlert, getAlertSummary } = require('../controllers/alertController');
const pool = require('../config/db');
// Auth routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticate, getMe);
router.put('/auth/profile', authenticate, updateProfile);

// Transaction routes
router.get('/transactions', authenticate, getTransactions);
router.get('/transactions/stats/summary', authenticate, getStats);
router.get('/transactions/:id', authenticate, getTransaction);
router.post('/transactions', authenticate, createTransaction);

// Alert routes
router.get('/alerts', authenticate, getAlerts);
router.get('/alerts/summary', authenticate, getAlertSummary);
router.put('/alerts/:id/resolve', authenticate, authorize('admin', 'analyst'), resolveAlert);

// Dashboard stats
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'analyst';
    const userFilter = isAdmin ? '' : 'AND user_id = $1';
    const params = isAdmin ? [] : [req.user.id];

    const [txStats, alertStats, recentTx, userInfo] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_fraud) as fraudulent,
          COUNT(*) FILTER (WHERE is_flagged_fraud) as flagged,
          SUM(amount) as total_volume,
          SUM(amount) FILTER (WHERE is_fraud) as fraud_volume
        FROM transactions WHERE 1=1 ${userFilter}
      `, params),

      pool.query(`
        SELECT COUNT(*) FILTER (WHERE NOT is_resolved) as unresolved,
               COUNT(*) FILTER (WHERE severity='critical' AND NOT is_resolved) as critical
        FROM fraud_alerts WHERE 1=1 ${userFilter}
      `, params),

      pool.query(`
        SELECT id, type, amount, is_fraud, is_flagged_fraud, status, merchant_name, created_at, fraud_score
        FROM transactions WHERE 1=1 ${userFilter}
        ORDER BY created_at DESC LIMIT 5
      `, params),

      pool.query('SELECT balance, account_number, account_type FROM users WHERE id = $1', [req.user.id]),
    ]);

    res.json({
      stats: txStats.rows[0],
      alerts: alertStats.rows[0],
      recentTransactions: recentTx.rows,
      account: userInfo.rows[0],
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Users list (admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, account_number, balance, is_active, created_at FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

module.exports = router;