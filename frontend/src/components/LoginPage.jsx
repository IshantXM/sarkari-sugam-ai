import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

// Sarkari Sugam Logo Emblem (Orange Seal)
function SarkariSugamLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#EA580C" />
      <circle cx="14" cy="14" r="8.5" stroke="#FFFFFF" strokeWidth="1.8" strokeDasharray="2 1.5" />
      <circle cx="14" cy="14" r="4.2" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="1.8" fill="#FFFFFF" />
      <path d="M14 3.5V6.5M14 21.5V24.5M3.5 14H6.5M21.5 14H24.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Eye toggle icon
function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// Right-side Vector Illustration matching the reference photo
function ProcurementHeroIllustration() {
  return (
    <svg
      className="tf-illustration-svg"
      viewBox="0 0 540 540"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="monitorGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
      </defs>

      {/* ---------------- BACKGROUND FLOATING DOODLES & ICONS ---------------- */}

      {/* 1. Info Bubble ( i ) */}
      <g transform="translate(60, 55)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none">
        <rect x="0" y="0" width="38" height="34" rx="10" />
        <path d="M19 12v9M19 7v1" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M8 34l-5 5v-5h5" />
      </g>

      {/* 2. Headphones Icon */}
      <g transform="translate(200, 48)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none">
        <path d="M10 24c0-11 9-20 20-20s20 9 20 20v8a4 4 0 0 1-4 4h-4v-12h8" strokeLinecap="round" />
        <rect x="6" y="24" width="8" height="12" rx="3" fill="rgba(255,255,255,0.15)" />
        <rect x="46" y="24" width="8" height="12" rx="3" fill="rgba(255,255,255,0.15)" />
      </g>

      {/* 3. Three-dots Chat Bubble */}
      <g transform="translate(390, 68)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none">
        <path d="M36 18c0 8.8-9 16-20 16-3 0-6-.5-8.5-1.5L0 36l2-7C.7 26 0 22 0 18 0 9.2 9 2 20 2s20 7.2 20 16z" />
        <circle cx="12" cy="18" r="1.5" fill="rgba(255,255,255,0.85)" stroke="none" />
        <circle cx="20" cy="18" r="1.5" fill="rgba(255,255,255,0.85)" stroke="none" />
        <circle cx="28" cy="18" r="1.5" fill="rgba(255,255,255,0.85)" stroke="none" />
      </g>

      {/* 4. Smartphone with user profile */}
      <g transform="translate(145, 128)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none">
        <rect x="0" y="0" width="30" height="48" rx="6" />
        <line x1="10" y1="4" x2="20" y2="4" strokeLinecap="round" />
        {/* User avatar inside phone */}
        <circle cx="15" cy="20" r="5" fill="rgba(255,255,255,0.2)" />
        <path d="M8 32c0-4 3.5-6 7-6s7 2 7 6" />
      </g>

      {/* 5. Laptop with phone handset symbol */}
      <g transform="translate(290, 126)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none">
        <rect x="8" y="0" width="40" height="28" rx="4" />
        <path d="M0 28h56l-3 4H3l-3-4z" fill="rgba(255,255,255,0.12)" />
        {/* Telephone icon inside */}
        <path d="M22 10c0 4 3 7 7 7l2-2c.4-.4 1-.4 1.4 0l3 3c.4.4.4 1 0 1.4l-2 2c-1.5 1.5-6-1-9.5-4.5s-6-8-4.5-9.5l2-2c.4-.4 1-.4 1.4 0l3 3c.4.4.4 1 0 1.4l-2 2z" strokeWidth="1.2" />
      </g>

      {/* 6. 24/7 Monitoring Globe */}
      <g transform="translate(38, 140)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" fill="none">
        <circle cx="34" cy="34" r="28" />
        <ellipse cx="34" cy="34" rx="14" ry="28" />
        <line x1="6" y1="34" x2="62" y2="34" />
        {/* (24) Badge overlay */}
        <circle cx="34" cy="34" r="14" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1.5" />
        <text x="34" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">24</text>
      </g>

      {/* 7. Corrigendum Envelope */}
      <g transform="translate(68, 230)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" fill="none">
        <rect x="0" y="0" width="38" height="26" rx="4" />
        <path d="M0 0l19 15L38 0" />
      </g>

      {/* 8. Hand offering tender/document */}
      <g transform="translate(370, 185)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" fill="none">
        <path d="M0 16c6-4 16-6 26-6h14c3 0 5 2 5 5s-2 5-6 6l-10 2-8 3-12 1" strokeLinecap="round" />
        <path d="M22 6l-6 10" />
        <text x="18" y="-6" fill="rgba(255,255,255,0.8)" fontSize="16" fontWeight="bold">?</text>
      </g>

      {/* 9. Concentric circles with dots */}
      <g transform="translate(390, 275)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none">
        <circle cx="16" cy="16" r="12" />
        <circle cx="16" cy="16" r="6" />
        <circle cx="36" cy="16" r="4" fill="rgba(255,255,255,0.85)" stroke="none" />
        <circle cx="48" cy="16" r="3" fill="rgba(255,255,255,0.6)" stroke="none" />
      </g>

      {/* Tiny scatter doodles (+, x, o, ~) */}
      <text x="120" y="70" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="sans-serif">×</text>
      <text x="175" y="65" fill="rgba(255,255,255,0.5)" fontSize="12" fontFamily="sans-serif">+</text>
      <text x="320" y="60" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="sans-serif">×</text>
      <text x="350" y="80" fill="rgba(255,255,255,0.5)" fontSize="12" fontFamily="sans-serif">○</text>
      <text x="180" y="115" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="sans-serif">×</text>
      <text x="250" y="115" fill="rgba(255,255,255,0.4)" fontSize="12" fontFamily="sans-serif">○</text>
      <text x="360" y="135" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="sans-serif">×</text>
      <text x="430" y="145" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="sans-serif">+</text>
      <text x="440" y="210" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="sans-serif">×</text>
      <text x="420" y="240" fill="rgba(255,255,255,0.4)" fontSize="12" fontFamily="sans-serif">○</text>
      <text x="345" y="260" fill="rgba(255,255,255,0.5)" fontSize="14" fontFamily="sans-serif">×</text>
      <text x="80" y="185" fill="rgba(255,255,255,0.4)" fontSize="12" fontFamily="sans-serif">+</text>

      {/* ---------------- FOREGROUND: MONITOR & ASSISTANT ---------------- */}

      {/* Background pill/halo around monitor */}
      <rect x="40" y="295" width="460" height="70" rx="35" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" fill="none" />

      {/* Verified Seal Badge (Circular checkmark on the left) */}
      <g transform="translate(45, 302)">
        <circle cx="28" cy="28" r="24" fill="#FFFFFF" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.12))" />
        <path d="M19 28l6 6 13-13" stroke="#EA580C" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Computer Monitor Base & Stand */}
      <path d="M220 460h100l8 45h-116z" fill="rgba(255,255,255,0.45)" />
      <rect x="180" y="500" width="180" height="12" rx="6" fill="#FFFFFF" opacity="0.9" />

      {/* Monitor Outer Frame & Bezel */}
      <rect x="100" y="210" width="340" height="255" rx="18" fill="#0F172A" stroke="#1E293B" strokeWidth="4" />
      {/* Screen area */}
      <rect x="110" y="220" width="320" height="235" rx="10" fill="url(#monitorGlow)" />

      {/* Wavy line decor breaking out of monitor */}
      <path d="M50 420c15 5 25-5 40 0s20 5 35 0" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M410 355c15 5 25-5 40 0s20 5 35 0" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M380 470c10 5 18-5 28 0s14 5 24 0" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* ---------------- ASSISTANT CHARACTER ---------------- */}
      <g id="assistant">
        {/* Hair back / silhouette */}
        <path
          d="M230 245c-20 0-45 15-45 42 0 18 10 32 20 42-12 18-18 36-16 54 2 2 12 4 20 0 1-10 6-22 14-30 4-4 12-8 18-12 20-14 36-32 38-56 2-25-18-40-49-40z"
          fill="#09090b"
        />

        {/* Neck */}
        <rect x="235" y="325" width="22" height="30" fill="#FFFFFF" />

        {/* Head / Face */}
        <path
          d="M232 265c-14 0-25 12-25 28 0 16 11 28 25 28s25-12 25-28c0-16-11-28-25-28z"
          fill="#FFFFFF"
        />

        {/* Hair front / bangs */}
        <path
          d="M210 280c5-10 16-18 28-18 14 0 24 8 26 18-4-4-10-6-16-6-12 0-26 8-38 6z"
          fill="#09090b"
        />

        {/* Headset Band */}
        <path
          d="M222 262c6-3 14-4 22-3 8 1 15 5 19 12"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Headset Earpiece */}
        <ellipse cx="255" cy="285" rx="5" ry="8" fill="#09090b" stroke="#FFFFFF" strokeWidth="1.5" />
        {/* Microphone boom curving toward mouth */}
        <path
          d="M255 289c0 8-8 16-16 17"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="238" cy="306" r="2.5" fill="#EA580C" />

        {/* Body / Top (Corporate Attire in Brand Tone) */}
        <path
          d="M190 355c-15 15-28 42-30 95h165c-2-53-15-80-30-95-12 18-25 24-52 24s-41-6-53-24z"
          fill="url(#bodyGrad)"
        />

        {/* White shirt collar line */}
        <path
          d="M235 350l12 18 12-18"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Hand making OK sign 👌 */}
        <g id="hand-ok" transform="translate(175, 305)">
          {/* White sleeve/arm coming up */}
          <path d="M3 140c-2-35 8-65 14-90 4-15 8-22 14-25 5-2 9 2 9 8 0 20-5 65-2 107" fill="#FFFFFF" />

          {/* Thumb & Index forming the circle of OK */}
          <ellipse cx="28" cy="34" rx="8" ry="9" fill="#09090b" />
          <circle cx="28" cy="34" r="5" fill="#FFFFFF" />

          {/* Extended Three Fingers (Middle, Ring, Pinky) */}
          {/* Middle Finger */}
          <path d="M19 32V8a4 4 0 0 1 8 0v20" fill="#FFFFFF" stroke="#09090b" strokeWidth="1.5" />
          {/* Ring Finger */}
          <path d="M12 36V14a3.5 3.5 0 0 1 7 0v18" fill="#FFFFFF" stroke="#09090b" strokeWidth="1.5" />
          {/* Pinky Finger */}
          <path d="M6 42V22a3 3 0 0 1 6 0v18" fill="#FFFFFF" stroke="#09090b" strokeWidth="1.5" />

          {/* Palm base */}
          <path d="M10 38c0 10 12 18 20 18s12-8 12-18-6-14-14-14-18 4-18 14z" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );
}

export default function LoginPage({
  isOpen = true,
  onClose,
  initialTab = 'signin',
  embedded = false,
}) {
  const { login, register, forgotPassword, resetPassword } = useAuth();
  const [tab, setTab] = useState(initialTab); // 'signin' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password specific states
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  function resetForm() {
    setEmail('');
    setPassword('');
    setName('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setPreviewUrl(null);
    setForgotStep('request');
    setError(null);
    setSuccessMsg(null);
  }

  function handleClose() {
    resetForm();
    if (onClose) onClose();
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (tab === 'register') {
        await register({ name, email, password });
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



  return (
    <div className={`tf-login-split-page ${embedded ? 'embedded' : ''}`}>
      {/* ================= LEFT COLUMN: FORM ================= */}
      <div className="tf-login-left-col">
        {/* Top bar with Logo & Brand Name */}
        <div className="tf-login-top-bar">
          <div className="tf-login-brand-link" onClick={() => handleClose()}>
            <SarkariSugamLogo />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="tf-login-brand-title">Sarkari Sugam</span>
              <span className="tf-login-brand-tag">AI Console</span>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              className="tf-login-back-btn"
              onClick={handleClose}
              title="Return to Dashboard"
            >
              <span>&larr;</span>
              <span>Back to Console</span>
            </button>
          )}
        </div>

        {/* Center Main Form Area */}
        <div className="tf-login-center-box">
          {/* Header Title & Subtitle */}
          <h1 className="tf-login-heading">
            {tab === 'register'
              ? 'Create an account'
              : tab === 'forgot'
              ? 'Reset your password'
              : 'Welcome back'}
          </h1>
          <p className="tf-login-subtitle">
            {tab === 'register'
              ? 'Enter your details to create your procurement identity'
              : tab === 'forgot'
              ? 'Enter your registered email to receive a verification code'
              : 'Please enter your details'}
          </p>



          {/* Form */}
          <form onSubmit={handleSubmit} className="tf-login-form">
            {/* REGISTER MODE: Full Name */}
            {tab === 'register' && (
              <div className="tf-login-field-group">
                <label className="tf-login-label">Full Name</label>
                <input
                  type="text"
                  className="tf-login-input"
                  placeholder="e.g. Ishant Mohan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* EMAIL INPUT (Sign In, Register, & Forgot Step 1) */}
            {!(tab === 'forgot' && forgotStep === 'verify') && (
              <div className="tf-login-field-group">
                <label className="tf-login-label">Email address</label>
                <input
                  type="email"
                  className="tf-login-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {/* PASSWORD INPUT (Sign In & Register) */}
            {tab !== 'forgot' && (
              <div className="tf-login-field-group">
                <label className="tf-login-label">Password</label>
                <div className="tf-login-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="tf-login-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="tf-login-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>
            )}



            {/* FORGOT PASSWORD STEP 2: Verification Code & New Password */}
            {tab === 'forgot' && forgotStep === 'verify' && (
              <>
                {previewUrl && (
                  <div style={{ marginBottom: '8px' }}>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: 'var(--tf-blue)',
                        marginTop: '4px',
                        textDecoration: 'none',
                      }}
                    >
                      📧 View dispatched test email &rarr;
                    </a>
                  </div>
                )}

                <div className="tf-login-field-group">
                  <label className="tf-login-label">6-Digit Verification Code</label>
                  <input
                    type="text"
                    className="tf-login-input"
                    placeholder="e.g. 123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.trim())}
                    required
                  />
                </div>

                <div className="tf-login-field-group">
                  <label className="tf-login-label">New Password</label>
                  <input
                    type="password"
                    className="tf-login-input"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="tf-login-field-group">
                  <label className="tf-login-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="tf-login-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* OPTIONS ROW (Remember for 30 days & Forgot Password - exact match to photo) */}
            {tab === 'signin' && (
              <div className="tf-login-options-row">
                <label className="tf-remember-label">
                  <input
                    type="checkbox"
                    className="tf-remember-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember for 30 days</span>
                </label>
                <button
                  type="button"
                  className="tf-forgot-btn"
                  onClick={() => {
                    setTab('forgot');
                    setForgotStep('request');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                >
                  Forgot password
                </button>
              </div>
            )}

            {/* ALERTS */}
            {error && (
              <div className="tf-login-alert error">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="tf-login-alert success">
                <span>✓</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* PRIMARY SUBMIT BUTTON */}
            <button
              type="submit"
              className="tf-login-submit-btn"
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : tab === 'register'
                ? 'Sign up'
                : tab === 'forgot'
                ? forgotStep === 'request'
                  ? 'Send Verification Code'
                  : 'Reset Password'
                : 'Sign in'}
            </button>

            {/* (NOTE: Google sign-in removed as explicitly requested) */}

            {/* BOTTOM NAVIGATION ROW */}
            <div className="tf-login-bottom-row">
              {tab === 'signin' && (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="tf-login-switch-btn"
                    onClick={() => {
                      setTab('register');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                  >
                    Sign up
                  </button>
                </span>
              )}

              {tab === 'register' && (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="tf-login-switch-btn"
                    onClick={() => {
                      setTab('signin');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                  >
                    Sign in
                  </button>
                </span>
              )}

              {tab === 'forgot' && (
                <button
                  type="button"
                  className="tf-login-switch-btn"
                  onClick={() => {
                    setTab('signin');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                >
                  &larr; Back to Sign in
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Left Column Footer */}
        <div className="tf-login-left-footer">
          <span>&copy; 2026 Sarkari Sugam AI &bull; Procurement Security</span>
          <span>eProcure &bull; GeM &bull; CPPP</span>
        </div>
      </div>

      {/* ================= RIGHT COLUMN: HERO ARTWORK ================= */}
      <div className="tf-login-right-col">
        <div className="tf-illustration-container">
          <ProcurementHeroIllustration />

          <div className="tf-illustration-caption">
            <h2 className="tf-illustration-title">
              Sarkari Sugam AI Intelligence
            </h2>
            <p className="tf-illustration-desc">
              Autonomous RFP discovery, session-gated portal extraction, and 24/7 Corrigendum Watchdog across Indian procurement networks.
            </p>

            <div className="tf-illustration-badges">
              <span className="tf-illustration-badge">&check; 24/7 Live Watchdog</span>
              <span className="tf-illustration-badge">&check; Gated Auth Automation</span>
              <span className="tf-illustration-badge">&check; Instant RFP Diffs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
