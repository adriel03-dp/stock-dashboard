import React, { createContext, useState, useEffect } from "react";
import { api } from "../utils/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("authToken"));

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (err) {
      localStorage.removeItem("authToken");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, username, password, confirmPassword) => {
    const response = await api.post("/auth/register", {
      email,
      username,
      password,
      confirmPassword
    });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
