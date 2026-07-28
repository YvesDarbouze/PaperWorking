'use client';

import { useNotificationPreferencesStore, DEFAULT_CATEGORY_PREFERENCES } from '@/store/notificationPreferencesStore';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import type { NotificationCategory, CategoryPreference } from '@/types/user';
import { settingsTokens, panelStyle, inputStyle, type SettingsTokens } from '@/components/settings/settingsTheme';

/* Notifications — alert routing & retention desk */

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

function ToggleSwitch({
  enabled,
  disabled,
  onToggle,
  t,
}: {
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
  t: SettingsTokens;
}) {
  if (disabled) {
    return (
      <div
        className="flex items-center justify-center w-9 h-5 flex-shrink-0 cursor-not-allowed"
        style={{ background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 999 }}
        title="Mandatory channel for this category."
      >
        <span className="material-symbols-outlined text-[10px] select-none" style={{ color: t.muted }}>lock</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="pw-interactive-custom relative inline-flex w-9 h-5 items-center flex-shrink-0 transition-colors"
      style={{
        borderRadius: 999,
        border: `1px solid ${t.border}`,
        background: enabled ? t.successMuted : t.surfaceHigh,
        padding: 2,
      }}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className="inline-block w-4 h-4 transform transition-transform duration-200"
        style={{
          borderRadius: 999,
          background: enabled ? t.success : t.muted,
          transform: enabled ? 'translateX(16px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = settingsTokens(isDark);
  const panel = panelStyle(t);
  const field = inputStyle(t);

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

  const handleUpdateQuietTime = async (fieldName: 'start' | 'end', value: string) => {
    if (!user) return;
    try {
      await updateQuietHours(user.uid, { [fieldName]: value });
      toast.success(`Quiet hours ${fieldName} time updated`);
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

  const detectedTz = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const allTimezones = [...TIMEZONES];
  if (detectedTz && !TIMEZONES.some((tz) => tz.value === detectedTz)) {
    allTimezones.unshift({ value: detectedTz, label: `Local (${detectedTz})` });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3" style={{ color: t.muted }}>
        <span className="material-symbols-outlined animate-spin text-2xl select-none" style={{ color: t.accent }}>
          progress_activity
        </span>
        <p className="text-xs">Loading preferences…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6" style={{ color: t.body }}>
      <header className="pb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
        <p className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1" style={{ color: t.accent }}>
          Alerts
        </p>
        <h2 className="text-[1.35rem] font-semibold tracking-tight" style={{ color: t.heading }}>
          Notifications
        </h2>
        <p className="text-sm mt-1.5 leading-relaxed max-w-xl" style={{ color: t.muted }}>
          Route delivery by category, set quiet hours, and manage retention.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-5">

        <section className="col-span-12 p-5 sm:p-6 flex flex-col" style={panel}>
          <div className="flex items-center gap-2 pb-4 mb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined select-none" style={{ color: t.accent }}>auto_delete</span>
            <h2 className="text-base font-semibold" style={{ color: t.heading }}>Inbox cleanup & retention</h2>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <p className="text-sm leading-relaxed max-w-2xl" style={{ color: t.muted }}>
              Auto-archive read notifications after the retention window. History stays searchable and exportable.
            </p>

            <div className="flex-shrink-0 min-w-[220px]">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: t.muted }}>
                Auto-archive window
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
                className="w-full px-3 h-10 text-sm outline-none"
                style={field}
              >
                <option value="30">30 days (default)</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>
        </section>

        <section className="col-span-12 p-5 sm:p-6 overflow-hidden" style={panel}>
          <div className="flex items-center gap-2 pb-4 mb-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined select-none" style={{ color: t.accent }}>notifications_active</span>
            <h2 className="text-base font-semibold" style={{ color: t.heading }}>Routing & delivery</h2>
          </div>

          <div
            className="flex items-start gap-3 p-3.5 mb-5"
            style={{ background: t.accentMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
          >
            <span className="material-symbols-outlined text-base mt-0.5 select-none" style={{ color: t.accent }}>info</span>
            <div className="text-xs space-y-1" style={{ color: t.muted }}>
              <p className="font-semibold" style={{ color: t.heading }}>Notification guarantee</p>
              <p className="leading-relaxed">
                Mute or redirect any category below. Billing and contingency deadlines stay locked so you do not miss payment notices or contract defaults.
              </p>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.divider}` }}>
                  <th className="py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] w-1/2" style={{ color: t.muted }}>
                    Event category
                  </th>
                  <th className="py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-center" style={{ color: t.muted }}>
                    In-app
                  </th>
                  <th className="py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-center" style={{ color: t.muted }}>
                    Email
                  </th>
                  <th className="py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-center" style={{ color: t.muted }}>
                    Push
                  </th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_ROWS.map(({ key, label, description, iconName }) => {
                  const rowPrefs = categories[key] || DEFAULT_CATEGORY_PREFERENCES[key];
                  const isMandatory = key === 'billing' || key === 'deadlines';

                  return (
                    <tr
                      key={key}
                      style={{ borderBottom: `1px solid ${t.divider}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="py-3.5">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: t.surfaceMuted,
                              border: `1px solid ${t.border}`,
                              borderRadius: 2,
                              color: isMandatory ? t.warn : t.muted,
                            }}
                          >
                            <span className="material-symbols-outlined text-base select-none">{iconName}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold flex items-center gap-2 flex-wrap" style={{ color: t.heading }}>
                              {label}
                              {isMandatory && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                                  style={{ background: t.warnMuted, border: `1px solid ${t.border}`, borderRadius: 2, color: t.warn }}
                                >
                                  Required
                                </span>
                              )}
                            </p>
                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.muted }}>{description}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 text-center">
                        <div className="flex justify-center">
                          <ToggleSwitch
                            t={t}
                            enabled={rowPrefs.inbox}
                            disabled={isMandatory}
                            onToggle={() => handleToggleCategoryChannel(key, 'inbox')}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 text-center">
                        <div className="flex justify-center">
                          <ToggleSwitch
                            t={t}
                            enabled={rowPrefs.email}
                            disabled={isMandatory}
                            onToggle={() => handleToggleCategoryChannel(key, 'email')}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 text-center">
                        <div className="flex justify-center">
                          <ToggleSwitch
                            t={t}
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

        <section className="col-span-12 xl:col-span-7 p-5 sm:p-6 flex flex-col gap-5" style={panel}>
          <div className="flex items-center gap-2 pb-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined select-none" style={{ color: t.accent }}>tune</span>
            <h2 className="text-base font-semibold" style={{ color: t.heading }}>Global dispatch</h2>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
              Global channels
            </h3>

            <div
              className="flex items-center justify-between p-3.5 gap-3"
              style={{ border: `1px solid ${t.border}`, background: t.surfaceMuted, borderRadius: 2 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center"
                  style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2, color: t.accent }}
                >
                  <span className="material-symbols-outlined text-lg select-none">mail</span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: t.heading }}>Email notifications</p>
                  <p className="text-[11px] mt-0.5" style={{ color: t.muted }}>System and transactional mail</p>
                </div>
              </div>
              <ToggleSwitch t={t} enabled={emailEnabled} onToggle={handleToggleGlobalEmail} />
            </div>

            <div
              className="flex items-center justify-between p-3.5 gap-3"
              style={{ border: `1px solid ${t.border}`, background: t.surfaceMuted, borderRadius: 2 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center"
                  style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 2, color: t.accent }}
                >
                  <span className="material-symbols-outlined text-lg select-none">phone_iphone</span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: t.heading }}>Web push</p>
                  <p className="text-[11px] mt-0.5" style={{ color: t.muted }}>Browser notifications</p>
                </div>
              </div>
              <ToggleSwitch t={t} enabled={pushEnabled} onToggle={handleToggleGlobalPush} />
            </div>

            {(!emailEnabled || !pushEnabled) && (
              <p className="text-[11px] leading-relaxed px-1" style={{ color: t.muted }}>
                Disabling a channel globally overrides per-category settings.
              </p>
            )}
          </div>

          <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${t.divider}` }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
                  Quiet hours
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: t.muted }}>
                  Silence and queue email alerts during set hours
                </p>
              </div>
              <ToggleSwitch t={t} enabled={quietHours.enabled} onToggle={handleToggleQuietHours} />
            </div>

            {quietHours.enabled && (
              <div
                className="space-y-3 p-3.5"
                style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: t.muted }}>
                      Start time
                    </label>
                    <input
                      type="time"
                      value={quietHours.start}
                      onChange={(e) => handleUpdateQuietTime('start', e.target.value)}
                      className="w-full px-3 h-10 text-sm outline-none"
                      style={field}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: t.muted }}>
                      End time
                    </label>
                    <input
                      type="time"
                      value={quietHours.end}
                      onChange={(e) => handleUpdateQuietTime('end', e.target.value)}
                      className="w-full px-3 h-10 text-sm outline-none"
                      style={field}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: t.muted }}>
                    Notification timezone
                  </label>
                  <select
                    value={quietHours.timezone}
                    onChange={(e) => handleUpdateTimezone(e.target.value)}
                    className="w-full px-3 h-10 text-sm outline-none"
                    style={field}
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
        </section>

        <section
          className="col-span-12 xl:col-span-5 p-5 sm:p-6 flex flex-col gap-5"
          style={{ ...panel, borderColor: t.alert }}
        >
          <div className="flex items-center gap-2 pb-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <span className="material-symbols-outlined select-none" style={{ color: t.alert }}>policy</span>
            <h2 className="text-base font-semibold" style={{ color: t.heading }}>Data rights & privacy</h2>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: t.muted }}>
            Export notification records or erase history. Actions comply with GDPR/CCPA.
          </p>

          <div className="mt-auto space-y-2.5">
            <button
              type="button"
              onClick={handleExportData}
              className="pw-interactive-custom w-full flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 16px', color: t.heading }}
            >
              <span className="material-symbols-outlined text-[16px] select-none">download</span>
              Export account payload
            </button>
            <button
              type="button"
              onClick={handleDeleteData}
              className="pw-interactive-custom w-full flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ background: t.alertMuted, border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 16px', color: t.alert }}
            >
              <span className="material-symbols-outlined text-[16px] select-none">delete_forever</span>
              Erase notification data
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
