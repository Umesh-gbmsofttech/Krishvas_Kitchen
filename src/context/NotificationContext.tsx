import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

type NotificationContextType = {
  items: any[];
  unread: number;
  refresh: () => Promise<void>;
  pushLocal: (title: string, body: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = async () => {
    try {
      const [list, count] = await Promise.all([api.notifications(), api.unreadCount()]);
      setItems(list || []);
      setUnread(count?.count ?? 0);
    } catch {
      // ignore until auth ready
    }
  };

  const pushLocal = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(() => ({ items, unread, refresh, pushLocal }), [items, unread]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
