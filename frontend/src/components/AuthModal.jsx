import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, forgotPassword, resetPassword } = useAuth();
  const [tab, setTab] = useState('signin'); // 'signin' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('PROCUREMENT_OFFICER');
  const [department, setDepartment] = useState('MoRTH National Highways Division');

  // Forgot password specific states
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  function resetForm() {
    setEmail('');
    setPassword('');
    setName('');
    setRole('PROCUREMENT_OFFICER');
    setDepartment('MoRTH National Highways Division');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setDevCode(null);
    setPreviewUrl(null);
    setForgotStep('request');
    setError(null);
    setSuccessMsg(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (tab === 'register') {
        await register({ name, email, password, role, department });
        resetForm();
        setTab('signin');
        setSuccessMsg('Registration successful! Please sign in with your email and password.');
      } else if (tab === 'signin') {
        await login(email, password);
        handleClose();
      } else if (tab === 'forgot') {
        if (forgotStep === 'request') {
          const res = await forgotPassword(email);
          setForgotStep('verify');
          if (res.devCode) {
            setDevCode(res.devCode);
          }
          if (res.previewUrl) {
            setPreviewUrl(res.previewUrl);
          }
          setSuccessMsg(res.message || 'Verification code sent. Please check your inbox.');
        } else {
          if (newPassword !== confirmPassword) {
            throw new Error('New passwords do not match. Please re-enter.');
          }
          const res = await resetPassword({ email, code: resetCode, newPassword });
          resetForm();
          setTab('signin');
          setSuccessMsg(res.message || 'Password reset successful! Please sign in with your new credentials.');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(demoEmail, demoPass) {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tf-modal-overlay" onClick={handleClose}>
      <div className="tf-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="tf-modal-header">
          <div>
            <div className="tf-modal-title">
              {tab === 'register'
                ? 'Create Portal Account'
                : tab === 'forgot'
                ? 'Reset Your Password'
                : 'Sign In to Sarkari Sugam'}
            </div>
            <div className="tf-modal-sub">
              {tab === 'forgot'
                ? 'Identity verification & credential recovery'
                : 'Official Procurement Session Login'}
            </div>
          </div>
          <button type="button" className="tf-modal-close" onClick={handleClose}>
            &times;
          </button>
        </div>

        {/* 1-Click Demo Login Bar (Only in signin tab) */}
        {tab === 'signin' && (
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
        )}

        {/* Navigation Tabs (signin & register) */}
        {tab !== 'forgot' ? (
          <div className="tf-modal-tabs">
            <button
              type="button"
              className={`tf-modal-tab ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setTab('signin');
                setError(null);
                setPassword('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tf-modal-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setTab('register');
                setError(null);
                setSuccessMsg(null);
                setPassword('');
              }}
            >
              Register
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--tf-text-secondary)' }}>
              Password Recovery Procedure
            </span>
            <button
              type="button"
              className="tf-link-btn"
              onClick={() => {
                setTab('signin');
                setError(null);
                setSuccessMsg(null);
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* REGISTER VIEW */}
          {tab === 'register' && (
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

          {/* EMAIL INPUT (Used in all modes) */}
          {!(tab === 'forgot' && forgotStep === 'verify') && (
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
          )}

          {/* PASSWORD INPUT (Sign In & Register) */}
          {tab !== 'forgot' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="tf-field-key" style={{ margin: 0 }}>Password</label>
                {tab === 'signin' && (
                  <button
                    type="button"
                    className="tf-link-btn"
                    onClick={() => {
                      setTab('forgot');
                      setForgotStep('request');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                className="tf-input"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {/* REGISTER ROLE & DEPT */}
          {tab === 'register' && (
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

          {/* FORGOT PASSWORD: STEP 1 (REQUEST) */}
          {tab === 'forgot' && forgotStep === 'request' && (
            <div className="tf-forgot-note">
              Enter the email address registered with your portal profile. A 6-digit verification code will be generated to authenticate password modification.
            </div>
          )}

          {/* FORGOT PASSWORD: STEP 2 (VERIFY & SET NEW PASSWORD) */}
          {tab === 'forgot' && forgotStep === 'verify' && (
            <>
              <div className="tf-forgot-note">
                Enter the 6-digit code sent for <strong>{email}</strong> and choose your new password.
              </div>

              {devCode && (
                <div style={{ margin: '2px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    className="tf-code-pill"
                    onClick={() => setResetCode(devCode)}
                    title="Click to auto-fill code"
                  >
                    ⚡ Demo Helper: Click to fill code <strong>{devCode}</strong>
                  </button>
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tf-link-btn"
                      style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      📧 View dispatched verification email preview →
                    </a>
                  )}
                </div>
              )}

              <div>
                <label className="tf-field-key">6-Digit Verification Code</label>
                <input
                  type="text"
                  className="tf-input"
                  placeholder="e.g. 123456"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.trim())}
                  required
                />
              </div>

              <div>
                <label className="tf-field-key">New Password</label>
                <input
                  type="password"
                  className="tf-input"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="tf-field-key">Confirm New Password</label>
                <input
                  type="password"
                  className="tf-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* SUCCESS MESSAGE */}
          {successMsg && (
            <div className="tf-success-alert">
              ✓ {successMsg}
            </div>
          )}

          {/* ERROR MESSAGE */}
          {error && (
            <div className="tf-error-alert">
              [Authentication Error] {error}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div style={{ marginTop: '8px' }}>
            <button
              type="submit"
              className="tf-btn tf-btn-orange"
              style={{ width: '100%', padding: '10px' }}
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : tab === 'register'
                ? 'Register Account'
                : tab === 'forgot'
                ? forgotStep === 'request'
                  ? 'Request Verification Code'
                  : 'Update Password & Return to Login'
                : 'Sign In'}
            </button>
          </div>

          {/* BACK TO SIGN IN (in forgot view) */}
          {tab === 'forgot' && (
            <div style={{ textAlign: 'center', marginTop: '-4px' }}>
              <button
                type="button"
                className="tf-link-btn"
                onClick={() => {
                  setTab('signin');
                  setError(null);
                  setSuccessMsg(null);
                }}
              >
                Cancel and return to Sign In
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
