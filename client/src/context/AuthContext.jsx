// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "token";

const AuthCtx = createContext(null);

export function useAuth() {
  return useContext(AuthCtx);
}

export default function AuthProvider({ children }) {
  // Load token immediately from localStorage (prevents flicker)
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [initializing, setInitializing] = useState(true);

  // Finish initialization on mount (in case you want to do async checks later)
  useEffect(() => {
    setInitializing(false);
  }, []);

  // Keep tabs/windows in sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setToken(e.newValue || "");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = (t) => {
    setToken(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  const logout = () => {
    setToken("");
    localStorage.removeItem(STORAGE_KEY);
  };

  // Convenience: build Authorization header
  const authHeader = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const value = useMemo(
    () => ({ token, login, logout, initializing, authHeader }),
    [token, initializing]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
