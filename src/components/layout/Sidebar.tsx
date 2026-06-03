"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useNotification } from "@/context/NotificationContext";
import Logo from "@/components/brand/Logo";
import LogoutButton from "@/components/dashboard/LogoutButton";
import toast from "react-hot-toast";

export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, loading: authLoading } = useAuth();
  const { activeTenantId, switchTenant } = useTenant();
  const { unreadTotal } = useNotification();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavClick = (e: React.MouseEvent, itemHref: string, itemName: string) => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
      if (itemHref === '/dashboard/command-center' || itemName === 'Portfolio') {
        e.preventDefault();
        window.location.href = '/demo';
        return;
      }
      e.preventDefault();
      toast.error(`Demo Mode: Sign up to access ${itemName} features.`, {
        id: 'demo-sidebar-guard',
        style: { background: '#111', color: '#fff', border: '1px solid #333' }
      });
    }
  };

  const primaryNavItems = [
    { name: "Portfolio", href: "/dashboard/command-center", icon: "folder_shared" },
    { name: "Projects", href: "/dashboard/projects", icon: "assignment" },
    { name: "Data Room", href: "/dashboard/data-room", icon: "inventory_2" },
    { name: "Inbox", href: "/dashboard/inbox", icon: "inbox" },
    { name: "Team", href: "/dashboard/team", icon: "group" },
    { name: "Reports", href: "/dashboard/reports", icon: "assessment" },
    { name: "Deal Analyzer", href: "/dashboard/deal-analyzer", icon: "analytics" },
  ];

  const accountNavItems = [
    { name: "Profile", href: "/dashboard/settings/profile", icon: "account_circle" },
    { name: "Billing", href: "/dashboard/settings/billing", icon: "payments" },
    { name: "Settings", href: "/dashboard/settings", icon: "settings" },
  ];

  // Set up workspaces list
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

  const activeWorkspace = workspaces.find((w) => w.id === activeTenantId) || workspaces[0];
  const isPersonal = activeWorkspace?.type === "personal";

  return (
    <aside
      className="hidden md:flex flex-col h-screen w-64 z-50 flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(11,20,26,0.95) 0%, rgba(11,20,26,0.98) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Brand Area */}
      <div className="px-6 pt-6 pb-4">
        <Logo size="lg" href="/dashboard/command-center" />
      </div>

      {/* Scrollable Navigation Area */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-0.5">
        {/* Primary Group */}
        {primaryNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href) || (item.href === "/dashboard/command-center" && pathname === "/dashboard");

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href, item.name)}
              className="group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative"
              style={{
                background: isActive
                  ? 'rgba(45, 212, 191, 0.10)'
                  : 'transparent',
                color: isActive ? '#62fae3' : 'rgba(186, 202, 197, 0.7)',
                borderRight: isActive ? '4px solid #62fae3' : '4px solid transparent',
              }}
            >
              <span
                className="material-symbols-outlined text-[20px] transition-all duration-300"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  color: isActive ? '#62fae3' : undefined,
                }}
              >
                {item.icon}
              </span>

              <span
                className="text-sm transition-colors duration-300 group-hover:translate-x-0.5"
                style={{
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#62fae3' : undefined,
                  letterSpacing: '-0.01em',
                }}
              >
                {item.name}
              </span>

              {/* Inbox badge with pulse */}
              {item.name === "Inbox" && mounted && unreadTotal > 0 && (
                <span
                  className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center relative"
                  style={{
                    background: 'var(--color-primary)',
                    color: '#003731',
                  }}
                >
                  {unreadTotal > 9 ? "9+" : unreadTotal}
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{ background: 'var(--color-primary)' }}
                  />
                </span>
              )}

              {/* Hover bg */}
              {!isActive && (
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
              )}
            </Link>
          );
        })}

        {/* Section Divider: Account */}
        <div className="px-3 pt-6 pb-2">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'rgba(218,228,236,0.25)' }}
          >
            Account
          </p>
        </div>

        {/* Account Group */}
        {accountNavItems.map((item) => {
          const isActive = item.href === "/dashboard/settings"
            ? pathname.startsWith("/dashboard/settings") && pathname !== "/dashboard/settings/profile" && pathname !== "/dashboard/settings/billing"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href, item.name)}
              className="group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative"
              style={{
                background: isActive ? 'rgba(45, 212, 191, 0.10)' : 'transparent',
                color: isActive ? '#62fae3' : 'rgba(186, 202, 197, 0.7)',
                borderRight: isActive ? '4px solid #62fae3' : '4px solid transparent',
              }}
            >
              <span
                className="material-symbols-outlined text-[20px] transition-all duration-300"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  color: isActive ? '#62fae3' : undefined,
                }}
              >
                {item.icon}
              </span>
              <span
                className="text-sm transition-colors duration-300"
                style={{
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#62fae3' : undefined,
                  letterSpacing: '-0.01em',
                }}
              >
                {item.name}
              </span>
              {!isActive && (
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Area: Workspace Switcher and Profile Menu */}
      {!mounted || authLoading || !user || !profile ? (
        <div className="mt-auto pt-4 space-y-3 px-3 pb-4 animate-pulse" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="h-10 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="h-14 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      ) : (
        <div className="mt-auto pt-4 space-y-3 px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Workspace Switcher */}
          <div className="flex flex-col gap-1.5">
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'rgba(218,228,236,0.4)' }}
            >
              acting as:{" "}
              <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>
                {isPersonal ? "Me" : activeWorkspace?.name}
              </span>
            </div>
            <div className="relative">
              <select
                value={activeTenantId || workspaces[0]?.id}
                onChange={(e) => {
                  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
                    toast.error("Demo Mode: Workspaces are read-only.", {
                      id: 'demo-workspace-guard',
                      style: { background: '#111', color: '#fff', border: '1px solid #333' }
                    });
                    return;
                  }
                  switchTenant(e.target.value);
                }}
                aria-label="Select Workspace"
                className="w-full appearance-none text-xs font-bold uppercase tracking-wider py-2 pl-9 pr-8 rounded-lg focus:outline-none transition-all cursor-pointer truncate"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--color-on-surface)',
                  boxShadow: 'none',
                }}
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id} className="bg-surface-container-low text-on-surface">
                    {ws.name}
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(218,228,236,0.4)' }}>
                <span className="material-symbols-outlined text-[16px]">{isPersonal ? "person" : "corporate_fare"}</span>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(218,228,236,0.4)' }}>
                <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
              </div>
            </div>
          </div>

          {/* Profile Menu */}
          <div
            className="flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all duration-200 group cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all duration-200 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-primary) 100%)',
                  color: '#091015',
                }}
              >
                {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "U")}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-on-surface)' }}>
                  {profile?.displayName || user?.displayName || "User"}
                </span>
                <span className="text-[10px] truncate" style={{ color: 'rgba(218,228,236,0.4)' }}>
                  {profile?.role || "Member"}
                </span>
              </div>
            </div>
            <LogoutButton compact className="text-on-surface-variant hover:text-primary rounded-lg hover:bg-white/5" />
          </div>
        </div>
      )}
    </aside>
  );
}
