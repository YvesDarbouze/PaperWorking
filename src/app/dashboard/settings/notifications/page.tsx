'use client';

import { useSettingsStore } from '@/store/settingsStore';
import { useNotificationPreferencesStore, DEFAULT_CATEGORY_PREFERENCES } from '@/store/notificationPreferencesStore';
import { Bell, Mail, MessageSquare, Shield, Clock, Lock, Check, Sun, Moon, Monitor, Smartphone, AlertCircle, Info, Download, Trash2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import type { NotificationCategory, CategoryPreference } from '@/types/user';

/* ═══════════════════════════════════════════════════════
   Granular Notification & Appearance Settings UI
   ═══════════════════════════════════════════════════════ */

const CATEGORY_ROWS: {
  key: NotificationCategory;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}[] = [
  {
    key: 'syndication',
    label: 'Syndication & Investing',
    description: 'Syndication invites, pledge status updates, and LOI commitments.',
    icon: Bell
  },
  {
    key: 'bids',
    label: 'Contractor & Vendor Bids',
    description: 'New bids submitted, quote changes, and project job inquiries.',
    icon: MessageSquare
  },
  {
    key: 'tasks',
    label: 'Tasks & Collaboration',
    description: 'Task assignments, document sign-offs, and team invitations.',
    icon: Check
  },
  {
    key: 'deadlines',
    label: 'Contingency Deadlines',
    description: 'Critical alerts for expiring contract contingencies (Mandatory).',
    icon: Clock
  },
  {
    key: 'billing',
    label: 'Account & Billing',
    description: 'Subscription renewals, charges, invoices, and billing notices (Mandatory).',
    icon: Shield
  },
  {
    key: 'alerts',
    label: 'Project Risk Alerts',
    description: 'Rehab budget overruns, daily burn rates, and phase transitions.',
    icon: AlertCircle
  }
];

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light Mode', Icon: Sun, description: 'Default bright interface' },
  { value: 'dark' as const, label: 'Dark Mode', Icon: Moon, description: 'Easier on the eyes at night' },
  { value: 'system' as const, label: 'Sync with System', Icon: Monitor, description: 'Matches your OS preference' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

function ToggleSwitch({ enabled, disabled, onToggle }: { enabled: boolean; disabled?: boolean; onToggle: () => void }) {
  if (disabled) {
    return (
      <div 
        className="flex items-center justify-center w-9 h-5 rounded-full bg-bg-primary text-text-muted border border-border-accent opacity-60 cursor-not-allowed"
        title="Mandatory channel for this category."
      >
        <Lock className="w-3 h-3 text-text-secondary" />
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full transition-all cursor-pointer flex-shrink-0 focus:outline-none
        ${enabled ? 'bg-pw-fg' : 'bg-pw-border'}
      `}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 transform rounded-full bg-bg-surface transition-transform shadow-sm
          ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}
        `}
      />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useSettingsStore();
  const {
    loading,
    categories,
    emailEnabled,
    pushEnabled,
    quietHours,
    autoArchiveDays,
    loadPreferences,
    updateCategoryPreference,
    updateGlobalToggle,
    updateQuietHours,
    updateAutoArchiveDays
  } = useNotificationPreferencesStore();

  useEffect(() => {
    if (user?.uid) {
      loadPreferences(user.uid);
    }
  }, [user?.uid, loadPreferences]);

  const handleToggleGlobalEmail = async () => {
    if (!user) return;
    try {
      await updateGlobalToggle(user.uid, 'email', !emailEnabled);
      toast.success(!emailEnabled ? 'Email alerts enabled globally' : 'Email alerts disabled globally');
    } catch {
      toast.error('Failed to update email preferences');
    }
  };

  const handleToggleGlobalPush = async () => {
    if (!user) return;
    try {
      await updateGlobalToggle(user.uid, 'push', !pushEnabled);
      toast.success(!pushEnabled ? 'Push notifications enabled globally' : 'Push notifications disabled globally');
    } catch {
      toast.error('Failed to update push preferences');
    }
  };

  const handleToggleQuietHours = async () => {
    if (!user) return;
    try {
      await updateQuietHours(user.uid, { enabled: !quietHours.enabled });
      toast.success(!quietHours.enabled ? 'Quiet hours DND enabled' : 'Quiet hours DND disabled');
    } catch {
      toast.error('Failed to update quiet hours settings');
    }
  };

  const handleUpdateQuietTime = async (field: 'start' | 'end', value: string) => {
    if (!user) return;
    try {
      await updateQuietHours(user.uid, { [field]: value });
      toast.success(`Quiet hours ${field} time updated`);
    } catch {
      toast.error('Failed to update time setting');
    }
  };

  const handleUpdateTimezone = async (timezone: string) => {
    if (!user) return;
    try {
      await updateQuietHours(user.uid, { timezone });
      toast.success(`Notification timezone updated to ${timezone}`);
    } catch {
      toast.error('Failed to update timezone setting');
    }
  };

  const handleToggleCategoryChannel = async (category: NotificationCategory, channel: keyof CategoryPreference) => {
    if (!user) return;
    const currentVal = categories[category]?.[channel] ?? DEFAULT_CATEGORY_PREFERENCES[category][channel];
    try {
      await updateCategoryPreference(user.uid, category, channel, !currentVal);
      toast.success('Preference updated successfully');
    } catch {
      toast.error('Failed to update preference');
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    const exportToast = toast.loading('Generating data export...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user/gdpr', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to export data');
      const data = await res.json();
      
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data.export, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `notification_export_${user.uid}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      toast.success('Notification data exported successfully', { id: exportToast });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export notification data', { id: exportToast });
    }
  };

  const handleDeleteData = async () => {
    if (!user) return;
    const confirmDelete = window.confirm(
      'Are you sure you want to permanently delete all your notification history and reset preferences? This action is irreversible and complies with GDPR/CCPA regulations.'
    );
    if (!confirmDelete) return;

    const deleteToast = toast.loading('Erasing notification data...');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user/gdpr', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to erase data');
      
      await loadPreferences(user.uid);
      toast.success('All notification data permanently erased', { id: deleteToast });
    } catch (err) {
      console.error(err);
      toast.error('Failed to erase notification data', { id: deleteToast });
    }
  };

  // Compile active timezone lists
  const detectedTz = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const allTimezones = [...TIMEZONES];
  if (detectedTz && !TIMEZONES.some(t => t.value === detectedTz)) {
    allTimezones.unshift({ value: detectedTz, label: `Local (${detectedTz})` });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pw-fg"></div>
        <p className="text-xs text-text-secondary">Loading your preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ═══ Header Notice ═══ */}
      <section className="bg-bg-surface border border-border-accent p-4 flex gap-3 items-start">
        <Info className="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" />
        <div className="text-xs text-text-secondary space-y-1">
          <p className="font-semibold text-text-primary">Notification Guarantee</p>
          <p>
            You can customize, mute, or redirect any alert category below. Critical Billing and Expiring Contract Deadlines are locked to ensure you do not miss payment status updates or trigger default clauses on active real estate contracts.
          </p>
        </div>
      </section>

      {/* ═══ Card 1: Preferences Matrix ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            Notifications Matrix
          </h2>
          <p className="text-xs text-text-secondary mt-1">Configure granular channel selection per alert type.</p>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_64px_64px_64px] gap-4 items-center mb-4 pb-2 border-b border-pw-border px-1">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Alert Category</span>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider text-center">
            <Bell className="w-3.5 h-3.5 mx-auto mb-1 text-text-secondary" />
            Inbox
          </span>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider text-center">
            <Mail className="w-3.5 h-3.5 mx-auto mb-1 text-text-secondary" />
            Email
          </span>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider text-center">
            <Smartphone className="w-3.5 h-3.5 mx-auto mb-1 text-text-secondary" />
            Push
          </span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-pw-border">
          {CATEGORY_ROWS.map(({ key, label, description, icon: Icon }) => {
            const rowPrefs = categories[key] || DEFAULT_CATEGORY_PREFERENCES[key];
            const isMandatory = key === 'billing' || key === 'deadlines';

            return (
              <div key={key} className="grid grid-cols-[1fr_64px_64px_64px] gap-4 items-center py-4 px-1 hover:bg-bg-primary/50 transition-colors">
                <div className="flex gap-3 items-start pr-2">
                  <div className="w-7 h-7 bg-bg-primary border border-border-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                      {label}
                      {isMandatory && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-pw-fg/10 text-text-primary uppercase tracking-wider">
                          Required
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{description}</p>
                  </div>
                </div>
                
                {/* Inbox Channel */}
                <div className="flex justify-center">
                  <ToggleSwitch
                    enabled={rowPrefs.inbox}
                    disabled={isMandatory}
                    onToggle={() => handleToggleCategoryChannel(key, 'inbox')}
                  />
                </div>

                {/* Email Channel */}
                <div className="flex justify-center">
                  <ToggleSwitch
                    enabled={rowPrefs.email}
                    disabled={isMandatory}
                    onToggle={() => handleToggleCategoryChannel(key, 'email')}
                  />
                </div>

                {/* Push Channel */}
                <div className="flex justify-center">
                  <ToggleSwitch
                    enabled={rowPrefs.push}
                    disabled={false} // Push is never mandatory
                    onToggle={() => handleToggleCategoryChannel(key, 'push')}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ Card 2: Global Opt-Out & Quiet Hours ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6 space-y-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            Global Dispatch Preferences
          </h2>
          <p className="text-xs text-text-secondary mt-1">Control outbound notification channels globally.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-pw-border">
          {/* Global Toggles */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Global Channels</h3>
            
            <div className="flex items-center justify-between p-3 border border-border-accent bg-bg-primary/30">
              <div>
                <p className="text-xs font-semibold text-text-primary">Email Notifications</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Receive system & transactional mail alerts</p>
              </div>
              <ToggleSwitch enabled={emailEnabled} onToggle={handleToggleGlobalEmail} />
            </div>

            <div className="flex items-center justify-between p-3 border border-border-accent bg-bg-primary/30">
              <div>
                <p className="text-xs font-semibold text-text-primary">Web Push Notifications</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Show notifications directly in browser</p>
              </div>
              <ToggleSwitch enabled={pushEnabled} onToggle={handleToggleGlobalPush} />
            </div>

            {(!emailEnabled || !pushEnabled) && (
              <p className="text-[10px] text-text-muted italic">
                Note: Disabling channels globally overrides per-category active checkboxes.
              </p>
            )}
          </div>

          {/* Quiet Hours / DND */}
          <div className="space-y-4 md:pl-6 pt-6 md:pt-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Quiet Hours DND</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">Silence & queue email alerts during specified hours</p>
              </div>
              <ToggleSwitch enabled={quietHours.enabled} onToggle={handleToggleQuietHours} />
            </div>

            {quietHours.enabled && (
              <div className="space-y-3 p-4 bg-bg-primary border border-border-accent">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={quietHours.start}
                      onChange={(e) => handleUpdateQuietTime('start', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-bg-surface border border-border-ui text-text-primary outline-none focus:border-pw-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={quietHours.end}
                      onChange={(e) => handleUpdateQuietTime('end', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-bg-surface border border-border-ui text-text-primary outline-none focus:border-pw-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Notification Timezone
                  </label>
                  <select
                    value={quietHours.timezone}
                    onChange={(e) => handleUpdateTimezone(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-bg-surface border border-border-ui text-text-primary outline-none focus:border-pw-black"
                  >
                    {allTimezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ Card 3: Inbox Retention & Cleanup ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            Inbox Cleanup & Retention
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Automatically archive notifications after they are read to keep your workspace clear.
          </p>
        </div>

        <div className="max-w-xs">
          <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
            Auto-Archive Retention Window
          </label>
          <select
            value={autoArchiveDays}
            onChange={(e) => {
              if (user?.uid) {
                updateAutoArchiveDays(user.uid, Number(e.target.value))
                  .then(() => toast.success(`Auto-archive set to ${e.target.value} days`, {
                    style: { background: '#0d0d0d', color: '#fff' }
                  }))
                  .catch(() => toast.error('Failed to update retention window'));
              }
            }}
            className="w-full px-2 py-1.5 text-xs bg-bg-surface border border-border-ui text-text-primary outline-none focus:border-pw-black"
          >
            <option value="30">30 Days (Default)</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days</option>
          </select>
        </div>
      </section>

      {/* ═══ Card 3.5: Data Rights & Privacy (GDPR/CCPA) ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6 space-y-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-text-secondary" />
            Data Rights & Privacy (GDPR/CCPA)
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Manage your personal data, download your records, or request complete account notification erasure.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-border-accent p-4 bg-bg-primary/20 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-text-primary">Export My Notification Data</p>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Download a complete copy of all your in-app notifications, queued emails, and system preferences in structured JSON format.
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="w-fit flex items-center gap-2 px-4 py-2 border border-border-ui hover:bg-bg-primary hover:border-pw-black text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download JSON Export
            </button>
          </div>

          <div className="border border-border-accent p-4 bg-bg-primary/20 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-500">Delete My Notification History</p>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Permanently erase all in-app notifications, pending emails, and push tokens. Your preferences will be reset to default. This action is irreversible.
              </p>
            </div>
            <button
              onClick={handleDeleteData}
              className="w-fit flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500 hover:text-white text-xs font-semibold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Permanently Delete Data
            </button>
          </div>
        </div>
      </section>

      {/* ═══ Card 4: Theme Customizer ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">
          Appearance
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, label, Icon, description }) => {
            const isSelected = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`
                  flex items-center gap-3 p-3 text-left transition-all border cursor-pointer
                  ${isSelected
                    ? 'bg-bg-primary border-pw-black'
                    : 'border-border-accent hover:border-pw-muted'
                  }
                `}
              >
                <div className={`
                  w-8 h-8 flex items-center justify-center flex-shrink-0 rounded
                  ${isSelected ? 'bg-pw-fg text-white' : 'bg-bg-primary text-text-secondary'}
                `}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">
                    {label}
                  </p>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5">{description}</p>
                </div>
                <div className={`
                  w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0
                  ${isSelected ? 'border-pw-black' : 'border-border-accent'}
                `}>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-pw-black" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
