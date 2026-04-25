const pool = require('./db');

const initSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        account_number VARCHAR(20) UNIQUE,
        account_type VARCHAR(50) DEFAULT 'checking',
        balance DECIMAL(15,2) DEFAULT 10000.00,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Transactions table (modeled after Kaggle PaySim dataset)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        step INTEGER,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        name_orig VARCHAR(100),
        old_balance_orig DECIMAL(15,2),
        new_balance_orig DECIMAL(15,2),
        name_dest VARCHAR(100),
        old_balance_dest DECIMAL(15,2),
        new_balance_dest DECIMAL(15,2),
        is_fraud BOOLEAN DEFAULT false,
        is_flagged_fraud BOOLEAN DEFAULT false,
        fraud_score DECIMAL(5,4) DEFAULT 0,
        fraud_reason TEXT,
        status VARCHAR(50) DEFAULT 'completed',
        user_id UUID REFERENCES users(id),
        merchant_name VARCHAR(255),
        merchant_category VARCHAR(100),
        location VARCHAR(255),
        device_type VARCHAR(50),
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Fraud alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID REFERENCES transactions(id),
        user_id UUID REFERENCES users(id),
        alert_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        message TEXT,
        is_resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP,
        resolved_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Account activity logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Saved cards / payment methods
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        card_last_four VARCHAR(4),
        card_brand VARCHAR(50),
        card_type VARCHAR(50),
        expiry_month INTEGER,
        expiry_year INTEGER,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_is_fraud ON transactions(is_fraud);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);`);

    await client.query('COMMIT');
    console.log('✅ Database schema initialized');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Schema init error:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { initSchema };