'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettingsAccess, SettingsSection } from '@/hooks/useSettingsAccess';
import { User, Bell, Shield, Share2, Users, Briefcase, CreditCard, Lock, X } from 'lucide-react';

interface SidebarItem {
  name: string;
  section: SettingsSection;
  href: string;
  icon: React.ReactNode;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { name: 'Profile', section: 'profile', href: '/dashboard/settings/profile', icon: <User className="w-5 h-5" /> },
  { name: 'Notifications', section: 'notifications', href: '/dashboard/settings/notifications', icon: <Bell className="w-5 h-5" /> },
  { name: 'Security', section: 'security', href: '/dashboard/settings/security', icon: <Shield className="w-5 h-5" /> },
  { name: 'Integrations', section: 'integrations', href: '/dashboard/settings/integrations', icon: <Share2 className="w-5 h-5" /> },
  { name: 'Team & Access', section: 'team', href: '/dashboard/settings/team', icon: <Users className="w-5 h-5" /> },
  { name: 'Workspace', section: 'workspace', href: '/dashboard/settings/workspace', icon: <Briefcase className="w-5 h-5" /> },
  { name: 'Billing', section: 'billing', href: '/dashboard/settings/billing', icon: <CreditCard className="w-5 h-5" /> },
  { name: 'Data & Privacy', section: 'data-privacy', href: '/dashboard/settings/data-privacy', icon: <Lock className="w-5 h-5" /> },
];

interface SettingsSidebarProps {
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
  isExpanded?: boolean;
}

export function SettingsSidebar({
  isMobileDrawer = false,
  onCloseMobileDrawer,
  isExpanded = true,
}: SettingsSidebarProps) {
  const pathname = usePathname() || '';
  const { canAccessSection, userRole } = useSettingsAccess();

  // Helper to format role badge
  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Admin';
    if (role === 'editor') return 'Editor';
    return 'Viewer';
  };

  return (
    <aside
      className={`flex-shrink-0 flex flex-col gap-6 transition-all duration-300 ${
        isMobileDrawer
          ? 'w-[280px] h-full bg-white p-6 shadow-2xl overflow-y-auto border-r border-slate-100'
          : isExpanded
          ? 'w-64'
          : 'w-16'
      }`}
    >
      {/* Drawer Header for Mobile */}
      {isMobileDrawer && (
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Access Status</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">acting as profile</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="w-11 h-11 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer transition-all"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Role Badge Card (Desktop/Tablet) */}
      {!isMobileDrawer && (
        <div className={`bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center transition-all ${
          isExpanded ? 'justify-between' : 'justify-center h-14'
        }`}>
          {isExpanded ? (
            <>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Access Status</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">acting as profile</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                userRole === 'admin'
                  ? 'bg-[#6B8E6B]/15 text-[#557255] border-[#6B8E6B]/30'
                  : userRole === 'editor'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                {getRoleLabel(userRole)}
              </span>
            </>
          ) : (
            <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold border ${
              userRole === 'admin'
                ? 'bg-[#6B8E6B]/15 text-[#557255] border-[#6B8E6B]/30'
                : userRole === 'editor'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              {getRoleLabel(userRole).slice(0, 1)}
            </span>
          )}
        </div>
      )}

      {/* Navigation List */}
      <nav className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-1">
        {SIDEBAR_ITEMS.map((item) => {
          if (!canAccessSection(item.section)) return null;

          const targetHref = item.section === 'security' && userRole === 'viewer'
            ? '/dashboard/settings/reset-password'
            : item.href;

          const isActive = pathname === targetHref || 
            (item.section === 'profile' && pathname === '/dashboard/settings/account') ||
            (item.section === 'security' && userRole === 'viewer' && pathname === '/dashboard/settings/reset-password');

          // Dynamically determine name based on role
          const displayName = (() => {
            if (userRole === 'admin') {
              if (item.section === 'profile') return 'Account';
              if (item.section === 'billing') return 'Billing Details';
              if (item.section === 'team') return 'Team Access';
              if (item.section === 'workspace') return 'Workspace Identity';
              if (item.section === 'security') return 'Security Guardrails';
              if (item.section === 'integrations') return 'Integrations';
              if (item.section === 'notifications') return 'Alert Preferences';
              if (item.section === 'data-privacy') return 'Data Control';
            } else if (userRole === 'editor') {
              if (item.section === 'profile') return 'Personal Profile';
              if (item.section === 'security') return 'Personal Security';
              if (item.section === 'integrations') return 'Integrations';
              if (item.section === 'notifications') return 'Alert Preferences';
            } else if (userRole === 'viewer') {
              if (item.section === 'profile') return 'Profile Basics';
              if (item.section === 'notifications') return 'Notification Toggles';
              if (item.section === 'security') return 'Security Reset';
            }
            return item.name;
          })();

          return (
            <div key={item.href} className="relative group">
              <Link
                href={targetHref}
                onClick={(e) => {
                  if (typeof window !== 'undefined' && (window as any).__settingsFormDirty) {
                    const confirmed = window.confirm("You have unsaved changes. Leave anyway?");
                    if (!confirmed) {
                      e.preventDefault();
                      return;
                    }
                    (window as any).__settingsFormDirty = false;
                  }
                  if (isMobileDrawer && onCloseMobileDrawer) {
                    onCloseMobileDrawer();
                  }
                }}
                className={`flex items-center gap-3 h-11 px-3 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'border-l-2 border-[#627C85] bg-[#627C85]/10 text-[#627C85] font-semibold rounded-l-none'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className={isActive ? 'text-[#627C85]' : 'text-slate-400'}>
                  {item.icon}
                </div>
                {(isExpanded || isMobileDrawer) && (
                  <span className="truncate">{displayName}</span>
                )}
              </Link>
              {/* Tooltip on hover when collapsed */}
              {!isExpanded && !isMobileDrawer && (
                <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
                  {displayName}
                </span>
              )}
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
