'use client';

import { useSettingsStore } from '@/store/settingsStore';
import { useNotificationPreferencesStore, DEFAULT_CATEGORY_PREFERENCES } from '@/store/notificationPreferencesStore';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import type { NotificationCategory, CategoryPreference } from '@/types/user';

/* ═══════════════════════════════════════════════════════
   Granular Notification & Appearance Settings UI
   (Luminous Glass Terminal)
   ═══════════════════════════════════════════════════════ */

const CATEGORY_ROWS: {
  key: NotificationCategory;
  label: string;
  description: string;
  iconName: string;
}[] = [
  {
    key: 'syndication',
    label: 'Syndication & Investing',
    description: 'Syndication invites, pledge status updates, and LOI commitments.',
    iconName: 'notifications'
  },
  {
    key: 'bids',
    label: 'Contractor & Vendor Bids',
    description: 'New bids submitted, quote changes, and project job inquiries.',
    iconName: 'rate_review'
  },
  {
    key: 'tasks',
    label: 'Tasks & Collaboration',
    description: 'Task assignments, document sign-offs, and team invitations.',
    iconName: 'task_alt'
  },
  {
    key: 'deadlines',
    label: 'Contingency Deadlines',
    description: 'Critical alerts for expiring contract contingencies (Mandatory).',
    iconName: 'schedule'
  },
  {
    key: 'billing',
    label: 'Account & Billing',
    description: 'Subscription renewals, charges, invoices, and billing notices (Mandatory).',
    iconName: 'shield'
  },
  {
    key: 'alerts',
    label: 'Project Risk Alerts',
    description: 'Rehab budget overruns, daily burn rates, and phase transitions.',
    iconName: 'warning'
  }
];

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light Mode', iconName: 'light_mode', description: 'Default bright interface' },
  { value: 'dark' as const, label: 'Dark Mode', iconName: 'dark_mode', description: 'Easier on the eyes at night' },
  { value: 'system' as const, label: 'Sync with System', iconName: 'desktop_windows', description: 'Matches your OS preference' },
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
        className="flex items-center justify-center w-10 h-5.5 rounded-full bg-pw-glass-bg border border-pw-border/50 cursor-not-allowed"
        title="Mandatory channel for this category."
      >
        <span className="material-symbols-outlined text-[10px] text-pw-muted select-none">lock</span>
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`
        relative inline-flex h-5.5 w-10 items-center rounded-full transition-all cursor-pointer flex-shrink-0 focus:outline-none border
        ${enabled ? 'bg-pw-primary/20 border-pw-primary/40' : 'bg-pw-glass-bg border-pw-border'}
      `}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-300 shadow-sm
          ${enabled ? 'translate-x-5 bg-pw-primary' : 'translate-x-1 bg-pw-muted'}
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
        <span className="material-symbols-outlined animate-spin text-2xl text-pw-muted select-none">progress_activity</span>
        <p className="text-xs text-pw-muted">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* ─── Grid Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md items-start">
        
        {/* Left Column: Guarantee Notice, Matrix & Global Dispatch */}
        <div className="lg:col-span-7 space-y-stack-md">
          
          {/* Guarantee Notice */}
          <section className="glass-card glass-card-bright p-4 rounded-xl flex gap-3 items-start relative overflow-hidden">
            <span className="material-symbols-outlined text-base text-pw-muted mt-0.5 select-none">info</span>
            <div className="text-xs text-pw-muted space-y-1">
              <p className="font-semibold text-pw-black">Notification Guarantee</p>
              <p className="leading-relaxed">
                You can customize, mute, or redirect any alert category below. Critical Billing and Expiring Contract Deadlines are locked to ensure you do not miss payment status updates or trigger default clauses on active real estate contracts.
              </p>
            </div>
          </section>

          {/* Card 1: Preferences Matrix */}
          <section className="glass-card glass-card-bright p-8 rounded-2xl relative overflow-hidden flex flex-col">
            <div className="mb-6">
              <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-pw-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg select-none">grid_on</span>
                Notifications Matrix
              </h3>
              <p className="text-xs text-pw-muted mt-1">Configure granular channel selection per alert type.</p>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[1fr_64px_64px_64px] gap-4 items-center mb-4 pb-2 border-b border-pw-border/50 px-1">
              <span className="font-label-sm text-label-sm font-semibold text-pw-muted uppercase tracking-wider">Alert Category</span>
              <span className="font-label-sm text-label-sm font-bold text-pw-muted uppercase tracking-wider text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-lg mb-1 select-none">inbox</span>
                Inbox
              </span>
              <span className="font-label-sm text-label-sm font-bold text-pw-muted uppercase tracking-wider text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-lg mb-1 select-none">mail</span>
                Email
              </span>
              <span className="font-label-sm text-label-sm font-bold text-pw-muted uppercase tracking-wider text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-lg mb-1 select-none">phone_iphone</span>
                Push
              </span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-pw-border/50">
              {CATEGORY_ROWS.map(({ key, label, description, iconName }) => {
                const rowPrefs = categories[key] || DEFAULT_CATEGORY_PREFERENCES[key];
                const isMandatory = key === 'billing' || key === 'deadlines';

                return (
                  <div key={key} className="grid grid-cols-[1fr_64px_64px_64px] gap-4 items-center py-4 px-1 hover:bg-pw-glass-bg transition-colors">
                    <div className="flex gap-3 items-start pr-2">
                      <div className="w-8 h-8 rounded bg-pw-glass-bg border border-pw-border flex items-center justify-center flex-shrink-0 mt-0.5 text-pw-muted">
                        <span className="material-symbols-outlined text-base select-none">{iconName}</span>
                      </div>
                      <div>
                        <p className="font-body-md text-body-md font-semibold text-pw-black flex items-center gap-2 flex-wrap">
                          {label}
                          {isMandatory && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-pw-primary/10 border border-pw-primary/20 text-pw-primary uppercase tracking-wider">
                              Required
                            </span>
                          )}
                        </p>
                        <p className="font-body-sm text-body-sm text-pw-muted mt-0.5 leading-relaxed">{description}</p>
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
                        disabled={false}
                        onToggle={() => handleToggleCategoryChannel(key, 'push')}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Card 2: Global Opt-Out & Quiet Hours */}
          <section className="glass-card glass-card-bright p-8 rounded-2xl relative overflow-hidden space-y-6 flex flex-col">
            <div>
              <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-pw-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg select-none">settings_input_component</span>
                Global Dispatch Preferences
              </h3>
              <p className="text-xs text-pw-muted mt-1">Control outbound notification channels globally.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-pw-border/50">
              {/* Global Toggles */}
              <div className="space-y-4">
                <h4 className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-pw-muted mb-2">Global Channels</h4>
                
                <div className="flex items-center justify-between p-4 border border-pw-border rounded-xl bg-pw-glass-bg">
                  <div>
                    <p className="text-xs font-bold text-pw-black">Email Notifications</p>
                    <p className="text-[10px] text-pw-muted mt-0.5">Receive system & transactional mail alerts</p>
                  </div>
                  <ToggleSwitch enabled={emailEnabled} onToggle={handleToggleGlobalEmail} />
                </div>

                <div className="flex items-center justify-between p-4 border border-pw-border rounded-xl bg-pw-glass-bg">
                  <div>
                    <p className="text-xs font-bold text-pw-black">Web Push Notifications</p>
                    <p className="text-[10px] text-pw-muted mt-0.5">Show notifications directly in browser</p>
                  </div>
                  <ToggleSwitch enabled={pushEnabled} onToggle={handleToggleGlobalPush} />
                </div>

                {(!emailEnabled || !pushEnabled) && (
                  <p className="text-[10px] text-pw-muted/60 italic leading-relaxed">
                    Note: Disabling channels globally overrides per-category active checkboxes.
                  </p>
                )}
              </div>

              {/* Quiet Hours / DND */}
              <div className="space-y-4 md:pl-6 pt-6 md:pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-pw-muted">Quiet Hours DND</h4>
                    <p className="text-[10px] text-pw-muted mt-0.5">Silence & queue email alerts during specified hours</p>
                  </div>
                  <ToggleSwitch enabled={quietHours.enabled} onToggle={handleToggleQuietHours} />
                </div>

                {quietHours.enabled && (
                  <div className="space-y-3 p-4 bg-pw-glass-bg border border-pw-border rounded-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-label-sm text-label-sm font-bold text-pw-muted uppercase tracking-wider mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={quietHours.start}
                          onChange={(e) => handleUpdateQuietTime('start', e.target.value)}
                          className="glass-input w-full px-3 py-1.5 text-sm text-pw-black"
                        />
                      </div>
                      <div>
                        <label className="block font-label-sm text-label-sm font-bold text-pw-muted uppercase tracking-wider mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={quietHours.end}
                          onChange={(e) => handleUpdateQuietTime('end', e.target.value)}
                          className="glass-input w-full px-3 py-1.5 text-sm text-pw-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm font-bold text-pw-muted uppercase tracking-wider mb-1">
                        Notification Timezone
                      </label>
                      <select
                        value={quietHours.timezone}
                        onChange={(e) => handleUpdateTimezone(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-sm text-pw-black"
                      >
                        {allTimezones.map((tz) => (
                          <option key={tz.value} value={tz.value} className="bg-pw-surface text-pw-black">
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
        </div>

        {/* Right Column: Theme, Retention & Privacy */}
        <div className="lg:col-span-5 space-y-stack-md">
          
          {/* Card 3: Theme Customizer */}
          <section className="glass-card glass-card-bright p-8 rounded-2xl flex flex-col relative overflow-hidden">
            <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-pw-primary mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg select-none">palette</span>
              Appearance
            </h3>

            <div className="flex flex-col gap-4">
              {THEME_OPTIONS.map(({ value, label, iconName, description }) => {
                const isSelected = theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`
                      flex items-center gap-3 p-4 text-left transition-all border rounded-xl cursor-pointer
                      ${isSelected
                        ? 'bg-pw-primary/10 border-pw-primary/45 text-pw-primary shadow-[0_0_15px_rgba(87,241,219,0.15)]'
                        : 'border-pw-border bg-pw-glass-bg/50 text-pw-muted hover:border-pw-muted/40'
                      }
                    `}
                  >
                    <div className={`
                      w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-lg border
                      ${isSelected ? 'bg-pw-primary/20 border-pw-primary/30 text-pw-primary' : 'bg-pw-glass-bg border-pw-border text-pw-muted'}
                    `}>
                      <span className="material-symbols-outlined text-base select-none">{iconName}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-pw-black truncate">
                        {label}
                      </p>
                      <p className="text-[10px] text-pw-muted truncate mt-0.5 leading-normal">{description}</p>
                    </div>
                    <div className={`
                      w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'border-pw-primary' : 'border-pw-border'}
                    `}>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-pw-primary" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Card 4: Inbox Retention & Cleanup */}
          <section className="glass-card glass-card-bright p-8 rounded-2xl flex flex-col relative overflow-hidden space-y-4">
            <div>
              <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-pw-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg select-none">auto_delete</span>
                Inbox Cleanup & Retention
              </h3>
              <p className="text-xs text-pw-muted mt-1 leading-relaxed">
                Automatically archive notifications after they are read to keep your workspace clear.
              </p>
            </div>

            <div className="w-full">
              <label className="block font-label-sm text-label-sm font-bold text-pw-muted uppercase tracking-wider mb-2">
                Auto-Archive Retention Window
              </label>
              <select
                value={autoArchiveDays}
                onChange={(e) => {
                  if (user?.uid) {
                    updateAutoArchiveDays(user.uid, Number(e.target.value))
                      .then(() => toast.success(`Auto-archive set to ${e.target.value} days`))
                      .catch(() => toast.error('Failed to update retention window'));
                  }
                }}
                className="glass-input w-full px-3 py-2 text-sm text-pw-black"
              >
                <option value="30" className="bg-pw-surface text-pw-black">30 Days (Default)</option>
                <option value="60" className="bg-pw-surface text-pw-black">60 Days</option>
                <option value="90" className="bg-pw-surface text-pw-black">90 Days</option>
              </select>
            </div>
          </section>

          {/* Card 5: Data Rights & Privacy (GDPR/CCPA) */}
          <section className="glass-card glass-card-bright p-8 rounded-2xl flex flex-col relative overflow-hidden space-y-6">
            <div>
              <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-error flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-error select-none">policy</span>
                Data Rights & Privacy (GDPR/CCPA)
              </h3>
              <p className="text-xs text-pw-muted mt-1 leading-relaxed">
                Manage your personal data, download your records, or request complete account notification erasure.
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-pw-border rounded-xl p-4 bg-pw-glass-bg flex flex-col gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-pw-black">Export My Notification Data</p>
                  <p className="text-[10px] text-pw-muted leading-relaxed">
                    Download a complete copy of all your in-app notifications, queued emails, and system preferences in structured JSON format.
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  className="luminous-button w-fit flex items-center gap-2 px-4 py-2.5 font-label-md text-label-md font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base select-none">download</span>
                  Download JSON Export
                </button>
              </div>

              <div className="border border-pw-border rounded-xl p-4 bg-pw-glass-bg flex flex-col gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-error">Delete My Notification History</p>
                  <p className="text-[10px] text-pw-muted leading-relaxed">
                    Permanently erase all in-app notifications, pending emails, and push tokens. Your preferences will be reset to default. This action is irreversible.
                  </p>
                </div>
                <button
                  onClick={handleDeleteData}
                  className="w-fit flex items-center gap-2 px-4 py-2.5 bg-error/10 border border-error/20 text-error hover:bg-error/20 font-label-md text-label-md font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base select-none">delete</span>
                  Permanently Delete Data
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
