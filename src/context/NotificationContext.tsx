import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
let notificationsModule: any = null;
let notificationsConfigured = false;

const getNotificationsModule = async () => {
  if (isExpoGo) return null;
  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
  }
  if (!notificationsConfigured) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });
    notificationsConfigured = true;
  }
  return notificationsModule;
};

type NotificationContextType = {
  items: any[];
  unread: number;
  refresh: () => Promise<void>;
  pushLocal: (title: string, body: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) {
      setItems([]);
      setUnread(0);
      return;
    }
    try {
      const [list, count] = await Promise.all([api.notifications(), api.unreadCount()]);
      setItems(list || []);
      setUnread(count?.count ?? 0);
    } catch {
      // ignore until auth ready
    }
  }, [token]);

  const pushLocal = useCallback(async (title: string, body: string) => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  }, []);

  useEffect(() => {
    getNotificationsModule().catch(() => {});
    refresh().catch(() => {});
  }, [refresh]);

  const value = useMemo(() => ({ items, unread, refresh, pushLocal }), [items, unread, refresh, pushLocal]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
