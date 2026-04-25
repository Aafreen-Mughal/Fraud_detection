import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import Layout from '../components/Layout';
import api from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartDefaults = {
  plugins: {
    legend: { labels: { color: '#8facc8', font: { family: 'Space Grotesk' } } },
    tooltip: {
      backgroundColor: '#111c30',
      borderColor: '#1e2f4a',
      borderWidth: 1,
      titleColor: '#e8f0fe',
      bodyColor: '#8facc8',
    },
  },
  scales: {
    x: { ticks: { color: '#4d6b8a' }, grid: { color: '#1e2f4a' } },
    y: { ticks: { color: '#4d6b8a' }, grid: { color: '#1e2f4a' } },
  },
};

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/transactions/stats/summary')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics...</div>
      </div>
    </Layout>
  );

  const byDay = stats?.byDay || [];
  const byType = stats?.byType || [];
  const s = stats?.summary || {};

  const lineData = {
    labels: byDay.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Total Transactions',
        data: byDay.map(d => d.transactions),
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0,212,255,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00d4ff',
        pointRadius: 3,
      },
      {
        label: 'Fraud Detected',
        data: byDay.map(d => d.frauds),
        borderColor: '#ff3b6b',
        backgroundColor: 'rgba(255,59,107,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#ff3b6b',
        pointRadius: 3,
      },
    ],
  };

  const barData = {
    labels: byType.map(t => t.type),
    datasets: [
      {
        label: 'Count',
        data: byType.map(t => t.count),
        backgroundColor: ['rgba(0,212,255,0.7)', 'rgba(255,59,107,0.7)', 'rgba(255,176,32,0.7)', 'rgba(0,230,118,0.7)', 'rgba(147,112,219,0.7)'],
        borderRadius: 6,
      },
    ],
  };

  const totalTx = parseInt(s.total_transactions || 0);
  const fraudTx = parseInt(s.fraud_count || 0);
  const flaggedTx = parseInt(s.flagged_count || 0);
  const legitTx = Math.max(0, totalTx - fraudTx - flaggedTx);

  const doughnutData = {
    labels: ['Legitimate', 'Fraudulent', 'Flagged'],
    datasets: [{
      data: [legitTx, fraudTx, flaggedTx],
      backgroundColor: ['rgba(0,230,118,0.8)', 'rgba(255,59,107,0.8)', 'rgba(255,176,32,0.8)'],
      borderColor: ['#00e676', '#ff3b6b', '#ffb020'],
      borderWidth: 1,
    }],
  };

  const fmtMoney = (n) => {
    const num = parseFloat(n || 0);
    if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num/1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <Layout>
      <div className="page-container fade-in">
        <div className="page-header">
          <h1>◎ Analytics</h1>
          <p>Fraud detection statistics and trends based on PaySim dataset</p>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Volume', value: fmtMoney(s.total_amount), icon: '💹', color: 'var(--accent)' },
            { label: 'Fraud Volume Blocked', value: fmtMoney(s.fraud_amount), icon: '🛡️', color: 'var(--danger)' },
            { label: 'Avg Fraud Score', value: `${((parseFloat(s.avg_fraud_score || 0)) * 100).toFixed(1)}%`, icon: '📊', color: 'var(--warning)' },
            { label: 'Detection Rate', value: totalTx > 0 ? `${((fraudTx / totalTx) * 100).toFixed(2)}%` : '0%', icon: '🎯', color: 'var(--success)' },
          ].map(item => (
            <div key={item.label} className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: item.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{item.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="card">
            <div className="section-title">📈 Transaction Volume Over Time (30 days)</div>
            {byDay.length > 0 ? (
              <Line data={lineData} options={{ ...chartDefaults, responsive: true, maintainAspectRatio: true, aspectRatio: 2.5 }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data available — run seed to populate</div>
            )}
          </div>
          <div className="card">
            <div className="section-title">🔴 Transaction Status Distribution</div>
            {totalTx > 0 ? (
              <>
                <Doughnut data={doughnutData} options={{ ...chartDefaults, responsive: true, plugins: { ...chartDefaults.plugins, legend: { position: 'bottom', labels: { color: '#8facc8', padding: 16 } } } }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                  {[{ label: 'Legitimate', count: legitTx, color: 'var(--success)' }, { label: 'Fraudulent', count: fraudTx, color: 'var(--danger)' }, { label: 'Flagged', count: flaggedTx, color: 'var(--warning)' }].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span style={{ color: item.color }}>● {item.label}</span>
                      <span>{item.count} ({totalTx > 0 ? ((item.count/totalTx)*100).toFixed(1) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data yet</div>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="section-title">📊 Transactions by Type</div>
            {byType.length > 0 ? (
              <Bar data={barData} options={{ ...chartDefaults, responsive: true, plugins: { ...chartDefaults.plugins, legend: { display: false } } }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data available</div>
            )}
          </div>

          <div className="card">
            <div className="section-title">🏆 Recent Fraud Incidents</div>
            <div style={{ overflowY: 'auto', maxHeight: 300 }}>
              {(stats?.recentFraud || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No fraud detected</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.recentFraud.map(tx => (
                    <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid rgba(255,59,107,0.15)' }}>
                      <div>
                        <span className="badge badge-danger" style={{ fontSize: 10, marginRight: 8 }}>{tx.type}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tx.fraud_reason?.split(';')[0] || 'Fraud detected'}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>
                        ${parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}