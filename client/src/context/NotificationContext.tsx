import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import api from '../utils/api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  resourceId?: string;
  createdAt: string;
  read: boolean;
  userId?: string;
  companyId?: string;
}

interface BadgeCounts {
  suggestions: number;
  explanations: number;
  documents: number;
  announcements: number;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  badgeCounts: BadgeCounts;
  markAsRead: (id: string) => Promise<void>;
  markTypeAsRead: (type: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    suggestions: 0,
    explanations: 0,
    documents: 0,
    announcements: 0
  });

  const calculateBadgeCounts = (notifs: AppNotification[]) => {
    const unread = notifs.filter(n => !n.read);
    setBadgeCounts({
      suggestions: unread.filter(n => n.type === 'SUGGESTION').length,
      explanations: unread.filter(n => n.type === 'EXPLANATION').length,
      documents: unread.filter(n => n.type === 'DOCUMENT').length,
      announcements: unread.filter(n => n.type === 'ANNOUNCEMENT').length,
    });
  };

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n: AppNotification) => !n.read).length);
      calculateBadgeCounts(response.data);
    } catch (error) {
      console.error("Error fetching notifications", error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !user?.companyId) return;

    // Fetch initial notifications
    fetchNotifications();

    // Polling fallback
    const interval = setInterval(fetchNotifications, 30000);

    if (!supabase) return;

    // Supabase Realtime
    const channel = supabase
      .channel(`notifications-${user.companyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'Notification',
        filter: `companyId=eq.${user.companyId}`,
      }, (payload: { new: AppNotification }) => {
        const newNotif = payload.new;
        
        // Only process if for this specific user or global to company
        if (!newNotif.userId || newNotif.userId === user?.id) {
          setNotifications(prev => {
            const updated = [newNotif, ...prev];
            calculateBadgeCounts(updated);
            return updated;
          });
          setUnreadCount(prev => prev + 1);
          
          // Browser Notification
          if ('Notification' in window && window.Notification.permission === 'granted') {
            new window.Notification(newNotif.title, { body: newNotif.message });
          }
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, user?.companyId, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => {
        const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
        calculateBadgeCounts(updated);
        return updated;
      });
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const markTypeAsRead = async (type: string) => {
    try {
      // Find all unread notifications of this type
      const toMark = notifications.filter(n => n.type === type && !n.read);
      if (toMark.length === 0) return;

      await Promise.all(toMark.map(n => api.patch(`/notifications/${n.id}/read`)));
      
      setNotifications(prev => {
        const updated = prev.map(n => n.type === type ? { ...n, read: true } : n);
        calculateBadgeCounts(updated);
        return updated;
      });
      setUnreadCount(prev => Math.max(0, prev - toMark.length));
    } catch (error) {
      console.error("Error marking type as read", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => {
        const notif = prev.find(n => n.id === id);
        if (notif && !notif.read) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        const updated = prev.filter(n => n.id !== id);
        calculateBadgeCounts(updated);
        return updated;
      });
    } catch (error) {
      console.error("Error deleting notification", error);
    }
  };

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      badgeCounts,
      markAsRead, 
      markTypeAsRead,
      deleteNotification, 
      fetchNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

