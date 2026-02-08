// ============================================================
// Notification Store — toast notifications for market events
// ============================================================

import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'new_token' | 'migration' | 'quest_complete' | 'claim' | 'trade';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  icon: string;
  tokenId?: string; // if present, clicking navigates to this token's chart
}

interface NotificationStore {
  notifications: Notification[];
  visibleToasts: Notification[];
  
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

let notifCounter = 0;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  visibleToasts: [],

  addNotification: (notif) => {
    const id = `notif_${++notifCounter}`;
    const notification: Notification = {
      ...notif,
      id,
      timestamp: Date.now(),
      read: false,
    };
    
    set(state => ({
      notifications: [...state.notifications.slice(-49), notification],
      visibleToasts: [...state.visibleToasts.slice(-2), notification], // max 3 visible
    }));
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      get().dismissToast(id);
    }, 4000);
  },

  dismissToast: (id) => {
    set(state => ({
      visibleToasts: state.visibleToasts.filter(n => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [], visibleToasts: [] });
  },
}));
