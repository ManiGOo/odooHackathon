import { createContext, useState, useEffect } from "react";
import api from "../api/api.js";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    token: localStorage.getItem("token") || null,
    role: localStorage.getItem("role") || null,
  });

  const navigate = useNavigate();

  // Optional: validate token on mount
  useEffect(() => {
    if (user.token) {
      // you could ping a /auth/me endpoint to validate
      api.get("/auth/me").catch(() => logout());
    }
  }, []);

  const login = ({ token, role }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    setUser({ token, role });
    navigate("/expenses");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser({ token: null, role: null });
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
