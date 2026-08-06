"use client";

/**
 * Sidebar — PaperWorking persistent left-side navigation (desktop).
 * 240px fixed panel. Mobile navigation is handled by BottomNav + TopAppBar.
 * Exports: Sidebar (named + default)
 *
 * Nav contract (AGENTS.md v4 — 2026-07-16):
 *   Primary: Portfolio · Projects · Insights · Reports · Inbox · Team
 *   Account: Profile · Billing · Settings
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { useTheme } from "@/lib/utils/ThemeProvider";
import Logo from "@/components/brand/Logo";
import { AcquisitionWizard } from "@/components/acquisition/AcquisitionWizard";
import { useCreateProjectModal } from "@/store/createProjectModalStore";
import toast from "react-hot-toast";

import {
  resolvePrimaryNav,
  resolveAccountNav,
  NavItem as ContractNavItem,
} from "@/lib/navigation/navContract";

// ─── Nav item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  name: string;
  href: string;
  icon: string;
  isActive: boolean;
  isLocked?: boolean;
  badge?: number;
  isDark: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function NavItem({ name, href, icon, isActive, isLocked, badge, isDark, onClick }: NavItemProps) {
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

      {/* Lock badge for unsubscribed items */}
      {isLocked && (
        <span
          className="material-symbols-outlined text-[16px] text-amber-500 flex-shrink-0"
          title="Requires Subscription"
        >
          lock
        </span>
      )}

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
  const router = useRouter();
  const { profile } = useAuth();
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
      <div className="px-5 flex items-center" style={{ height: '70px' }}>
        <Logo surface="app-sidebar" href="/dashboard/command-center" />
      </div>

      {/* ── Primary navigation ──────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
        <SectionLabel label="PORTFOLIO" isDark={isDark} />
        {resolvePrimaryNav({
          role: profile?.role,
          accountType: profile?.accountType,
          subscriptionPlan: profile?.subscriptionPlan,
        }).map((item) => {
          const isActive =
            item.href === "/dashboard/command-center"
              ? pathname === "/dashboard/command-center" || pathname === "/dashboard"
              : Boolean(pathname?.startsWith(item.href));

          const handleClick = (e: React.MouseEvent) => {
            if (item.isLocked) {
              e.preventDefault();
              toast.error("Deals Marketplace requires an active subscription.", { id: "deals-locked" });
              router.push("/dashboard/settings/billing?paywall=deals");
              return;
            }
            handleNavClick(e, item.href, item.label);
          };

          return (
            <NavItem
              key={item.id}
              name={item.label}
              href={item.href}
              icon={item.icon}
              isActive={isActive}
              isLocked={item.isLocked}
              isDark={isDark}
              badge={item.id === "inbox" && mounted ? unreadTotal : undefined}
              onClick={handleClick}
            />
          );
        })}

        {/* ── Account section ─────────────────────────────────────────── */}
        <SectionLabel label="Account" isDark={isDark} />

        {resolveAccountNav({
          role: profile?.role,
          accountType: profile?.accountType,
          subscriptionPlan: profile?.subscriptionPlan,
        }).map((item) => {
          const isActive =
            item.href === "/dashboard/settings"
              ? Boolean(pathname?.startsWith("/dashboard/settings")) &&
                !pathname?.startsWith("/dashboard/settings/profile") &&
                !pathname?.startsWith("/dashboard/settings/billing")
              : Boolean(pathname?.startsWith(item.href));

          return (
            <NavItem
              key={item.id}
              name={item.label}
              href={item.href}
              icon={item.icon}
              isActive={isActive}
              isDark={isDark}
              onClick={(e) => handleNavClick(e, item.href, item.label)}
            />
          );
        })}
      </nav>

      {/* Bottom spacer for visual balance */}
      <div className="pb-5" />
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
