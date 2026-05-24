import { create } from 'zustand';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import type { NotificationCategory, CategoryPreference } from '@/types/user';

/* ═══════════════════════════════════════════════════════
   Notification Preferences Store
   
   Manages:
   • Granular per-category preference toggles (inbox, email, push)
   • Global email and push notification opt-out controls
   • Timezone-aware quiet hours DND window
   • Real-time or optimistic synchronization with Firestore /users/{uid}
   ═══════════════════════════════════════════════════════ */

interface NotificationPreferencesState {
  loading: boolean;
  saving: boolean;
  categories: Record<NotificationCategory, CategoryPreference>;
  emailEnabled: boolean;
  pushEnabled: boolean;
  autoArchiveDays: number;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  
  // Actions
  loadPreferences: (userId: string) => Promise<void>;
  updateCategoryPreference: (userId: string, category: NotificationCategory, channel: keyof CategoryPreference, enabled: boolean) => Promise<void>;
  updateGlobalToggle: (userId: string, channel: 'email' | 'push', enabled: boolean) => Promise<void>;
  updateQuietHours: (userId: string, updates: Partial<NotificationPreferencesState['quietHours']>) => Promise<void>;
  updateAutoArchiveDays: (userId: string, days: number) => Promise<void>;
}

export const DEFAULT_CATEGORY_PREFERENCES: Record<NotificationCategory, CategoryPreference> = {
  syndication: { inbox: true, email: true, push: true },
  bids: { inbox: true, email: true, push: false },
  tasks: { inbox: true, email: true, push: false },
  deadlines: { inbox: true, email: true, push: true },
  billing: { inbox: true, email: true, push: false },
  alerts: { inbox: true, email: true, push: true },
};

export const useNotificationPreferencesStore = create<NotificationPreferencesState>((set, get) => ({
  loading: false,
  saving: false,
  categories: DEFAULT_CATEGORY_PREFERENCES,
  emailEnabled: true,
  pushEnabled: true,
  autoArchiveDays: 30,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York',
  },

  loadPreferences: async (userId: string) => {
    set({ loading: true });
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const prefs = data.preferences;
        
        // Merge user preferences with system default templates
        const mergedCategories = { ...DEFAULT_CATEGORY_PREFERENCES };
        if (prefs?.categories) {
          Object.keys(DEFAULT_CATEGORY_PREFERENCES).forEach((catKey) => {
            const cat = catKey as NotificationCategory;
            if (prefs.categories[cat]) {
              mergedCategories[cat] = {
                inbox: prefs.categories[cat].inbox !== false,
                email: prefs.categories[cat].email !== false,
                push: prefs.categories[cat].push !== false,
              };
            }
          });
        }
        
        // Enforce billing and deadlines cannot be disabled (critical billing/security guardrails)
        mergedCategories.billing.inbox = true;
        mergedCategories.billing.email = true;
        mergedCategories.deadlines.inbox = true;
        mergedCategories.deadlines.email = true;

        set({
          categories: mergedCategories,
          emailEnabled: prefs?.emailEnabled !== false,
          pushEnabled: prefs?.pushEnabled !== false,
          autoArchiveDays: Number(prefs?.autoArchiveDays) || 30,
          quietHours: {
            enabled: prefs?.quietHours?.enabled === true,
            start: prefs?.quietHours?.start || '22:00',
            end: prefs?.quietHours?.end || '08:00',
            timezone: prefs?.quietHours?.timezone || (typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York') || 'America/New_York',
          },
        });
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    } finally {
      set({ loading: false });
    }
  },

  updateCategoryPreference: async (userId: string, category: NotificationCategory, channel: keyof CategoryPreference, enabled: boolean) => {
    // Guardrail: Prevent disabling critical billing or deadlines for inbox/email
    if ((category === 'billing' || category === 'deadlines') && (channel === 'inbox' || channel === 'email') && !enabled) {
      return;
    }

    set({ saving: true });
    
    // Optimistic update
    const previousCategories = get().categories;
    const nextCategories = {
      ...previousCategories,
      [category]: {
        ...previousCategories[category],
        [channel]: enabled,
      },
    };

    set({ categories: nextCategories });

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        [`preferences.categories.${category}.${channel}`]: enabled,
      });
    } catch (err) {
      console.error('Failed to update category preference:', err);
      // Rollback to previous state on failure
      set({ categories: previousCategories });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  updateGlobalToggle: async (userId: string, channel: 'email' | 'push', enabled: boolean) => {
    set({ saving: true });
    
    const key = channel === 'email' ? 'emailEnabled' : 'pushEnabled';
    const previousVal = get()[key === 'emailEnabled' ? 'emailEnabled' : 'pushEnabled'];
    
    set({ [key]: enabled } as any);

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        [`preferences.${key}`]: enabled,
      });
    } catch (err) {
      console.error(`Failed to update global ${channel} toggle:`, err);
      // Rollback
      set({ [key]: previousVal } as any);
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  updateQuietHours: async (userId: string, updates: Partial<NotificationPreferencesState['quietHours']>) => {
    set({ saving: true });

    const previousQuietHours = get().quietHours;
    const nextQuietHours = {
      ...previousQuietHours,
      ...updates,
    };

    set({ quietHours: nextQuietHours });

    try {
      const userRef = doc(db, 'users', userId);
      const updatePayload: Record<string, any> = {};
      
      if (updates.enabled !== undefined) updatePayload['preferences.quietHours.enabled'] = updates.enabled;
      if (updates.start !== undefined) updatePayload['preferences.quietHours.start'] = updates.start;
      if (updates.end !== undefined) updatePayload['preferences.quietHours.end'] = updates.end;
      if (updates.timezone !== undefined) updatePayload['preferences.quietHours.timezone'] = updates.timezone;

      await updateDoc(userRef, updatePayload);
    } catch (err) {
      console.error('Failed to update quiet hours:', err);
      // Rollback
      set({ quietHours: previousQuietHours });
      throw err;
    } finally {
      set({ saving: false });
    }
  },
  
  updateAutoArchiveDays: async (userId: string, days: number) => {
    set({ saving: true });
    const previousDays = get().autoArchiveDays;
    set({ autoArchiveDays: days });
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'preferences.autoArchiveDays': days,
      });
    } catch (err) {
      console.error('Failed to update autoArchiveDays:', err);
      set({ autoArchiveDays: previousDays });
      throw err;
    } finally {
      set({ saving: false });
    }
  },
}));
