import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function FraudScoreBar({ score }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.75 ? 'var(--danger)' : score >= 0.4 ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', minWidth: 50 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 11, color, fontFamily: 'var(--font-mono)', minWidth: 28 }}>{pct}%</span>
    </div>
  );
}

function StatusBadge({ tx }) {
  if (tx.is_fraud) return <span className="badge badge-danger">🚨 Fraud</span>;
  if (tx.is_flagged_fraud) return <span className="badge badge-warning">🚩 Flagged</span>;
  if (tx.status === 'blocked') return <span className="badge badge-danger">Blocked</span>;
  return <span className="badge badge-success">✓ Legit</span>;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ page: 1, type: '', is_fraud: '', search: '' });
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type: 'PAYMENT', amount: '', name_dest: '', merchant_name: '', merchant_category: 'retail' });

  const fetchTx = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: filters.page, limit: 20 });
      if (filters.type) params.append('type', filters.type);
      if (filters.is_fraud !== '') params.append('is_fraud', filters.is_fraud);
      if (filters.search) params.append('search', filters.search);
      const res = await api.get(`/transactions?${params}`);
      setTransactions(res.data.transactions);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTx(); }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.post('/transactions', { ...form, amount: parseFloat(form.amount) });
      setResult(res.data);
      setForm({ type: 'PAYMENT', amount: '', name_dest: '', merchant_name: '', merchant_category: 'retail' });
      fetchTx();
    } catch (err) {
      setResult({ error: err.response?.data?.error || 'Transaction failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="page-container fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div className="page-header" style={{ margin: 0 }}>
            <h1>Transactions</h1>
            <p>Monitor and analyze all financial transactions</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setResult(null); }}>
            {showForm ? '✕ Close' : '+ New Transaction'}
          </button>
        </div>

        {/* New Transaction Form */}
        {showForm && (
          <div className="card fade-in" style={{ marginBottom: 24, border: '1px solid rgba(0,212,255,0.2)' }}>
            <h3 style={{ fontSize: 18, marginBottom: 20, color: 'var(--text-primary)' }}>⇄ Initiate Transaction</h3>

            {result && !result.error && (
              <div className={`alert-strip ${result.fraudAnalysis?.isFraud ? 'alert-strip-danger' : result.fraudAnalysis?.isFlagged ? 'alert-strip-warning' : 'alert-strip-success'}`} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>{result.message}</div>
                {result.fraudAnalysis && (
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
                    Fraud Score: {(result.fraudAnalysis.score * 100).toFixed(1)}% · Risk: {result.fraudAnalysis.riskLevel?.toUpperCase()}
                    {result.fraudAnalysis.reason && ` · ${result.fraudAnalysis.reason}`}
                  </div>
                )}
              </div>
            )}
            {result?.error && <div className="alert-strip alert-strip-danger" style={{ marginBottom: 16 }}>⚠ {result.error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div className="input-group">
                  <label>Transaction Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Amount (USD)</label>
                  <input className="input" type="number" min="0.01" step="0.01" placeholder="1000.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label>Destination Account</label>
                  <input className="input" type="text" placeholder="M1234567890" value={form.name_dest} onChange={e => setForm(f => ({ ...f, name_dest: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label>Merchant Name</label>
                  <input className="input" type="text" placeholder="Amazon" value={form.merchant_name} onChange={e => setForm(f => ({ ...f, merchant_name: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label>Category</label>
                  <select className="input" value={form.merchant_category} onChange={e => setForm(f => ({ ...f, merchant_category: e.target.value }))}>
                    {['retail', 'entertainment', 'transport', 'food', 'utilities', 'travel', 'electronics', 'transfer'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting || !form.amount}>
                  {submitting ? (
                    <><span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%' }} /> Analyzing...</>
                  ) : '→ Submit & Analyze'}
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Real-time fraud detection will run automatically</div>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="input"
              style={{ maxWidth: 220 }}
              placeholder="Search merchant, account..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            />
            <select className="input" style={{ maxWidth: 160 }} value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value, page: 1 }))}>
              <option value="">All Types</option>
              {['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN'].map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="input" style={{ maxWidth: 160 }} value={filters.is_fraud} onChange={e => setFilters(f => ({ ...f, is_fraud: e.target.value, page: 1 }))}>
              <option value="">All Status</option>
              <option value="true">Fraud Only</option>
              <option value="false">Legitimate</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ page: 1, type: '', is_fraud: '', search: '' })}>Clear</button>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              {pagination.total} transactions
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-container" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Merchant</th>
                <th>From → To</th>
                <th>Fraud Score</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No transactions found</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id}>
                  <td><span className="badge badge-accent" style={{ fontSize: 11 }}>{tx.type}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>${fmt(tx.amount)}</td>
                  <td style={{ fontSize: 13 }}>{tx.merchant_name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>{tx.name_orig?.slice(0, 8)}...</span>
                    <span style={{ margin: '0 4px' }}>→</span>
                    <span>{tx.name_dest?.slice(0, 8)}...</span>
                  </td>
                  <td style={{ minWidth: 120 }}><FraudScoreBar score={parseFloat(tx.fraud_score)} /></td>
                  <td><StatusBadge tx={tx} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Prev</button>
            <span style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {filters.page} of {pagination.pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={filters.page >= pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next →</button>
          </div>
        )}
      </div>
    </Layout>
  );
}