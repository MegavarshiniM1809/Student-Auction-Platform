import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotifContext = createContext(null);

export const NotifProvider = ({ children }) => {
  const { user } = useAuth();
  const { on } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const browserPermission = useRef(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (_) {}
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket: real-time push
  useEffect(() => {
    if (!user) return;
    const cleanup = on('notification', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
      // Browser notification
      if (
        browserPermission.current === 'granted' &&
        user.notificationPreference?.browser
      ) {
        new Notification('CampusBid', {
          body: notif.message,
          icon: '/favicon.ico',
        });
      }
    });
    return cleanup;
  }, [user, on]);

  const markRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  const enableBrowserNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    const result = await Notification.requestPermission();
    browserPermission.current = result;
    if (result === 'granted') {
      await api.patch('/auth/profile', {
        notificationPreference: { inApp: true, browser: true },
      });
    }
    return result;
  }, []);

  return (
    <NotifContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markRead,
        markAllRead,
        enableBrowserNotifications,
        browserPermission: browserPermission.current,
      }}
    >
      {children}
    </NotifContext.Provider>
  );
};

export const useNotif = () => useContext(NotifContext);
