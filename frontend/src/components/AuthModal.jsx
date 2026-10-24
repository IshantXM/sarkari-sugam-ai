import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('PROCUREMENT_OFFICER');
  const [department, setDepartment] = useState('MoRTH National Highways Division');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register({ name, email, password, role, department });
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(demoEmail, demoPass) {
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tf-modal-overlay" onClick={onClose}>
      <div className="tf-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="tf-modal-header">
          <div>
            <div className="tf-modal-title">
              {isRegister ? 'Create Portal Account' : 'Sign In to Sarkari Sugam'}
            </div>
            <div className="tf-modal-sub">
              Secure RBAC Auth backed by MongoDB (localhost:27017)
            </div>
          </div>
          <button type="button" className="tf-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* 1-Click Demo Login Bar */}
        <div className="tf-demo-login-box">
          <div className="tf-demo-login-label">Quick 1-Click Demo Logins for Judges</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="tf-demo-btn officer"
              onClick={() => handleDemoLogin('ishantmohan045@gmail.com', 'sugam123')}
              disabled={loading}
            >
              <span style={{ fontWeight: '700' }}>Officer Ishant</span>
              <span style={{ fontSize: '10px', opacity: 0.85 }}>Procurement Authority</span>
            </button>

            <button
              type="button"
              className="tf-demo-btn vendor"
              onClick={() => handleDemoLogin('vendor@infra-bidder.in', 'sugam123')}
              disabled={loading}
            >
              <span style={{ fontWeight: '700' }}>EPC Consortium</span>
              <span style={{ fontSize: '10px', opacity: 0.85 }}>Verified Bidder</span>
            </button>
          </div>
        </div>

        <div className="tf-modal-tabs">
          <button
            type="button"
            className={`tf-modal-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tf-modal-tab ${isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegister && (
            <div>
              <label className="tf-field-key">Full Name</label>
              <input
                type="text"
                className="tf-input"
                placeholder="e.g. Ishant Mohan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="tf-field-key">Official Email</label>
            <input
              type="email"
              className="tf-input"
              placeholder="officer@nic.in or email@org.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="tf-field-key">Password</label>
            <input
              type="password"
              className="tf-input"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="tf-field-key">Portal Role</label>
                <select
                  className="tf-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="PROCUREMENT_OFFICER">Procurement Officer (Govt)</option>
                  <option value="BIDDER_VENDOR">Verified Bidder / Contractor</option>
                  <option value="AUDITOR">Public Oversight Auditor</option>
                </select>
              </div>

              <div>
                <label className="tf-field-key">Department / Organization</label>
                <input
                  type="text"
                  className="tf-input"
                  placeholder="e.g. MoRTH / CPWD / NHAI"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <div className="tf-error-alert">
              [Authentication Error] {error}
            </div>
          )}

          <div style={{ marginTop: '8px' }}>
            <button
              type="submit"
              className="tf-btn tf-btn-orange"
              style={{ width: '100%', padding: '10px' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : isRegister ? 'Create Account & Sign In' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
