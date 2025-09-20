import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import apiService from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, sponsor_code: string, first_name?: string, last_name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const { user } = await apiService.getMe();
      setUser(user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user } = await apiService.login(email, password);
      setUser(user);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user } = await apiService.adminLogin(email, password);
      setUser(user);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    sponsor_code: string,
    first_name?: string,
    last_name?: string
  ) => {
    setLoading(true);
    try {
      const { user } = await apiService.register(email, password, sponsor_code, first_name, last_name);
      setUser(user);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshMe = async () => {
    await loadMe();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, adminLogin, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};