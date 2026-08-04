import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ═══════════════════════════════════════════════════════
   Settings Store — Notification Preferences & Appearance
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

export interface SettingsState {
  // Notification preferences
  notifications: Record<NotificationKey, NotificationPreference> & { error?: string };

  // Appearance
  theme: ThemePreference;

  // Sub-state sections for settings pages
  userProfile: { loading?: boolean; data?: any; error?: string };
  billing: { loading?: boolean; data?: any; plan?: string; error?: string };
  team: { loading?: boolean; data?: any; members?: any[]; error?: string };
  workspace: { loading?: boolean; data?: any; error?: string };
  security: { loading?: boolean; data?: any; '2faEnabled'?: boolean; error?: string };
  integrations: { loading?: boolean; data?: any; list?: any[]; error?: string };

  // Actions
  toggleNotification: (key: NotificationKey, channel: NotificationChannel) => void;
  setTheme: (theme: ThemePreference) => void;

  fetchUserProfile: () => Promise<void>;
  fetchBilling: () => Promise<void>;
  fetchTeam: () => Promise<void>;
  fetchWorkspace: () => Promise<void>;
  fetchSecurity: () => Promise<void>;
  fetchIntegrations: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  updateNotifications: (data: any) => Promise<void>;

  changePlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  addPaymentMethod: (pm: any) => Promise<void>;
  removePaymentMethod: (id: string) => Promise<void>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
  disconnectIntegration: (id: string) => Promise<void>;
  updateWorkspace: (data: any) => Promise<void>;
  updateSecurity: (data: any) => Promise<void>;
  scheduleWorkspaceDeletion: () => Promise<void>;
  cancelWorkspaceDeletion: () => Promise<void>;
}

const defaultNotifications: Record<NotificationKey, NotificationPreference> = {
  vendorInquiries:     { email: true,  inApp: true  },
  investorPledges:     { email: true,  inApp: true  },
  holdingCostWarnings: { email: true,  inApp: false },
  taskAssignments:     { email: false, inApp: true  },
};

const noopAsync = async () => {};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notifications: defaultNotifications,
      theme: 'dark',
      userProfile: { loading: false, data: {} },
      billing: { loading: false, data: {}, plan: 'individual' },
      team: { loading: false, data: {}, members: [] },
      workspace: { loading: false, data: {} },
      security: { loading: false, data: {}, '2faEnabled': false },
      integrations: { loading: false, data: {}, list: [] },

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
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          root.setAttribute('data-theme', 'dark');
          root.classList.add('dark');
        }
        set({ theme: 'dark' });
      },

      fetchUserProfile: noopAsync,
      fetchBilling: noopAsync,
      fetchTeam: noopAsync,
      fetchWorkspace: noopAsync,
      fetchSecurity: noopAsync,
      fetchIntegrations: noopAsync,
      fetchNotifications: noopAsync,
      updateNotifications: noopAsync,
      changePlan: noopAsync,
      cancelSubscription: noopAsync,
      reactivateSubscription: noopAsync,
      addPaymentMethod: noopAsync,
      removePaymentMethod: noopAsync,
      setDefaultPaymentMethod: noopAsync,
      disconnectIntegration: noopAsync,
      updateWorkspace: noopAsync,
      updateSecurity: noopAsync,
      scheduleWorkspaceDeletion: noopAsync,
      cancelWorkspaceDeletion: noopAsync,
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
