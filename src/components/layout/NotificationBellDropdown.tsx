"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProjectStore } from "@/store/projectStore";
import { useTheme } from "@/lib/utils/ThemeProvider";
import { deriveWorkflowNotifications, DerivedWorkflowNotification } from "@/lib/notifications/eventStream";
import toast from "react-hot-toast";

function getSavedReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const match = document.cookie.match(/(?:^|; )pw_read_notification_ids=([^;]*)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
    }
    const stored = localStorage.getItem("pw_read_notification_ids") || sessionStorage.getItem("pw_read_notification_ids");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
    }
  } catch (e) {}
  return new Set();
}

function saveReadIds(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(set);
    const jsonStr = JSON.stringify(arr);
    document.cookie = `pw_read_notification_ids=${encodeURIComponent(jsonStr)}; path=/; max-age=31536000`;
    localStorage.setItem("pw_read_notification_ids", jsonStr);
    sessionStorage.setItem("pw_read_notification_ids", jsonStr);
  } catch (e) {}
}

export function NotificationBellDropdown() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const projects = useProjectStore((s) => s.projects);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local state for read notification IDs (persisted across reloads via localStorage, sessionStorage, & cookie)
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load persisted read notification IDs on client mount (bypasses SSR hydration mismatch)
  useEffect(() => {
    const saved = getSavedReadIds();
    if (saved.size > 0) {
      setReadIds(saved);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive active workflow notifications using user preferences
  const userPreferences = profile?.preferences?.categories?.alerts;
  const notifications = useMemo(() => {
    return deriveWorkflowNotifications(projects, userPreferences as any);
  }, [projects, userPreferences]);

  // Compute unread count
  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id));
  }, [notifications, readIds]);

  const unreadCount = unreadNotifications.length;

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  };

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    console.log("[NotificationBellDropdown] handleMarkAllRead EXECUTED! IDs:", allIds);
    const next = new Set(allIds);
    setReadIds(next);
    saveReadIds(next);
    toast.success("All notifications marked as read", {
      icon: "🔔",
      style: { background: "#111", color: "#fff", border: "1px solid #333" },
    });
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return { icon: "warning", color: "#F06543" };
      case "warning":
        return { icon: "pending_actions", color: "#ffac5a" };
      default:
        return { icon: "info", color: "var(--pw-success)" };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        data-testid="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative p-2 rounded-xl transition-all duration-200 group cursor-pointer flex items-center justify-center"
        style={{
          background: isOpen ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(69,73,85,0.06)") : "transparent",
          color: isDark ? "rgba(253,255,252,0.85)" : "rgba(69,73,85,0.85)",
        }}
      >
        <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">
          notifications
        </span>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            data-testid="unread-badge"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white shadow-sm animate-pulse"
            style={{
              background: "#F06543",
              border: `2px solid ${isDark ? "#121014" : "#FDFFFC"}`,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl z-50 overflow-hidden"
          style={{
            background: isDark ? "rgba(18,16,20,0.96)" : "#FFFFFF",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(69,73,85,0.12)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.12)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{
              borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(69,73,85,0.08)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface)" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: "rgba(240,101,67,0.12)",
                    color: "#F06543",
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "#627C85" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <span className="material-symbols-outlined text-3xl mb-2 opacity-40" style={{ color: "#3f7d20" }}>
                  check_circle
                </span>
                <p className="text-xs font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  No pending notifications
                </p>
                <p className="text-[11px] opacity-50 mt-0.5">All workflow items are clear</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isRead = readIds.has(item.id);
                const pInfo = getPriorityIcon(item.priority);

                return (
                  <div
                    key={item.id}
                    data-testid="notification-item"
                    onClick={() => {
                      setReadIds((prev) => new Set(prev).add(item.id));
                      setIsOpen(false);
                      router.push(item.deepLinkUrl);
                    }}
                    className="p-3.5 flex items-start gap-3 transition-colors duration-150 cursor-pointer group"
                    style={{
                      borderBottom: isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(69,73,85,0.06)",
                      background: isRead
                        ? "transparent"
                        : isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(69,73,85,0.02)",
                    }}
                  >
                    {/* Priority Icon */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${pInfo.color}18` }}
                    >
                      <span className="material-symbols-outlined text-[15px]" style={{ color: pInfo.color }}>
                        {pInfo.icon}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          className={`text-xs ${isRead ? "font-normal opacity-80" : "font-semibold"}`}
                          style={{ color: "var(--color-on-surface)" }}
                        >
                          {item.title}
                        </p>
                        {!isRead && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: "#F06543" }}
                          />
                        )}
                      </div>
                      <p className="text-[11px] opacity-70 line-clamp-2 leading-relaxed mb-1">
                        {item.body}
                      </p>
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">
                        {item.projectName}
                      </span>
                    </div>

                    {/* Mark read action button */}
                    {!isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        title="Mark as read"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-opacity cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px] opacity-60">check</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
