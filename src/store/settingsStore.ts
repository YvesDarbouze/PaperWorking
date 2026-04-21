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
      theme: 'light',

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
        // Apply data-theme attribute for CSS variable switching
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          if (theme === 'system') {
            root.removeAttribute('data-theme');
          } else {
            root.setAttribute('data-theme', theme);
          }
        }
        set({ theme });
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
