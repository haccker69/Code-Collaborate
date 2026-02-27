/**
 * @file AuthContext.jsx
 * @description Global auth state. Provides user, login, logout, register.
 * Wrap the entire app with <AuthProvider> in main.jsx.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as authApi from "../api/authApi";
import { tokenStorage } from "../utils/tokenStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while checking stored token

  // ── Bootstrap: check if we already have a valid token ─────────────
  useEffect(() => {
    async function restoreSession() {
      if (!tokenStorage.exists()) { setLoading(false); return; }
      try {
        const { user } = await authApi.getMe();
        setUser(user);
      } catch {
        // Token expired or invalid — clear it
        tokenStorage.clear();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  /**
   * @param {{ email: string, password: string }} credentials
   */
  const login = useCallback(async (credentials) => {
    const { user, token } = await authApi.login(credentials);
    tokenStorage.set(token);
    setUser(user);
  }, []);

  /**
   * @param {{ username: string, email: string, password: string }} data
   */
  const register = useCallback(async (data) => {
    const { user, token } = await authApi.register(data);
    tokenStorage.set(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * @returns {{ user: object|null, loading: boolean, login: Function, logout: Function, register: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
