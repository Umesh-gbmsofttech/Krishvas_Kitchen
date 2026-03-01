import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../services/api';

type AuthState = {
  token: string | null;
  user: any | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
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

  const persistUser = useCallback(async (nextUser: any, nextToken?: string | null) => {
    const pairs: [string, string][] = [['kk_user', JSON.stringify(nextUser)]];
    if (nextToken) pairs.push(['kk_token', nextToken]);
    await AsyncStorage.multiSet(pairs);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    setAuthToken(data.token);
    const profile = await api.myProfile().catch(() => null);
    const mergedUser = profile
      ? { ...data, ...profile, userId: data.userId ?? profile.id, profileImageUrl: profile.profileImageUrl ?? data.profileImageUrl }
      : data;
    setUser(mergedUser);
    await persistUser(mergedUser, data.token);
  }, [persistUser]);

  const signup = useCallback(async (payload: any) => {
    const data = await api.register(payload);
    setToken(data.token);
    setAuthToken(data.token);
    const profile = await api.myProfile().catch(() => null);
    const mergedUser = profile
      ? { ...data, ...profile, userId: data.userId ?? profile.id, profileImageUrl: profile.profileImageUrl ?? data.profileImageUrl }
      : data;
    setUser(mergedUser);
    await persistUser(mergedUser, data.token);
  }, [persistUser]);

  const refreshProfile = useCallback(async () => {
    const profile = await api.myProfile();
    const merged = { ...(user || {}), ...profile, userId: (user?.userId ?? profile.id) };
    setUser(merged);
    await persistUser(merged, token);
  }, [persistUser, token, user]);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.multiRemove(['kk_token', 'kk_user']);
  }, []);

  const value = useMemo(
    () => ({ token, user, ready, login, signup, refreshProfile, logout }),
    [token, user, ready, login, signup, refreshProfile, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
