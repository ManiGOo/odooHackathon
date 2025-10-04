import { createContext, useState, useEffect } from "react";
import api from "../api/api.js";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, role, org_id, ... }
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  // Fetch current user from token
  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (userData, tokenValue) => {
    setUser(userData);
    setToken(tokenValue);
    localStorage.setItem("token", tokenValue);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
    <UserContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}
