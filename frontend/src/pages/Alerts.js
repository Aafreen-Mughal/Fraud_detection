import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const severityConfig = {
  critical: { color: 'var(--danger)', bg: 'var(--danger-glow)', icon: '🚨', label: 'CRITICAL' },
  high: { color: 'var(--warning)', bg: 'var(--warning-glow)', icon: '⚠️', label: 'HIGH' },
  medium: { color: '#ff8f00', bg: 'rgba(255,143,0,0.1)', icon: '🔶', label: 'MEDIUM' },
  low: { color: 'var(--success)', bg: 'var(--success-glow)', icon: 'ℹ️', label: 'LOW' },
};

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severity: '', is_resolved: 'false', page: 1 });
  const [resolving, setResolving] = useState(null);

  const isPrivileged = user?.role === 'admin' || user?.role === 'analyst';

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const [alertsRes, summaryRes] = await Promise.all([
        api.get(`/alerts?${new URLSearchParams({ ...filters, limit: 20 })}`),
        api.get('/alerts/summary'),
      ]);
      setAlerts(alertsRes.data.alerts);
      setSummary(summaryRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, [filters]);

  const handleResolve = async (id) => {
    setResolving(id);
    try {
      await api.put(`/alerts/${id}/resolve`);
      fetchAlerts();
    } catch (e) { console.error(e); }
    finally { setResolving(null); }
  };

  return (
    <Layout>
      <div className="page-container fade-in">
        <div className="page-header">
          <h1>◈ Fraud Alerts</h1>
          <p>Monitor and respond to detected fraud incidents</p>
        </div>

        {/* Summary cards */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Alerts', value: summary.total || 0, color: 'accent' },
            { label: 'Critical', value: summary.critical || 0, color: 'danger' },
            { label: 'High Severity', value: summary.high || 0, color: 'warning' },
            { label: 'Unresolved', value: summary.unresolved || 0, color: summary.unresolved > 0 ? 'danger' : 'success' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: `var(--${s.color})`, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="input" style={{ maxWidth: 160 }} value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value, page: 1 }))}>
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
            <select className="input" style={{ maxWidth: 160 }} value={filters.is_resolved} onChange={e => setFilters(f => ({ ...f, is_resolved: e.target.value, page: 1 }))}>
              <option value="">All Status</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ severity: '', is_resolved: 'false', page: 1 })}>Clear</button>
          </div>
        </div>

        {/* Alerts list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--success)', marginBottom: 8 }}>No alerts found</div>
            <div style={{ color: 'var(--text-muted)' }}>Your system is clear of fraud alerts</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alerts.map(alert => {
              const sev = severityConfig[alert.severity] || severityConfig.medium;
              return (
                <div
                  key={alert.id}
                  className="card"
                  style={{
                    padding: '18px 24px',
                    borderLeft: `3px solid ${sev.color}`,
                    opacity: alert.is_resolved ? 0.6 : 1,
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sev.color, background: sev.bg, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                          {sev.icon} {sev.label}
                        </span>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4 }}>
                          {alert.alert_type}
                        </span>
                        {alert.is_resolved && <span className="badge badge-success" style={{ fontSize: 11 }}>✓ Resolved</span>}
                      </div>

                      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {alert.message}
                      </div>

                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          👤 {alert.user_name} ({alert.user_email})
                        </span>
                        {alert.amount && (
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            💰 ${parseFloat(alert.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {alert.tx_status && (
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Status: {alert.tx_status}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {!alert.is_resolved && isPrivileged && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleResolve(alert.id)}
                          disabled={resolving === alert.id}
                          style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                        >
                          {resolving === alert.id ? 'Resolving...' : '✓ Resolve'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}