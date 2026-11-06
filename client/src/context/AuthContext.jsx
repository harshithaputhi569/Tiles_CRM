import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tileshow_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('tileshow_token', data.token);
      localStorage.setItem('tileshow_user', JSON.stringify(data));
      setUser(data);
      return { success: true, role: data.role };
    } catch (err) {
      if (!err.response) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        return {
          success: false,
          message: isLocal
            ? 'Backend server is not running on port 5000. Please start the server.'
            : 'Connecting to backend... If the server was idle, please wait ~30 seconds for Render to wake up and try again.'
        };
      }
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('tileshow_token');
    localStorage.removeItem('tileshow_user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
