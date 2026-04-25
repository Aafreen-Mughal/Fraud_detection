const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const generateAccountNumber = () => {
  return 'ACC' + Date.now().toString().slice(-10);
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/register
const register = async (req, res) => {
  const { name, email, password, account_type = 'checking' } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const accountNumber = generateAccountNumber();

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, account_number, account_type, balance)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, account_number, account_type, balance, created_at`,
      [name, email, passwordHash, accountNumber, account_type, 0]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'REGISTER', JSON.stringify({ email }), req.ip]
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        account_number: user.account_number,
        account_type: user.account_type,
        balance: parseFloat(user.balance),
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'LOGIN', JSON.stringify({ email }), req.ip]
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        account_number: user.account_number,
        account_type: user.account_type,
        balance: parseFloat(user.balance),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, account_number, account_type, balance, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, email, role, account_number, balance`,
      [name, req.user.id]
    );
    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, getMe, updateProfile };