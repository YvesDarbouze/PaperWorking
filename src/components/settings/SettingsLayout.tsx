'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSettingsAccess, SettingsSection } from '@/hooks/useSettingsAccess';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsErrorBoundary } from './ErrorBoundary';
import { ArrowLeft, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '@/store/settingsStore';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

// Maps pathnames to settings sections for validation
function getSectionFromPathname(pathname: string): SettingsSection {
  if (pathname.includes('/settings/profile') || pathname.includes('/settings/account')) return 'profile';
  if (pathname.includes('/settings/notifications')) return 'notifications';
  if (pathname.includes('/settings/security') || pathname.includes('/settings/reset-password')) return 'security';
  if (pathname.includes('/settings/integrations')) return 'integrations';
  if (pathname.includes('/settings/team')) return 'team';
  if (pathname.includes('/settings/workspace')) return 'workspace';
  if (pathname.includes('/settings/billing')) return 'billing';
  if (pathname.includes('/settings/data-privacy')) return 'data-privacy';
  return 'profile';
}

const PAGE_HEADERS: Record<string, { title: string; subtitle: string }> = {
  profile: {
    title: 'Personal Profile',
    subtitle: 'Update name, avatar, and account password.'
  },
  notifications: {
    title: 'Alert Preferences',
    subtitle: 'Control own email, push, and web notifications.'
  },
  security: {
    title: 'Personal Security',
    subtitle: 'Turn on individual 2FA and view active sessions.'
  },
  integrations: {
    title: 'Integrations',
    subtitle: 'Connect personal tools like Slack or Google Drive.'
  },
  team: {
    title: 'Team Access',
    subtitle: 'Invite, remove, and change user roles.'
  },
  workspace: {
    title: 'Workspace Identity',
    subtitle: 'Set company name, logo, and global time zone.'
  },
  billing: {
    title: 'Billing Details',
    subtitle: 'Manage plans, update cards, and view invoices.'
  },
  'data-privacy': {
    title: 'Data Control',
    subtitle: 'Export full account history or delete workspace.'
  }
};

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { canAccessSection, userRole } = useSettingsAccess();
  
  const currentSection = getSectionFromPathname(pathname);

  // Responsive state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Start collapsed on tablet screens (768px to 1024px)
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 768 && width <= 1024) {
        setIsSidebarExpanded(false);
      } else {
        setIsSidebarExpanded(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamic role-based override for headers (e.g. Viewer views basics/toggles)
  const getHeaderInfo = () => {
    if (currentSection === 'profile') {
      if (userRole === 'viewer') {
        return {
          title: 'Profile Basics',
          subtitle: 'Edit own contact info and profile image.'
        };
      }
      return {
        title: 'Personal Profile',
        subtitle: 'Update name, avatar, and account password.'
      };
    }

    if (currentSection === 'notifications') {
      if (userRole === 'viewer') {
        return {
          title: 'Notification Toggles',
          subtitle: 'Choose how often to receive team updates.'
        };
      }
      return {
        title: 'Alert Preferences',
        subtitle: 'Control own email, push, and web notifications.'
      };
    }

    if (currentSection === 'security') {
      if (userRole === 'viewer') {
        return {
          title: 'Security Reset',
          subtitle: 'Change own password if necessary.'
        };
      }
      if (userRole === 'admin') {
        return {
          title: 'Security Guardrails',
          subtitle: 'Enforce team-wide Single Sign-On (SSO) or 2FA.'
        };
      }
      return {
        title: 'Personal Security',
        subtitle: 'Turn on individual 2FA and view active sessions.'
      };
    }

    return PAGE_HEADERS[currentSection] || {
      title: 'Settings',
      subtitle: 'Manage your settings and workspace preferences.'
    };
  };

  const {
    userProfile, billing, team, workspace, security, integrations, notifications,
    fetchUserProfile, fetchBilling, fetchTeam, fetchWorkspace, fetchSecurity, fetchIntegrations, fetchNotifications
  } = useSettingsStore();

  const hasSettingsError = !!(
    userProfile.error ||
    billing.error ||
    team.error ||
    workspace.error ||
    security.error ||
    integrations.error ||
    notifications.error
  );

  const handleGlobalRetry = () => {
    if (userProfile.error) fetchUserProfile();
    if (billing.error) fetchBilling();
    if (team.error) fetchTeam();
    if (workspace.error) fetchWorkspace();
    if (security.error) fetchSecurity();
    if (integrations.error) fetchIntegrations();
    if (notifications.error) fetchNotifications();
  };

  const header = getHeaderInfo();

  // Route security gate
  useEffect(() => {
    if (!canAccessSection(currentSection)) {
      toast.error('You do not have permission to access this settings section.');
      router.replace('/dashboard/settings/account');
    }
  }, [currentSection, canAccessSection, router]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800 font-sans antialiased">
      
      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col max-w-[280px] w-full bg-white shadow-2xl animate-in slide-in-from-left duration-350">
            <SettingsSidebar 
              isMobileDrawer 
              onCloseMobileDrawer={() => setIsMobileMenuOpen(false)} 
            />
          </div>
        </div>
      )}

      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        
        {/* Back Navigation Link */}
        <Link
          href="/dashboard"
          onClick={(e) => {
            if (typeof window !== 'undefined' && (window as any).__settingsFormDirty) {
              const confirmed = window.confirm("You have unsaved changes. Leave anyway?");
              if (!confirmed) {
                e.preventDefault();
                return;
              }
              (window as any).__settingsFormDirty = false;
            }
          }}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#557255] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>

        {/* Content & Sidebar Grid */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* Desktop/Tablet Sidebar */}
          <div className="hidden md:block">
            <SettingsSidebar isExpanded={isSidebarExpanded} />
          </div>

          {/* Right Content Pane */}
          <main className="flex-1 w-full min-w-0 bg-white border border-slate-100 rounded-xl p-4 sm:p-6 md:p-8 shadow-sm space-y-6">
            
            {hasSettingsError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between gap-4 animate-in slide-in-from-top duration-200">
                <span>Unable to load settings.</span>
                <button
                  onClick={handleGlobalRetry}
                  className="px-3 py-1.5 rounded-lg bg-red-650 hover:bg-red-750 text-white transition-all font-semibold cursor-pointer border-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Page Header */}
            <div className="border-b border-slate-100 pb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {/* Mobile Menu Open Trigger */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer transition-all"
                  aria-label="Open settings menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Tablet Sidebar Toggle */}
                <button
                  type="button"
                  onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                  className="hidden md:flex lg:hidden w-11 h-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer transition-all shrink-0"
                  aria-label={isSidebarExpanded ? "Collapse settings sidebar" : "Expand settings sidebar"}
                >
                  {isSidebarExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>

                <div>
                  <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                    {header.title}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    {header.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Subpage Children */}
            <SettingsErrorBoundary>
              {children}
            </SettingsErrorBoundary>

          </main>
          
        </div>
        
      </div>
    </div>
  );
}
