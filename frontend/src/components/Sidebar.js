import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { to: '/transactions', icon: '⇄', label: 'Transactions' },
  { to: '/alerts', icon: '◈', label: 'Fraud Alerts' },
  { to: '/analytics', icon: '◎', label: 'Analytics' },
  { to: '/ecommerce', icon: '⊡', label: 'E-Commerce Sim' },
  { to: '/accounts', icon: '◉', label: 'Accounts' },
  { to: '/help', icon: '?', label: 'Help Center' },
];

const adminItems = [
  { to: '/admin', icon: '⊞', label: 'Admin Panel' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items = [...navItems, ...(user?.role === 'admin' ? adminItems : [])];

  return (
    <aside style={{
      width: collapsed ? '64px' : '240px',
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 16px' : '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36,
          background: 'var(--accent)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#000', fontWeight: 700, fontSize: 16, flexShrink: 0,
        }}>FS</div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1 }}>FraudShield</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Detection Platform</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 2,
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-glow)' : 'transparent',
              border: isActive ? '1px solid rgba(0,212,255,0.15)' : '1px solid transparent',
              transition: 'var(--transition)',
              fontWeight: isActive ? 600 : 400,
              fontSize: 14,
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.getAttribute('aria-current')) {
                e.currentTarget.style.background = '';
                e.currentTarget.style.color = '';
              }
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0, fontFamily: 'monospace' }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
        {!collapsed && (
          <div style={{ padding: '10px 12px', marginBottom: 8, background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 4, transition: 'var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <span>{collapsed ? '→' : '←'}</span>
          {!collapsed && 'Collapse'}
        </button>
        <button
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', width: '100%', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: 13, transition: 'var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-glow)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <span>⏻</span>
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}