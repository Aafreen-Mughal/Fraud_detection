import React, { useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

const products = [
  { id: 1, name: 'MacBook Pro 16"', price: 2499, category: 'electronics', img: '💻', risk: 'high' },
  { id: 2, name: 'iPhone 15 Pro', price: 1199, category: 'electronics', img: '📱', risk: 'high' },
  { id: 3, name: 'Nike Air Max', price: 149, category: 'retail', img: '👟', risk: 'low' },
  { id: 4, name: 'Coffee Subscription', price: 29, category: 'food', img: '☕', risk: 'low' },
  { id: 5, name: 'PS5 Console', price: 499, category: 'electronics', img: '🎮', risk: 'medium' },
  { id: 6, name: 'Rolex Watch', price: 8500, category: 'retail', img: '⌚', risk: 'high' },
  { id: 7, name: 'Netflix Yearly', price: 220, category: 'entertainment', img: '🎬', risk: 'low' },
  { id: 8, name: 'Flight: NYC→Dubai', price: 1850, category: 'travel', img: '✈️', risk: 'high' },
];

const riskConfig = {
  low: { color: 'var(--success)', label: 'Low Risk' },
  medium: { color: 'var(--warning)', label: 'Med Risk' },
  high: { color: 'var(--danger)', label: 'High Risk' },
};

export default function Ecommerce() {
  const [cart, setCart] = useState([]);
  const [checkout, setCheckout] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [step, setStep] = useState('shop'); // shop | cart | payment | result

  const addToCart = (product) => {
    setCart(c => {
      const existing = c.find(i => i.id === product.id);
      if (existing) return c.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(c => c.filter(i => i.id !== id));
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/transactions', {
        type: 'PAYMENT',
        amount: total,
        merchant_name: 'FraudShield Store',
        merchant_category: 'retail',
        name_dest: 'M9999999999',
        device_type: 'web',
      });
      setCheckout(res.data);
      setStep('result');
      setCart([]);
    } catch (err) {
      setCheckout({ error: err.response?.data?.error || 'Payment failed' });
      setStep('result');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="page-container fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div className="page-header" style={{ margin: 0 }}>
            <h1>⊡ E-Commerce Simulator</h1>
            <p>Simulate purchases to test real-time fraud detection</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {step !== 'shop' && <button className="btn btn-ghost btn-sm" onClick={() => { setStep('shop'); setCheckout(null); }}>← Back to Shop</button>}
            {step === 'shop' && cartCount > 0 && (
              <button className="btn btn-primary" onClick={() => setStep('cart')}>
                🛒 Cart ({cartCount}) · ${total.toLocaleString()}
              </button>
            )}
          </div>
        </div>

        {step === 'shop' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', background: 'rgba(0,212,255,0.05)', borderRadius: 10, border: '1px solid rgba(0,212,255,0.1)' }}>
              <span style={{ fontSize: 20 }}>🛡️</span>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Every purchase triggers our <strong style={{ color: 'var(--accent)' }}>real-time fraud detection engine</strong> — high-value items and unusual patterns will be flagged or blocked automatically.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {products.map(p => {
                const rc = riskConfig[p.risk];
                const inCart = cart.find(i => i.id === p.id);
                return (
                  <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{
                      height: 120, background: 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 56, position: 'relative',
                    }}>
                      {p.img}
                      <span style={{
                        position: 'absolute', top: 10, right: 10,
                        fontSize: 10, fontWeight: 700, color: rc.color,
                        background: `${rc.color}22`, padding: '2px 6px', borderRadius: 4,
                      }}>{rc.label}</span>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.category}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                          ${p.price.toLocaleString()}
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => addToCart(p)}
                          style={{ fontSize: 12 }}
                        >
                          {inCart ? `+1 (${inCart.qty})` : '+ Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {step === 'cart' && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="card">
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>🛒 Your Cart</h3>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 28 }}>{item.img}</span>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qty: {item.qty}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>${(item.price * item.qty).toLocaleString()}</span>
                    <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontSize: 18, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>${total.toLocaleString()}</span>
              </div>
              {total > 5000 && (
                <div className="alert-strip alert-strip-warning" style={{ marginBottom: 12 }}>
                  ⚠️ High-value order may trigger fraud review
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} onClick={() => setStep('payment')}>
                → Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="card">
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>💳 Payment Details</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                This payment will be analyzed for fraud in real-time
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div className="input-group">
                  <label>Name on Card</label>
                  <input className="input" placeholder="Ahmad Hassan" value={cardForm.name} onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label>Card Number</label>
                  <input className="input" placeholder="4242 4242 4242 4242" maxLength={19} value={cardForm.number} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                    setCardForm(f => ({ ...f, number: val.replace(/(.{4})/g, '$1 ').trim() }));
                  }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label>Expiry</label>
                    <input className="input" placeholder="MM/YY" maxLength={5} value={cardForm.expiry} onChange={e => setCardForm(f => ({ ...f, expiry: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label>CVV</label>
                    <input className="input" placeholder="•••" maxLength={4} type="password" value={cardForm.cvv} onChange={e => setCardForm(f => ({ ...f, cvv: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount due</span>
                <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>${total.toLocaleString()}</span>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
                onClick={handleCheckout}
                disabled={processing}
              >
                {processing ? (
                  <><span className="spinner" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%' }} /> Analyzing for Fraud...</>
                ) : `🔒 Pay $${total.toLocaleString()}`}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              {checkout?.error ? (
                <>
                  <div style={{ fontSize: 60, marginBottom: 16 }}>❌</div>
                  <h3 style={{ color: 'var(--danger)', fontSize: 22, marginBottom: 8 }}>Payment Failed</h3>
                  <p style={{ color: 'var(--text-muted)' }}>{checkout.error}</p>
                </>
              ) : checkout?.fraudAnalysis?.isFraud ? (
                <>
                  <div style={{ fontSize: 60, marginBottom: 16 }}>🚨</div>
                  <h3 style={{ color: 'var(--danger)', fontSize: 22, marginBottom: 8 }}>Transaction Blocked</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Fraud detected — payment was blocked automatically</p>
                  <div style={{ background: 'var(--danger-glow)', border: '1px solid rgba(255,59,107,0.2)', borderRadius: 10, padding: 16, textAlign: 'left' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Fraud Score</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{(checkout.fraudAnalysis.score * 100).toFixed(1)}%</div>
                    {checkout.fraudAnalysis.reason && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{checkout.fraudAnalysis.reason}</div>}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
                  <h3 style={{ color: 'var(--success)', fontSize: 22, marginBottom: 8 }}>Payment Successful</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Your transaction was processed securely</p>
                  <div style={{ background: 'var(--success-glow)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 10, padding: 16, textAlign: 'left' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Risk Score</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{((checkout.fraudAnalysis?.score || 0) * 100).toFixed(1)}%</div>
                    <div style={{ fontSize: 13, color: 'var(--success)', marginTop: 4 }}>Low risk — transaction approved</div>
                  </div>
                </>
              )}
              <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => { setStep('shop'); setCheckout(null); }}>
                ← Return to Shop
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}