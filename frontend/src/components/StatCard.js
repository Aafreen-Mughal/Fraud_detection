import React from 'react';

export default function StatCard({ icon, label, value, sub, color = 'accent', trend }) {
  const colors = {
    accent: 'var(--accent)',
    danger: 'var(--danger)',
    warning: 'var(--warning)',
    success: 'var(--success)',
  };
  const glows = {
    accent: 'var(--accent-glow)',
    danger: 'var(--danger-glow)',
    warning: 'var(--warning-glow)',
    success: 'var(--success-glow)',
  };

  return (
    <div className="card fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 100, height: 100,
        background: glows[color],
        borderRadius: '0 0 0 100%',
        opacity: 0.5,
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44,
          background: glows[color],
          border: `1px solid ${colors[color]}22`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize: 12, color: trend >= 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: colors[color], fontFamily: 'var(--font-mono)', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}