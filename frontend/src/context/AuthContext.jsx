import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
    (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'))
    ? 'https://sarkari-sugam-ai.onrender.com'
    : '')
).replace(/\/+$/, '');

export function apiUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('ss_auth_token') || null);
  const [loading, setLoading] = useState(true);

  // Re-verify session on mount
  useEffect(() => {
    async function checkSession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === 'success' && data.user) {
          setUser(data.user);
        } else {
          logout();
        }
      } catch {
        // Keep cached session if offline
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, [token]);

  // Proper Logout: notifies backend to invalidate JWT in blacklist, clears localStorage and React state
  async function logout() {
    const currentToken = token || localStorage.getItem('ss_auth_token');
    if (currentToken) {
      try {
        await fetch(apiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch (err) {
        console.warn('[AUTH] Server logout notice skipped:', err.message);
      }
    }
    localStorage.removeItem('ss_auth_token');
    setToken(null);
    setUser(null);
  }

  // Centralized authenticated fetch: automatically attaches JWT and handles 401 token invalidation
  async function authFetch(url, options = {}) {
    const fullUrl = apiUrl(url);
    const currentToken = token || localStorage.getItem('ss_auth_token');
    const headers = {
      ...(options.headers || {}),
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
    };

    const res = await fetch(fullUrl, { ...options, headers });
    if (res.status === 401) {
      await logout();
      throw new Error('Your session has expired or is unauthorized. Please sign in again.');
    }
    return res;
  }

  async function login(email, password) {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('ss_auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(userData) {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Auto-login upon successful registration
    if (data.token && data.user) {
      localStorage.setItem('ss_auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  }

  async function forgotPassword(email) {
    const res = await fetch(apiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to request reset code');
    }
    return data;
  }

  async function resetPassword({ email, code, newPassword }) {
    const res = await fetch(apiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to reset password');
    }
    return data;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        forgotPassword,
        resetPassword,
        logout,
        authFetch,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export default AuthContext;
