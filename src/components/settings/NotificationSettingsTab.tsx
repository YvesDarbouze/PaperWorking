"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/lib/utils/ThemeProvider";
import { useSettingsStore } from "@/store/settingsStore";
import toast from "react-hot-toast";

const EVENT_TYPE_LABELS = [
  {
    key: "gate_criteria_failing",
    label: "Phase Gate Unmet Criteria",
    description: "Notify when a project phase gate is locked due to missing criteria.",
  },
  {
    key: "gate_override_executed",
    label: "Phase Gate Override Executed",
    description: "Notify when an owner or admin executes a phase gate override.",
  },
  {
    key: "variance_threshold_tripped",
    label: "Operational NOI Variance Alert",
    description: "Notify when operational NOI variance exceeds ±10% for 2+ consecutive periods.",
  },
  {
    key: "exchange_1031_deadline",
    label: "1031 Exchange Statutory Deadline",
    description: "Notify when 1031 identification (45d) or exchange (180d) deadline is within 14 days.",
  },
  {
    key: "checklist_item_overdue",
    label: "Checklist / Action Item Overdue",
    description: "Notify when a milestone or action item passes its target due date.",
  },
  {
    key: "document_upload_completed",
    label: "Document Upload Completed",
    description: "Notify when project closing or due diligence documents are uploaded.",
  },
];

export function NotificationSettingsTab() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const { updateNotifications } = useSettingsStore();
  const isDark = theme === "dark";

  // In-App preferences state (defaulting all to true)
  const initialPrefs = profile?.preferences?.categories?.alerts || {};
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    gate_criteria_failing: initialPrefs.gate_criteria_failing !== false,
    gate_override_executed: initialPrefs.gate_override_executed !== false,
    variance_threshold_tripped: initialPrefs.variance_threshold_tripped !== false,
    exchange_1031_deadline: initialPrefs.exchange_1031_deadline !== false,
    checklist_item_overdue: initialPrefs.checklist_item_overdue !== false,
    document_upload_completed: initialPrefs.document_upload_completed !== false,
  });

  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: string) => {
    const nextVal = !preferences[key];
    const updated = { ...preferences, [key]: nextVal };
    setPreferences(updated);

    try {
      setSaving(true);
      await updateNotifications(updated as any);
      toast.success("Notification preferences updated", {
        id: "pref-update-toast",
        style: { background: "#111", color: "#fff", border: "1px solid #333" },
      });
    } catch (err) {
      console.error("[NotificationSettingsTab] Failed to save preferences:", err);
      toast.error("Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="notification-settings-tab"
      className="p-6 rounded-2xl border border-solid shadow-sm"
      style={{
        background: isDark ? "rgba(18,16,20,0.85)" : "#FFFFFF",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(69,73,85,0.12)",
      }}
    >
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-solid" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.08)" }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--color-on-surface)" }}>
            Workflow Notification Preferences
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Configure push and in-app alerts for critical project events.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider opacity-60">
          <span>In-App</span>
          <span>Email</span>
        </div>
      </div>

      <div className="space-y-4">
        {EVENT_TYPE_LABELS.map((item) => {
          const isEnabled = preferences[item.key] !== false;

          return (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 border-b border-solid"
              style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(69,73,85,0.06)" }}
            >
              <div className="pr-4">
                <p className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {item.label}
                </p>
                <p className="text-xs opacity-60 mt-0.5 max-w-xl">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center gap-6 flex-shrink-0">
                {/* In-App Toggle */}
                <button
                  data-testid={`toggle-${item.key}`}
                  onClick={() => handleToggle(item.key)}
                  disabled={saving}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isEnabled ? "bg-[#3f7d20]" : isDark ? "bg-white/20" : "bg-black/20"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      isEnabled ? "left-7" : "left-1"
                    }`}
                  />
                </button>

                {/* Email Column: Coming Soon Badge (NO fake email sending claimed) */}
                <div className="w-16 flex justify-end">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.08)",
                      color: isDark ? "rgba(253,255,252,0.4)" : "rgba(69,73,85,0.5)",
                    }}
                  >
                    Coming soon
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
