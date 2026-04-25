const pool = require('./db');
const { initSchema } = require('./schema');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const txTypes = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN'];
const merchants = ['Amazon', 'Netflix', 'Uber', 'Starbucks', 'Walmart', 'Shell Gas', 'Apple Store', 'Target', 'Best Buy', 'McDonalds', 'Airbnb', 'Spotify'];
const categories = ['retail', 'entertainment', 'transport', 'food', 'utilities', 'travel', 'electronics'];
const devices = ['mobile', 'desktop', 'tablet', 'pos_terminal'];
const locations = ['Karachi, PK', 'Lahore, PK', 'Islamabad, PK', 'New York, US', 'London, UK', 'Dubai, UAE', 'Unknown Location'];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function generateFraudScore(type, amount, isFraud) {
  if (isFraud) return (0.75 + Math.random() * 0.25).toFixed(4);
  if (amount > 50000) return (0.3 + Math.random() * 0.3).toFixed(4);
  return (Math.random() * 0.2).toFixed(4);
}

async function seed() {
  await initSchema();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create demo users
    const users = [
      { name: 'Ahmad Hassan', email: 'admin@fraudshield.io', password: 'Admin@123', role: 'admin', account: 'ACC0001000001', balance: 250000 },
      { name: 'Sarah Khan', email: 'sarah@demo.com', password: 'Demo@123', role: 'user', account: 'ACC0001000002', balance: 45230.50 },
      { name: 'Ali Raza', email: 'ali@demo.com', password: 'Demo@123', role: 'user', account: 'ACC0001000003', balance: 12800.75 },
      { name: 'Fatima Malik', email: 'fatima@demo.com', password: 'Demo@123', role: 'analyst', account: 'ACC0001000004', balance: 87500.00 },
    ];

    const userIds = [];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, account_number, balance)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [u.name, u.email, hash, u.role, u.account, u.balance]
      );
      userIds.push(res.rows[0].id);
    }

    // Generate 200 realistic transactions (mix of fraud and normal)
    const transactions = [];
    for (let i = 0; i < 200; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const type = txTypes[Math.floor(Math.random() * txTypes.length)];
      const isFraud = Math.random() < 0.08; // ~8% fraud rate
      const isFlaggedFraud = !isFraud && Math.random() < 0.05;

      let amount;
      if (isFraud) {
        amount = randomBetween(5000, 150000);
      } else {
        amount = randomBetween(10, 8000);
      }

      const oldBalOrig = randomBetween(1000, 100000);
      const newBalOrig = Math.max(0, oldBalOrig - amount);
      const oldBalDest = randomBetween(0, 50000);
      const newBalDest = oldBalDest + amount;
      const step = Math.floor(randomBetween(1, 744));
      const fraudScore = generateFraudScore(type, amount, isFraud);
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      const location = isFraud ? locations[Math.floor(Math.random() * 3) + 3] : locations[Math.floor(Math.random() * 3)];

      const fraudReason = isFraud
        ? ['Unusual transfer amount', 'Account emptied after transfer', 'Suspicious location', 'Multiple rapid transactions', 'New device detected'][Math.floor(Math.random() * 5)]
        : null;

      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      const createdAt = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);

      transactions.push([
        step, type, amount.toFixed(2),
        `C${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        oldBalOrig.toFixed(2), newBalOrig.toFixed(2),
        `M${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        oldBalDest.toFixed(2), newBalDest.toFixed(2),
        isFraud, isFlaggedFraud, fraudScore, fraudReason,
        isFraud ? 'blocked' : 'completed',
        userId, merchant, category, location, device,
        `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        createdAt
      ]);
    }

    for (const tx of transactions) {
      const res = await client.query(
        `INSERT INTO transactions (
          step, type, amount, name_orig, old_balance_orig, new_balance_orig,
          name_dest, old_balance_dest, new_balance_dest, is_fraud, is_flagged_fraud,
          fraud_score, fraud_reason, status, user_id, merchant_name, merchant_category,
          location, device_type, ip_address, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        RETURNING id, is_fraud, user_id`,
        tx
      );

      // Generate alerts for fraud transactions
      if (res.rows[0].is_fraud) {
        const alertTypes = ['HIGH_VALUE_TRANSFER', 'ACCOUNT_EMPTIED', 'SUSPICIOUS_LOCATION', 'VELOCITY_BREACH'];
        await client.query(
          `INSERT INTO fraud_alerts (transaction_id, user_id, alert_type, severity, message)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            res.rows[0].id,
            res.rows[0].user_id,
            alertTypes[Math.floor(Math.random() * alertTypes.length)],
            'high',
            `Fraudulent transaction detected: $${tx[2]} ${tx[1]}`
          ]
        );
      }
    }

    // Add payment methods for users
    const brands = ['Visa', 'Mastercard', 'Amex'];
    for (const uid of userIds) {
      await client.query(
        `INSERT INTO payment_methods (user_id, card_last_four, card_brand, card_type, expiry_month, expiry_year, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [uid, String(Math.floor(Math.random() * 9000) + 1000), brands[Math.floor(Math.random() * 3)], 'credit', Math.floor(Math.random() * 12) + 1, 2026 + Math.floor(Math.random() * 4), true]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully');
    console.log('');
    console.log('Demo Accounts:');
    console.log('  Admin:   admin@fraudshield.io  / Admin@123');
    console.log('  User:    sarah@demo.com         / Demo@123');
    console.log('  Analyst: fatima@demo.com        / Demo@123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();