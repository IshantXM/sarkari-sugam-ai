import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

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
        const res = await fetch('/api/auth/me', {
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
        await fetch('/api/auth/logout', {
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
    const currentToken = token || localStorage.getItem('ss_auth_token');
    const headers = {
      ...(options.headers || {}),
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      await logout();
      throw new Error('Your session has expired or is unauthorized. Please sign in again.');
    }
    return res;
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
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
    const res = await fetch('/api/auth/register', {
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
    const res = await fetch('/api/auth/forgot-password', {
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
    const res = await fetch('/api/auth/reset-password', {
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
