import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const fmt = (n) => n ? parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
const fmtCount = (n) => parseInt(n || 0).toLocaleString();

const statusBadge = (tx) => {
  if (tx.is_fraud) return <span className="badge badge-danger">Fraudulent</span>;
  if (tx.is_flagged_fraud) return <span className="badge badge-warning">Flagged</span>;
  return <span className="badge badge-success">Legit</span>;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to load dashboard data. Is the API server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-muted)' }}>Loading dashboard...</div>
        </div>
      </div>
    </Layout>
  );

  const s = data?.stats || {};
  const a = data?.alerts || {};

  return (
    <Layout>
      <div className="page-container fade-in">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
              Here's your fraud detection overview
              <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontSize: 12 }}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={fetchData} className="btn btn-ghost btn-sm">↻ Refresh</button>
            <Link to="/transactions/new" className="btn btn-primary btn-sm">+ New Transaction</Link>
          </div>
        </div>

        {error && <div className="alert-strip alert-strip-danger">⚠ {error} — Running in demo mode with mock data.</div>}

        {/* Critical alert banner */}
        {parseInt(a.critical) > 0 && (
          <div className="alert-strip alert-strip-danger" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🚨 {a.critical} critical fraud alert{a.critical > 1 ? 's' : ''} require immediate attention</span>
            <Link to="/alerts" style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>View Alerts →</Link>
          </div>
        )}

        {/* Account balance card */}
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #0a1a2e, #112240)', border: '1px solid var(--accent)22' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Account Balance</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                ${fmt(data?.account?.balance)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                {data?.account?.account_number} · {data?.account?.account_type?.toUpperCase()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Security Status</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <span className="badge badge-success">● Account Active</span>
                {parseInt(a.unresolved) > 0
                  ? <span className="badge badge-warning">⚠ {a.unresolved} Open Alerts</span>
                  : <span className="badge badge-success">✓ No Open Alerts</span>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <StatCard icon="⇄" label="Total Transactions" value={fmtCount(s.total)} sub={`$${fmt(s.total_volume)} volume`} color="accent" />
          <StatCard icon="🚨" label="Fraudulent" value={fmtCount(s.fraudulent)} sub={`$${fmt(s.fraud_volume)} blocked`} color="danger" />
          <StatCard icon="🚩" label="Flagged" value={fmtCount(s.flagged)} sub="Under review" color="warning" />
          <StatCard icon="✓" label="Fraud Rate" value={s.total > 0 ? `${((s.fraudulent / s.total) * 100).toFixed(1)}%` : '0%'} sub="Detection accuracy" color={s.fraudulent > s.total * 0.1 ? 'danger' : 'success'} />
        </div>

        {/* Recent transactions + quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Recent transactions */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="section-title" style={{ margin: 0 }}>◎ Recent Transactions</div>
              <Link to="/transactions" style={{ fontSize: 13, color: 'var(--accent)' }}>View all →</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Merchant</th>
                    <th>Status</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentTransactions || []).length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No transactions yet</td></tr>
                  ) : (
                    (data?.recentTransactions || []).map(tx => (
                      <tr key={tx.id}>
                        <td><span className="badge badge-accent" style={{ fontSize: 11 }}>{tx.type}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>${fmt(tx.amount)}</td>
                        <td style={{ fontSize: 13 }}>{tx.merchant_name || '—'}</td>
                        <td>{statusBadge(tx)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${tx.fraud_score * 100}%`, background: tx.fraud_score > 0.75 ? 'var(--danger)' : tx.fraud_score > 0.4 ? 'var(--warning)' : 'var(--success)', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{(tx.fraud_score * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: 20 }}>
              <div className="section-title">⚡ Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { to: '/transactions/new', label: 'New Transaction', icon: '→', color: 'var(--accent)' },
                  { to: '/alerts', label: 'View Fraud Alerts', icon: '◈', color: 'var(--danger)' },
                  { to: '/analytics', label: 'Analytics Report', icon: '◎', color: 'var(--warning)' },
                  { to: '/ecommerce', label: 'E-Commerce Sim', icon: '⊡', color: 'var(--success)' },
                ].map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 8,
                      background: 'var(--bg-input)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', fontSize: 14,
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.color = item.color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <span style={{ color: item.color }}>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Dataset info */}
            <div className="card" style={{ padding: 16, background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.1)' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Dataset Info</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Powered by PaySim financial fraud dataset. Features: transaction type, amount, balance changes, fraud labels (isFraud, isFlaggedFraud).
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}