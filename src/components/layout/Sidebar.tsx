"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useNotification } from "@/context/NotificationContext";
import { useTheme } from "@/lib/utils/ThemeProvider";
import Logo from "@/components/brand/Logo";
import LogoutButton from "@/components/dashboard/LogoutButton";
import toast from "react-hot-toast";

// ─── Navigation spec (updated 2026-06-06, v2) ────────────────────────────────
// Portfolio  = Dashboard landing page (home)
// Projects   = All RE investment projects (folder icon per spec)
// Insights   = Portfolio-wide metrics & multi-view analytics
// Reports    = Generated reports — monthly, quarterly, annual expenses
// Inbox      = Internal messages, to-dos, requests, deal crowdfund invites
// Team       = Team management, invites, presence status

const primaryNavItems = [
  { name: "Portfolio", href: "/dashboard/command-center", icon: "space_dashboard" },
  { name: "Projects",  href: "/dashboard/projects",       icon: "folder"          },
  { name: "Insights",  href: "/dashboard/insights",       icon: "monitoring"      },
  { name: "Reports",   href: "/dashboard/reports",        icon: "bar_chart_4_bars"},
  { name: "Inbox",     href: "/dashboard/inbox",          icon: "inbox"           },
  { name: "Team",      href: "/dashboard/team",           icon: "group"           },
] as const;

const accountNavItems = [
  { name: "Profile",  href: "/dashboard/settings/profile", icon: "account_circle" },
  { name: "Billing",  href: "/dashboard/settings/billing", icon: "payments"       },
  { name: "Settings", href: "/dashboard/settings",         icon: "settings"       },
] as const;

// ─── Theme toggle button ──────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all duration-200 group"
      style={{
        background: "transparent",
        color: "var(--color-on-surface-variant)",
        border: "none",
        cursor: "pointer",
      }}
    >
      <span
        className="material-symbols-outlined text-[18px] transition-transform duration-300"
        style={{
          fontVariationSettings: "'FILL' 1",
          transform: isDark ? "rotate(0deg)" : "rotate(180deg)",
        }}
      >
        {isDark ? "light_mode" : "dark_mode"}
      </span>
      <span
        className="text-[13px]"
        style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
      >
        {isDark ? "Light mode" : "Dark mode"}
      </span>

      {/* hover layer */}
      <span
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
      />
    </button>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  key?: string;        // React strips this at runtime; declared here to satisfy TS JSX prop inference
  name: string;
  href: string;
  icon: string;
  isActive: boolean;
  badge?: number;
  isDark: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function NavItem({ name, href, icon, isActive, badge, isDark, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150"
      style={{
        background: isActive
          ? "var(--color-primary-container)"
          : "transparent",
        color: isActive
          ? "var(--color-primary)"
          : "var(--color-on-surface-variant)",
        borderLeft: isActive
          ? "3px solid var(--color-primary)"
          : "3px solid transparent",
        paddingLeft: isActive ? "9px" : "12px",
        textDecoration: "none",
      }}
    >
      {/* Icon */}
      <span
        className="material-symbols-outlined text-[20px] flex-shrink-0 transition-all duration-150"
        style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>

      {/* Label */}
      <span
        className="text-[13px] flex-1 min-w-0 truncate"
        style={{
          fontWeight: isActive ? 600 : 500,
          letterSpacing: "-0.01em",
          fontFamily: "var(--font-inter), Inter, sans-serif",
        }}
      >
        {name}
      </span>

      {/* Inbox badge */}
      {badge !== undefined && badge > 0 && (
        <span
          className="relative flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
          style={{
            minWidth: "18px",
            height: "18px",
            padding: "0 4px",
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
            lineHeight: 1,
          }}
        >
          {badge > 9 ? "9+" : badge}
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-25"
            style={{ background: "var(--color-primary)" }}
          />
        </span>
      )}

      {/* Hover overlay */}
      {!isActive && (
        <span
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
          style={{
            background: isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.04)",
          }}
        />
      )}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, loading: authLoading } = useAuth();
  const { activeTenantId, switchTenant } = useTenant();
  const { unreadTotal } = useNotification();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = theme === "dark";

  useEffect(() => { setMounted(true); }, []);

  const handleNavClick = (e: React.MouseEvent, itemHref: string, itemName: string) => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/demo")) {
      if (itemHref === "/dashboard/command-center" || itemName === "Portfolio") {
        e.preventDefault();
        window.location.href = "/demo";
        return;
      }
      e.preventDefault();
      toast.error(`Demo Mode: Sign up to access ${itemName}.`, {
        id: "demo-sidebar-guard",
        style: { background: "#111", color: "#fff", border: "1px solid #333" },
      });
    }
  };

  const workspaces = profile
    ? [
        {
          id: profile.personalOrganizationId || `org_${user?.uid.slice(0, 8)}`,
          name: "Personal Workspace",
          type: "personal",
        },
      ]
    : [];

  if (profile?.memberships) {
    Object.entries(profile.memberships).forEach(([tenantId, membership]) => {
      workspaces.push({
        id: tenantId,
        name: (membership as { tenantName?: string })?.tenantName || "Team Workspace",
        type: "team",
      });
    });
  }

  const activeWorkspace =
    workspaces.find((w) => w.id === activeTenantId) || workspaces[0];
  const isPersonal = activeWorkspace?.type === "personal";

  // Sidebar surface tokens — respond to data-theme on <html>
  const sidebarBg = isDark
    ? "linear-gradient(180deg, #121317 0%, #0d0a0b 100%)"
    : "#FFFFFF";
  const sidebarBorder = isDark
    ? "1px solid rgba(230, 234, 240, 0.12)"
    : "1px solid rgba(33, 34, 38, 0.12)";
  const dividerColor = isDark
    ? "rgba(230, 234, 240, 0.12)"
    : "rgba(33, 34, 38, 0.12)";
  const mutedText = "var(--color-on-surface-variant)";
  const selectBg = isDark
    ? "rgba(255, 255, 255, 0.04)"
    : "rgba(50, 121, 249, 0.05)";
  const selectBorder = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(50, 121, 249, 0.12)";

  return (
    <aside
      className="hidden md:flex flex-col h-screen w-60 z-50 flex-shrink-0"
      style={{
        background: sidebarBg,
        borderRight: sidebarBorder,
        backdropFilter: isDark ? "blur(24px)" : undefined,
        WebkitBackdropFilter: isDark ? "blur(24px)" : undefined,
      }}
    >
      {/* ── Brand area ──────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5">
        <Logo size="lg" href="/dashboard/command-center" />
      </div>

      {/* ── Primary navigation ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
        {primaryNavItems.map((item) => {
          const isActive =
            pathname.startsWith(item.href) ||
            (item.href === "/dashboard/command-center" && pathname === "/dashboard");

          return (
            <NavItem
              key={item.name}
              name={item.name}
              href={item.href}
              icon={item.icon}
              isActive={isActive}
              isDark={isDark}
              badge={item.name === "Inbox" && mounted ? unreadTotal : undefined}
              onClick={(e) => handleNavClick(e, item.href, item.name)}
            />
          );
        })}

        {/* ── Account section ─────────────────────────────────── */}
        <div className="px-3 pt-5 pb-1.5">
          <p
            className="text-[10px] font-bold uppercase"
            style={{ letterSpacing: "0.10em", color: mutedText }}
          >
            Account
          </p>
        </div>

        {accountNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard/settings"
              ? pathname.startsWith("/dashboard/settings") &&
                !pathname.startsWith("/dashboard/settings/profile") &&
                !pathname.startsWith("/dashboard/settings/billing")
              : pathname.startsWith(item.href);

          return (
            <NavItem
              key={item.name}
              name={item.name}
              href={item.href}
              icon={item.icon}
              isActive={isActive}
              isDark={isDark}
              onClick={(e) => handleNavClick(e, item.href, item.name)}
            />
          );
        })}
      </nav>

      {/* ── Bottom area ─────────────────────────────────────────── */}
      <div
        className="px-2 pb-4 pt-3 space-y-1"
        style={{ borderTop: `1px solid ${dividerColor}` }}
      >
        {/* Theme toggle */}
        <div className="relative">
          <ThemeToggle />
        </div>

        {/* Workspace switcher + profile */}
        {!mounted || authLoading || !user || !profile ? (
          <div className="space-y-2 animate-pulse px-1">
            <div className="h-9 rounded-lg" style={{ background: selectBg }} />
            <div className="h-12 rounded-xl" style={{ background: selectBg }} />
          </div>
        ) : (
          <>
            {/* Workspace switcher */}
            <div className="relative px-1">
              <p
                className="text-[10px] font-bold uppercase mb-1 px-2"
                style={{ letterSpacing: "0.08em", color: mutedText }}
              >
                acting as:{" "}
                <span style={{ color: "var(--color-primary)", fontWeight: 800 }}>
                  {isPersonal ? "Me" : activeWorkspace?.name}
                </span>
              </p>
              <div className="relative">
                <select
                  value={activeTenantId || workspaces[0]?.id}
                  onChange={(e) => {
                    if (
                      typeof window !== "undefined" &&
                      window.location.pathname.startsWith("/demo")
                    ) {
                      toast.error("Demo Mode: Workspaces are read-only.", {
                        id: "demo-workspace-guard",
                        style: {
                          background: "#111",
                          color: "#fff",
                          border: "1px solid #333",
                        },
                      });
                      return;
                    }
                    switchTenant(e.target.value);
                  }}
                  aria-label="Select Workspace"
                  className="w-full appearance-none text-[12px] font-semibold py-2 pl-8 pr-7 rounded-lg focus:outline-none transition-all cursor-pointer truncate"
                  style={{
                    background: selectBg,
                    border: `1px solid ${selectBorder}`,
                    color: "var(--color-on-surface)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {workspaces.map((ws) => (
                    <option
                      key={ws.id}
                      value={ws.id}
                      style={{ background: isDark ? "#1e1b20" : "#fff" }}
                    >
                      {ws.name}
                    </option>
                  ))}
                </select>
                <span
                  className="material-symbols-outlined text-[15px] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: mutedText }}
                >
                  {isPersonal ? "person" : "corporate_fare"}
                </span>
                <span
                  className="material-symbols-outlined text-[15px] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: mutedText }}
                >
                  keyboard_arrow_down
                </span>
              </div>
            </div>

            {/* Profile row */}
            <div
              className="flex items-center justify-between gap-2.5 px-2 py-2 rounded-xl transition-all duration-150 group cursor-pointer mx-1"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(69,73,85,0.04)",
                border: `1px solid ${dividerColor}`,
              }}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-transform duration-150 group-hover:scale-105"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-primary) 100%)",
                    color: isDark ? "#FDFFFC" : "#FDFFFC",
                    fontSize: "13px",
                  }}
                >
                  {profile?.displayName
                    ? profile.displayName.charAt(0).toUpperCase()
                    : user?.email
                    ? user.email.charAt(0).toUpperCase()
                    : "U"}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{
                      color: "var(--color-on-surface)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {profile?.displayName || user?.displayName || "User"}
                  </span>
                  <span
                    className="text-[10px] truncate capitalize"
                    style={{ color: mutedText }}
                  >
                    {profile?.role || "Member"}
                  </span>
                </div>
              </div>
              <LogoutButton
                compact
                className="text-on-surface-variant hover:text-primary rounded-lg hover:bg-white/5 flex-shrink-0"
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
