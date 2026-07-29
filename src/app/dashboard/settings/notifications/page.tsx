'use client';

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
    label: 'Investment Team & Co-Investing',
    description: 'Investment Team invites, pledge status updates, and LOI commitments.',
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
        className="flex items-center justify-center w-9 h-5 rounded-full bg-surface-container border border-outline-variant/30 cursor-not-allowed flex-shrink-0"
        title="Mandatory channel for this category."
      >
        <span className="material-symbols-outlined text-[10px] text-on-surface-variant/40 select-none">lock</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        relative inline-flex w-9 h-5 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0 focus:outline-none items-center p-[2px]
        ${enabled ? 'bg-on-background' : 'bg-[var(--color-outline)]'}
      `}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`
          inline-block w-4 h-4 transform rounded-full transition-transform duration-200 shadow-sm ease-in-out
          ${enabled ? 'translate-x-4 bg-background' : 'translate-x-0 bg-white'}
        `}
      />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
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
      {/* ─── Bento Grid Layout ─── */}
      <div className="grid grid-cols-12 gap-8">

        {/* ════ Row 1: Inbox Retention (col-12) ════ */}

        {/* Inbox Retention */}
        <section className="col-span-12 glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pw-primary/5 rounded-full blur-[80px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
            <span className="material-symbols-outlined text-pw-primary select-none">auto_delete</span>
            <h2 className="text-base font-semibold text-pw-black">Inbox Cleanup & Retention</h2>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm text-pw-muted leading-relaxed">
                Automatically archive notifications after they are read to keep your workspace clear. All historical records remain fully searchable and exportable via Compliance Data Rights.
              </p>
            </div>

            <div className="flex-shrink-0 min-w-[220px]">
              <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-2">
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
                className="glass-input w-full px-4 h-10 rounded-lg text-sm text-pw-black focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
              >
                <option value="30" className="bg-[#161318] text-pw-black">30 Days (Default)</option>
                <option value="60" className="bg-[#161318] text-pw-black">60 Days</option>
                <option value="90" className="bg-[#161318] text-pw-black">90 Days</option>
              </select>
            </div>
          </div>
        </section>

        {/* ════ Row 2: Notifications Matrix (col-12) ════ */}

        <section className="col-span-12 glass-card rounded-2xl p-6 overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
            <span className="material-symbols-outlined text-pw-primary select-none">notifications_active</span>
            <h2 className="text-base font-semibold text-pw-black">Routing & Delivery</h2>
          </div>

          {/* Guarantee Banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-pw-primary/5 border border-pw-primary/10 mb-6">
            <span className="material-symbols-outlined text-pw-primary text-base mt-0.5 select-none">info</span>
            <div className="text-xs text-pw-muted space-y-1">
              <p className="font-semibold text-pw-black">Notification Guarantee</p>
              <p className="leading-relaxed">
                You can customize, mute, or redirect any alert category below. Critical Billing and Expiring Contract Deadlines are locked to ensure you do not miss payment status updates or trigger default clauses on active real estate contracts.
              </p>
            </div>
          </div>

          {/* Full-width Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5 h-12">
                  <th className="py-3 text-xs font-medium uppercase tracking-wider text-pw-muted w-1/2">Event Category</th>
                  <th className="py-3 text-xs font-medium uppercase tracking-wider text-pw-muted text-center">In-App</th>
                  <th className="py-3 text-xs font-medium uppercase tracking-wider text-pw-muted text-center">Email</th>
                  <th className="py-3 text-xs font-medium uppercase tracking-wider text-pw-muted text-center">Push</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_ROWS.map(({ key, label, description, iconName }) => {
                  const rowPrefs = categories[key] || DEFAULT_CATEGORY_PREFERENCES[key];
                  const isMandatory = key === 'billing' || key === 'deadlines';

                  return (
                    <tr key={key} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors h-12">
                      <td className="py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center flex-shrink-0 mt-0.5 text-pw-muted">
                            <span className="material-symbols-outlined text-base select-none">{iconName}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-pw-black flex items-center gap-2 flex-wrap">
                              {label}
                              {isMandatory && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-pw-primary/10 border border-pw-primary/20 text-pw-primary uppercase tracking-wider">
                                  Required
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-pw-muted mt-0.5 leading-relaxed">{description}</p>
                          </div>
                        </div>
                      </td>

                      {/* In-App Channel */}
                      <td className="py-4 text-center">
                        <div className="flex justify-center">
                          <ToggleSwitch
                            enabled={rowPrefs.inbox}
                            disabled={isMandatory}
                            onToggle={() => handleToggleCategoryChannel(key, 'inbox')}
                          />
                        </div>
                      </td>

                      {/* Email Channel */}
                      <td className="py-4 text-center">
                        <div className="flex justify-center">
                          <ToggleSwitch
                            enabled={rowPrefs.email}
                            disabled={isMandatory}
                            onToggle={() => handleToggleCategoryChannel(key, 'email')}
                          />
                        </div>
                      </td>

                      {/* Push Channel */}
                      <td className="py-4 text-center">
                        <div className="flex justify-center">
                          <ToggleSwitch
                            enabled={rowPrefs.push}
                            disabled={false}
                            onToggle={() => handleToggleCategoryChannel(key, 'push')}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ════ Row 3: Global Dispatch (col-7) + Data Rights (col-5) ════ */}

        {/* Global Dispatch Preferences */}
        <section className="col-span-12 xl:col-span-7 glass-card rounded-2xl p-6 flex flex-col gap-6 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <span className="material-symbols-outlined text-pw-primary select-none">tune</span>
            <h2 className="text-base font-semibold text-pw-black">Global Dispatch Preferences</h2>
          </div>

          {/* Global Channel Toggles */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-pw-muted uppercase tracking-wider">Global Channels</h3>

            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-pw-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-pw-primary text-lg select-none">mail</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-pw-black">Email Notifications</p>
                  <p className="text-[11px] text-pw-muted mt-0.5">Receive system & transactional mail alerts</p>
                </div>
              </div>
              <ToggleSwitch enabled={emailEnabled} onToggle={handleToggleGlobalEmail} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-pw-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-pw-primary text-lg select-none">phone_iphone</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-pw-black">Web Push Notifications</p>
                  <p className="text-[11px] text-pw-muted mt-0.5">Show notifications directly in browser</p>
                </div>
              </div>
              <ToggleSwitch enabled={pushEnabled} onToggle={handleToggleGlobalPush} />
            </div>

            {(!emailEnabled || !pushEnabled) && (
              <p className="text-[11px] text-pw-muted/60 italic leading-relaxed px-1">
                Note: Disabling channels globally overrides per-category active checkboxes.
              </p>
            )}
          </div>

          {/* Quiet Hours / DND */}
          <div className="space-y-3 border-t border-white/5 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-pw-muted uppercase tracking-wider">Quiet Hours DND</h3>
                <p className="text-[11px] text-pw-muted mt-0.5">Silence & queue email alerts during specified hours</p>
              </div>
              <ToggleSwitch enabled={quietHours.enabled} onToggle={handleToggleQuietHours} />
            </div>

            {quietHours.enabled && (
              <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={quietHours.start}
                      onChange={(e) => handleUpdateQuietTime('start', e.target.value)}
                      className="glass-input w-full px-4 h-10 rounded-lg text-sm text-pw-black focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={quietHours.end}
                      onChange={(e) => handleUpdateQuietTime('end', e.target.value)}
                      className="glass-input w-full px-4 h-10 rounded-lg text-sm text-pw-black focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-pw-muted uppercase tracking-wider mb-1">
                    Notification Timezone
                  </label>
                  <select
                    value={quietHours.timezone}
                    onChange={(e) => handleUpdateTimezone(e.target.value)}
                    className="glass-input w-full px-4 h-10 rounded-lg text-sm text-pw-black focus:ring-2 focus:ring-pw-primary focus:outline-none transition-all duration-150"
                  >
                    {allTimezones.map((tz) => (
                      <option key={tz.value} value={tz.value} className="bg-[#161318] text-pw-black">
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Data Rights & Privacy (Danger Zone) */}
        <section className="col-span-12 xl:col-span-5 glass-card rounded-2xl p-6 border border-red-500/20 relative overflow-hidden flex flex-col gap-6 transition-all duration-200 hover:shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[60px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2" />

          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <span className="material-symbols-outlined text-red-400 select-none">policy</span>
            <h2 className="text-base font-semibold text-pw-black">Data Rights & Privacy</h2>
          </div>

          <p className="text-sm text-pw-muted leading-relaxed">
            Manage your personal data, download your records, or request complete account notification erasure. Actions here comply with GDPR and CCPA regulations and are immutable.
          </p>

          <div className="mt-auto space-y-3">
            <button
              onClick={handleExportData}
              className="w-full h-10 px-5 rounded-lg border border-white/10 text-pw-black text-sm font-medium hover:bg-white/[0.04] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] select-none">download</span>
              Export Account Payload
            </button>
            <button
              onClick={handleDeleteData}
              className="w-full h-10 px-5 rounded-lg bg-error/10 border border-error/30 text-error text-sm font-medium hover:bg-error/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] select-none">delete_forever</span>
              Initiate Deletion Sequence
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
