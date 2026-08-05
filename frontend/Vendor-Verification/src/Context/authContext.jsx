import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import api from "../Services/api"

// const API_URL = import.meta.env.VITE_API_URL;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check login status on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await axios.get(`/api/me`, {
        withCredentials: true,
      });

      setIsAuthenticated(true);
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await axios.post(
        `${API_URL}/api/logout`,
        {},
        {
          withCredentials: true,
        }
      );
    } catch (err) {
      console.log(err);
    }

    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);