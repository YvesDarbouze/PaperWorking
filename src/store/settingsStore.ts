import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ═══════════════════════════════════════════════════════
   Settings Store — Notification Preferences & Appearance

   Manages:
   • Per-channel notification toggles (Email / In-App)
   • Theme preference (light / dark / system)
   • Persisted to localStorage via Zustand middleware
   ═══════════════════════════════════════════════════════ */

export type NotificationKey =
  | 'vendorInquiries'
  | 'investorPledges'
  | 'holdingCostWarnings'
  | 'taskAssignments';

export type NotificationChannel = 'email' | 'inApp';

export type ThemePreference = 'light' | 'dark' | 'system';

interface NotificationPreference {
  email: boolean;
  inApp: boolean;
}

interface SettingsState {
  // Notification preferences
  notifications: Record<NotificationKey, NotificationPreference>;

  // Appearance
  theme: ThemePreference;

  // Actions
  toggleNotification: (key: NotificationKey, channel: NotificationChannel) => void;
  setTheme: (theme: ThemePreference) => void;
}

const defaultNotifications: Record<NotificationKey, NotificationPreference> = {
  vendorInquiries:     { email: true,  inApp: true  },
  investorPledges:     { email: true,  inApp: true  },
  holdingCostWarnings: { email: true,  inApp: false },
  taskAssignments:     { email: false, inApp: true  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: defaultNotifications,
      theme: 'dark',

      toggleNotification: (key, channel) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: {
              ...state.notifications[key],
              [channel]: !state.notifications[key][channel],
            },
          },
        })),

      setTheme: (theme) => {
        // Enforce dark theme only
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          root.setAttribute('data-theme', 'dark');
          root.classList.add('dark');
        }
        set({ theme: 'dark' });
      },
    }),
    {
      name: 'pw-settings-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        theme: state.theme,
      }),
    }
  )
);
