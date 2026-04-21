'use client';

import { useSettingsStore, NotificationKey } from '@/store/settingsStore';
import { Bell, BellOff, Mail, MessageSquare, Sun, Moon, Monitor } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Notifications & Appearance Settings

   Two cards:
   1. Alert Matrix — Email/In-App toggle grid
   2. Theme Customizer — Light, Dark, System
   ═══════════════════════════════════════════════════════ */

const ALERT_ROWS: { key: NotificationKey; label: string; description: string }[] = [
  {
    key: 'vendorInquiries',
    label: 'New Vendor Inquiries / Messages',
    description: 'When a vendor sends a new message or inquiry on your listings.',
  },
  {
    key: 'investorPledges',
    label: 'Investor Pledges / LOI Signatures',
    description: 'When an investor pledges capital or signs a Letter of Intent.',
  },
  {
    key: 'holdingCostWarnings',
    label: 'DOM / Holding Cost Warnings',
    description: 'Alerts when Days on Market or holding costs exceed thresholds.',
  },
  {
    key: 'taskAssignments',
    label: 'Task Assignments',
    description: 'When you are assigned a new task or action item.',
  },
];

const THEME_OPTIONS = [
  { value: 'light'  as const, label: 'Light Mode',      Icon: Sun,     description: 'Default bright interface' },
  { value: 'dark'   as const, label: 'Dark Mode',       Icon: Moon,    description: 'Easier on the eyes at night' },
  { value: 'system' as const, label: 'Sync with System', Icon: Monitor, description: 'Matches your OS preference' },
];

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer flex-shrink-0
        ${enabled ? 'bg-pw-fg' : 'bg-pw-border'}
      `}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
          ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}
        `}
      />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const { notifications, toggleNotification, theme, setTheme } = useSettingsStore();

  // Check if any notification is enabled across all channels
  const anyEnabled = Object.values(notifications).some(n => n.email || n.inApp);

  return (
    <div className="space-y-6">

      {/* ═══ Card 1: Alert Matrix ═══ */}
      <section className="bg-white border border-pw-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-pw-muted">
              Notification Preferences
            </h2>
            <p className="text-xs text-pw-muted mt-1">Choose how you want to be notified for each event type.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-pw-muted">
            {anyEnabled ? (
              <><Bell className="w-3.5 h-3.5" /> Active</>
            ) : (
              <><BellOff className="w-3.5 h-3.5" /> All muted</>
            )}
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_64px_64px] gap-3 items-center mb-3 px-1">
          <span className="text-xs font-semibold text-pw-muted uppercase tracking-wider">Alert Type</span>
          <span className="text-xs font-semibold text-pw-muted uppercase tracking-wider text-center">
            <Mail className="w-3.5 h-3.5 mx-auto mb-0.5" />
            Email
          </span>
          <span className="text-xs font-semibold text-pw-muted uppercase tracking-wider text-center">
            <MessageSquare className="w-3.5 h-3.5 mx-auto mb-0.5" />
            In-App
          </span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-pw-border">
          {ALERT_ROWS.map(({ key, label, description }) => (
            <div key={key} className="grid grid-cols-[1fr_64px_64px] gap-3 items-center py-4 px-1">
              <div>
                <p className="text-sm font-medium text-pw-black">{label}</p>
                <p className="text-xs text-pw-muted mt-0.5">{description}</p>
              </div>
              <div className="flex justify-center">
                <ToggleSwitch
                  enabled={notifications[key].email}
                  onToggle={() => toggleNotification(key, 'email')}
                />
              </div>
              <div className="flex justify-center">
                <ToggleSwitch
                  enabled={notifications[key].inApp}
                  onToggle={() => toggleNotification(key, 'inApp')}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Card 2: Theme Customizer ═══ */}
      <section className="bg-white border border-pw-border p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-pw-muted mb-6">
          Appearance
        </h2>

        <div className="space-y-2">
          {THEME_OPTIONS.map(({ value, label, Icon, description }) => {
            const isSelected = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 text-left transition-all cursor-pointer
                  ${isSelected
                    ? 'bg-pw-bg border border-pw-black'
                    : 'border border-pw-border hover:border-pw-muted'
                  }
                `}
              >
                <div className={`
                  w-10 h-10 flex items-center justify-center flex-shrink-0
                  ${isSelected ? 'bg-pw-black text-white' : 'bg-pw-bg text-pw-muted'}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isSelected ? 'text-pw-black' : 'text-pw-fg'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-pw-muted">{description}</p>
                </div>
                {/* Radio indicator */}
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${isSelected ? 'border-pw-black' : 'border-pw-border'}
                `}>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-pw-black" />
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
