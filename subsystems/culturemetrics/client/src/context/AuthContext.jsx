import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = sessionStorage.getItem('cm_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .getMe()
      .then((data) => setAdmin(data))
      .catch(() => sessionStorage.removeItem('cm_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authService.login(username, password);
    setAdmin(data.admin);
    return data;
  }, []);

  const connectCultureFrame = useCallback(async (token) => {
    const data = await authService.connectCultureFrame(token);
    setAdmin(data.admin);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setAdmin(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, connectCultureFrame, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
