import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../services/api';

type AuthState = {
  token: string | null;
  user: any | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = await AsyncStorage.getItem('kk_token');
      const storedUser = await AsyncStorage.getItem('kk_user');
      if (storedToken) {
        setToken(storedToken);
        setAuthToken(storedToken);
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setReady(true);
    };
    bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    setUser(data);
    setAuthToken(data.token);
    await AsyncStorage.multiSet([
      ['kk_token', data.token],
      ['kk_user', JSON.stringify(data)],
    ]);
  };

  const signup = async (payload: any) => {
    const data = await api.register(payload);
    setToken(data.token);
    setUser(data);
    setAuthToken(data.token);
    await AsyncStorage.multiSet([
      ['kk_token', data.token],
      ['kk_user', JSON.stringify(data)],
    ]);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.multiRemove(['kk_token', 'kk_user']);
  };

  const value = useMemo(() => ({ token, user, ready, login, signup, logout }), [token, user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
