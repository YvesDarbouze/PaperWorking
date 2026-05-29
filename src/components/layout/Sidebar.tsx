"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useNotification } from "@/context/NotificationContext";
import Logo from "@/components/brand/Logo";
import LogoutButton from "@/components/dashboard/LogoutButton";

export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, loading: authLoading } = useAuth();
  const { activeTenantId, switchTenant } = useTenant();
  const { unreadTotal } = useNotification();

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
    <aside className="hidden md:flex flex-col h-screen w-64 border-r border-white/10 bg-surface/80 dark:bg-surface/80 backdrop-blur-xl py-stack-lg z-50 flex-shrink-0">
      {/* Brand Area */}
      <div className="px-6 mb-stack-lg">
        <Logo size="lg" href="/dashboard/command-center" />
      </div>
      


      {/* Scrollable Navigation Area */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
        {/* Primary Group */}
        {primaryNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href) || (item.href === "/dashboard/command-center" && pathname === "/dashboard");
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                isActive 
                  ? "text-primary font-bold border-r-2 border-primary bg-primary/10" 
                  : "text-on-surface-variant font-medium hover:bg-white/5 hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="font-body-md text-body-md">{item.name}</span>
              {item.name === "Inbox" && unreadTotal > 0 && (
                <span className="ml-auto bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center">
                  {unreadTotal > 9 ? "9+" : unreadTotal}
                </span>
              )}
            </Link>
          );
        })}

        {/* Section Divider: Account */}
        <div className="px-4 pt-6 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? "text-primary font-bold border-r-2 border-primary bg-primary/10" 
                  : "text-on-surface-variant font-medium hover:bg-white/5 hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="font-body-md text-body-md">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Area: Workspace Switcher and Profile Menu */}
      {authLoading || !user || !profile ? (
        <div className="mt-auto pt-4 border-t border-white/10 space-y-4 px-4 animate-pulse">
          <div className="h-10 bg-white/5 rounded-md"></div>
          <div className="h-14 bg-white/5 rounded-xl"></div>
        </div>
      ) : (
        <div className="mt-auto pt-4 border-t border-white/10 space-y-4 px-4">
          {/* Workspace Switcher */}
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
              acting as: <span className="text-primary font-extrabold">{isPersonal ? "Me" : activeWorkspace?.name}</span>
            </div>
            <div className="relative">
              <select
                value={activeTenantId || workspaces[0]?.id}
                onChange={(e) => switchTenant(e.target.value)}
                aria-label="Select Workspace"
                className="w-full appearance-none bg-white/5 border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider py-2 pl-9 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow cursor-pointer truncate"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id} className="bg-surface-container-low text-on-surface">
                    {ws.name}
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">{isPersonal ? "person" : "corporate_fare"}</span>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
              </div>
            </div>
          </div>

          {/* Profile Menu */}
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 text-on-primary-container font-bold text-sm">
                {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "U")}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-label-md text-label-md text-on-surface truncate">
                  {profile?.displayName || user?.displayName || "User"}
                </span>
                <span className="text-[10px] text-on-surface-variant truncate">
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
