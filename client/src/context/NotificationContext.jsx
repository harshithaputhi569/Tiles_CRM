import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const knownIdsRef = useRef(new Set());
  const initialFetchDone = useRef(false);

  const fetchNotifications = useCallback(async (isSilent = true) => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications');
      const list = data.notifications || [];
      const unread = data.unreadCount || 0;

      // Detect new incoming notifications after initial load and show toast alert
      if (initialFetchDone.current) {
        list.forEach((n) => {
          if (!knownIdsRef.current.has(n._id) && n.unread) {
            toast(
              `${n.title}\n${n.message}`,
              {
                icon: n.type === 'complaint' ? '🚨' : '⭐',
                duration: 6000,
                style: {
                  borderRadius: '10px',
                  background: '#1e1b4b',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                },
              }
            );
          }
        });
      }

      list.forEach((n) => knownIdsRef.current.add(n._id));
      initialFetchDone.current = true;

      setNotifications(list);
      setUnreadCount(unread);
    } catch (err) {
      if (!isSilent) console.error('Failed to load notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      knownIdsRef.current.clear();
      initialFetchDone.current = false;
      return;
    }

    fetchNotifications(false);

    // Poll every 15 seconds for real-time alerts
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

    const handleFocus = () => fetchNotifications(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, unread: false, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success('Notification removed');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refresh: () => fetchNotifications(false),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      markAsRead: () => {},
      markAllAsRead: () => {},
      refresh: () => {},
    };
  }
  return context;
};
