"use client";

/**
 * Sidebar — PaperWorking persistent left-side navigation (desktop).
 * 240px fixed panel. Mobile navigation is handled by BottomNav + TopAppBar.
 * Exports: Sidebar (named + default)
 *
 * Nav contract (AGENTS.md v3 — 2026-06-06):
 *   Primary: Portfolio · Projects · Insights · Reports · Inbox · Team
 *   Account: Profile · Billing · Settings
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useNotification } from "@/context/NotificationContext";
import { useTheme } from "@/lib/utils/ThemeProvider";
import Logo from "@/components/brand/Logo";
import LogoutButton from "@/components/dashboard/LogoutButton";
import { AcquisitionWizard } from "@/components/acquisition/AcquisitionWizard";
import { useCreateProjectModal } from "@/store/createProjectModalStore";
import toast from "react-hot-toast";

// ─── Navigation contract ──────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { name: "Portfolio",     href: "/dashboard/command-center", icon: "space_dashboard" },
  { name: "Insights",      href: "/dashboard/insights",       icon: "monitoring"      },
  { name: "Projects",      href: "/dashboard/projects",       icon: "folder"          },
  { name: "Reports",       href: "/dashboard/reports",        icon: "bar_chart_4_bars"},
  { name: "Inbox",         href: "/dashboard/inbox",          icon: "inbox"           },
  { name: "Team",          href: "/dashboard/team",           icon: "group"           },
] as const;

const ACCOUNT_NAV = [
  { name: "Profile",  href: "/dashboard/settings/profile", icon: "account_circle" },
  { name: "Billing",  href: "/dashboard/settings/billing", icon: "payments"       },
  { name: "Settings", href: "/dashboard/settings",         icon: "settings"       },
] as const;

// ─── User avatar ──────────────────────────────────────────────────────────────
// Shows Firebase photoURL if available, otherwise an initials monogram.

interface AvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: number;
  isDark: boolean;
}

function UserAvatar({ photoURL, displayName, email, size = 32, isDark }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = displayName
    ? displayName.charAt(0).toUpperCase()
    : email
    ? email.charAt(0).toUpperCase()
    : "U";

  if (photoURL && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt={displayName ?? "User avatar"}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: isDark
          ? "linear-gradient(135deg, rgba(69,73,85,0.8) 0%, rgba(110,116,128,0.6) 100%)"
          : "linear-gradient(135deg, rgba(69,73,85,0.15) 0%, rgba(110,116,128,0.25) 100%)",
        color: isDark ? "rgba(253,255,252,0.92)" : "rgba(69,73,85,0.9)",
      }}
    >
      {initials}
    </span>
  );
}


// ─── Nav item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  name: string;
  href: string;
  icon: string;
  isActive: boolean;
  badge?: number;
  isDark: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function NavItem({ name, href, icon, isActive, badge, isDark, onClick }: NavItemProps) {
  const activeTextColor  = isDark ? "rgba(253,255,252,0.92)" : "#0d0a0b";
  const inactiveTextColor = isDark ? "rgba(253,255,252,0.65)" : "rgba(55,59,69,0.82)";
  const activeBg    = isDark ? "rgba(69,73,85,0.25)"  : "rgba(69,73,85,0.09)";
  const activeBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(33,34,38,0.14)";

  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150"
      style={{
        background: isActive ? activeBg : "transparent",
        color: isActive ? activeTextColor : inactiveTextColor,
        border: isActive ? `1px solid ${activeBorder}` : "1px solid transparent",
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
        className="text-label-md flex-1 min-w-0 truncate"
        style={{ fontWeight: isActive ? 700 : 500, letterSpacing: "-0.01em" }}
      >
        {name}
      </span>

      {/* Inbox unread badge */}
      {badge !== undefined && badge > 0 && (
        <span
          className="relative flex items-center justify-center rounded-full text-label-sm font-bold flex-shrink-0"
          style={{
            minWidth: 18,
            height: 18,
            padding: "0 4px",
            background: "var(--color-primary)",
            color: "#fff",
            lineHeight: 1,
          }}
        >
          {badge > 9 ? "9+" : badge}
          {/* Pulse ring */}
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: "var(--color-primary)", opacity: 0.35 }}
          />
        </span>
      )}

      {/* Hover overlay */}
      {!isActive && (
        <span
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
          style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
        />
      )}
    </Link>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <div className="px-3 pt-5 pb-1.5">
      <p
        className="text-label-sm font-bold uppercase"
        style={{
          letterSpacing: "0.10em",
          color: isDark ? "rgba(253,255,252,0.50)" : "rgba(55,59,69,0.75)",
        }}
      >
        {label}
      </p>
    </div>
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
  const { isOpen: wizardOpen, open: openWizard, close: closeWizard } = useCreateProjectModal();

  useEffect(() => { setMounted(true); }, []);

  // Demo-mode nav guard
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

  // Workspace list
  const workspaces: Array<{ id: string; name: string; type: "personal" | "team" }> = profile
    ? [{ id: profile.personalOrganizationId || `org_${user?.uid.slice(0, 8)}`, name: "Personal Workspace", type: "personal" }]
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

  const activeWorkspace = workspaces.find((w) => w.id === activeTenantId) || workspaces[0];
  const isPersonal = activeWorkspace?.type === "personal";

  // Token shortcuts
  const dividerColor = isDark ? "rgba(230,234,240,0.10)" : "rgba(33,34,38,0.10)";
  const selectBg     = isDark ? "rgba(255,255,255,0.04)" : "rgba(50,121,249,0.04)";
  const selectBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(50,121,249,0.10)";
  const mutedText    = isDark ? "rgba(253,255,252,0.55)" : "rgba(55,59,69,0.72)";

  return (
    <>
    <aside
      className="hidden md:flex flex-col h-screen w-60 flex-shrink-0 z-50"
      style={{
        background: isDark
          ? "linear-gradient(180deg, #121317 0%, #0d0a0b 100%)"
          : "#FDFFFC",
        borderRight: isDark
          ? "1px solid rgba(253,255,252,0.07)"
          : "1px solid rgba(69,73,85,0.10)",
        backdropFilter: isDark ? "blur(24px)" : undefined,
        WebkitBackdropFilter: isDark ? "blur(24px)" : undefined,
      }}
    >
      {/* ── Brand area ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-4">
        <Logo surface="app-sidebar" href="/dashboard/command-center" />
      </div>

      {/* ── Create Project — Featured CTA ───────────────────────────────── */}
      <div className="px-3 pb-4">
        <button
          onClick={openWizard}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            background: isDark ? "var(--color-primary)" : "#0b8649",
            color: isDark ? "#0d0a0b" : "#FDFFFC",
            letterSpacing: "-0.01em",
            boxShadow: "0 4px 16px rgba(var(--color-primary-rgb, 90,170,63),0.30)",
          }}
        >
          <span
            className="material-symbols-outlined text-[18px] flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            add_circle
          </span>
          Create Project
        </button>
      </div>

      {/* ── Primary navigation ──────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
        {PRIMARY_NAV.filter((item) => {
          if (item.name === "Projects") {
            const isVendor =
              profile?.role === "Vendor" ||
              profile?.accountType === "vendor" ||
              profile?.subscriptionPlan === "Vendor Network";
            return !isVendor;
          }
          return true;
        }).map((item) => {
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

        {/* ── Account section ─────────────────────────────────────────── */}
        <SectionLabel label="Account" isDark={isDark} />

        {ACCOUNT_NAV.map((item) => {
          // Settings exact-match: don't highlight when on /settings/profile or /settings/billing
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

      {/* ── Bottom area ─────────────────────────────────────────────────── */}
      <div
        className="px-2 pb-5 pt-3 space-y-1.5"
        style={{ borderTop: `1px solid ${dividerColor}` }}
      >

        {/* Auth skeleton */}
        {!mounted || authLoading || !user || !profile ? (
          <div className="space-y-2 animate-pulse px-1 pt-1">
            <div className="h-8 rounded-lg" style={{ background: selectBg }} />
            <div className="h-11 rounded-xl" style={{ background: selectBg }} />
          </div>
        ) : (
          <>
            {/* Workspace switcher */}
            <div className="relative px-1 pt-0.5">
              <p
                className="text-label-sm font-semibold uppercase mb-1 px-2"
                style={{ letterSpacing: "0.08em", color: mutedText }}
              >
                acting as:{" "}
                <span style={{ color: isDark ? "var(--color-primary)" : "#047857", fontWeight: 800 }}>
                  {isPersonal ? "Me" : activeWorkspace?.name}
                </span>
              </p>
              <div className="relative">
                <select
                  value={activeTenantId || workspaces[0]?.id}
                  onChange={(e) => {
                    if (typeof window !== "undefined" && window.location.pathname.startsWith("/demo")) {
                      toast.error("Demo Mode: Workspaces are read-only.", {
                        id: "demo-workspace-guard",
                        style: { background: "#111", color: "#fff", border: "1px solid #333" },
                      });
                      return;
                    }
                    switchTenant(e.target.value);
                  }}
                  aria-label="Select Workspace"
                  className="w-full appearance-none text-body-sm font-semibold py-2 pl-8 pr-7 rounded-lg focus:outline-none transition-all cursor-pointer truncate"
                  style={{
                    background: selectBg,
                    border: `1px solid ${selectBorder}`,
                    color: isDark ? "rgba(253,255,252,0.80)" : "rgba(33,34,38,0.85)",
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

            {/* Profile row — avatar + name + role + logout */}
            <div
              className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl mx-1"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(69,73,85,0.04)",
                border: `1px solid ${dividerColor}`,
              }}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <UserAvatar
                  photoURL={user.photoURL}
                  displayName={profile?.displayName ?? user?.displayName}
                  email={user?.email}
                  size={32}
                  isDark={isDark}
                />
                <div className="flex flex-col overflow-hidden">
                  <span
                    className="text-body-sm font-semibold truncate leading-tight"
                    style={{
                      color: isDark ? "rgba(253,255,252,0.90)" : "#0d0a0b",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {profile?.displayName || user?.displayName || "User"}
                  </span>
                  <span
                    className="text-label-sm truncate capitalize leading-tight"
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

    {/* ── Fullscreen wizard overlay — portalled to document.body ──────────
        The AcquisitionWizard already uses fixed inset-0 z-[200] internally,
        so it overlays the entire viewport regardless of where it's mounted.
        We use a portal so it escapes any overflow:hidden ancestor.       */}
    {mounted && wizardOpen
      ? createPortal(
          <AcquisitionWizard onClose={closeWizard} />,
          document.body,
        )
      : null}
  </>
  );
}

export default Sidebar;
