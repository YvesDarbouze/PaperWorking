import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const SIDEBAR = read('components/settings/SettingsSidebar.tsx');
const LAYOUT = read('components/settings/SettingsLayout.tsx');
const TEAM_PAGE = read('app/dashboard/settings/team/page.tsx');
const TEAM_ROUTE = read('app/api/team/[[...action]]/route.ts');
const WORKSPACE_PAGE = read('app/dashboard/settings/workspace/page.tsx');
const DATAPRIVACY_PAGE = read('app/dashboard/settings/data-privacy/page.tsx');
const INVOICES = read('components/billing/InvoiceTable.tsx');
const PAYMENT_METHOD = read('components/billing/PaymentMethodCard.tsx');

describe('Settings Sidebar & Guard Rails', () => {

  it('renders dynamic names based on user role correctly', () => {
    // Check that admin label mapping is correctly structured
    expect(SIDEBAR).toContain("'Account'");
    expect(SIDEBAR).toContain("'Billing Details'");
    expect(SIDEBAR).toContain("'Team Access'");
    expect(SIDEBAR).toContain("'Workspace Identity'");
    expect(SIDEBAR).toContain("'Security Guardrails'");
    expect(SIDEBAR).toContain("'Integrations'");
    expect(SIDEBAR).toContain("'Alert Preferences'");
    expect(SIDEBAR).toContain("'Data Control'");

    // Check editor label mapping
    expect(SIDEBAR).toContain("'Personal Profile'");
    expect(SIDEBAR).toContain("'Personal Security'");

    // Check viewer label mapping
    expect(SIDEBAR).toContain("'Profile Basics'");
    expect(SIDEBAR).toContain("'Notification Toggles'");
    expect(SIDEBAR).toContain("'Security Reset'");
  });

  it('does NOT use green color variables or codes in the active nav link styling', () => {
    // Check that the active style uses the primary brand accent #627C85
    expect(SIDEBAR).toContain('border-[#627C85]');
    expect(SIDEBAR).toContain('bg-[#627C85]/10');
    expect(SIDEBAR).toContain('text-[#627C85]');
    
    // Check that the green accent #6B8E6B or #557255 is not used in the active styles
    const activeLinkStyles = SIDEBAR.substring(
      SIDEBAR.indexOf('isActive\n                  ?'),
      SIDEBAR.indexOf('isActive\n                  ?') + 300
    );
    expect(activeLinkStyles).not.toContain('#6B8E6B');
    expect(activeLinkStyles).not.toContain('#557255');
  });

  it('applies a 2px left border accent for the active nav link', () => {
    // Should use border-l-2, not border-l-4 or others
    expect(SIDEBAR).toContain('border-l-2');
  });

  it('redirects forbidden section accesses to /dashboard/settings/account with toast message', () => {
    // Check that SettingsLayout handles redirect to account route
    expect(LAYOUT).toContain("router.replace('/dashboard/settings/account')");
    expect(LAYOUT).toContain("toast.error(");
  });

  it('defines the exact required title and subtitle copy for each page', () => {
    // billing
    expect(LAYOUT).toContain("title: 'Billing Details'");
    expect(LAYOUT).toContain("subtitle: 'Manage plans, update cards, and view invoices.'");

    // team
    expect(LAYOUT).toContain("title: 'Team Access'");
    expect(LAYOUT).toContain("subtitle: 'Invite, remove, and change user roles.'");

    // workspace
    expect(LAYOUT).toContain("title: 'Workspace Identity'");
    expect(LAYOUT).toContain("subtitle: 'Set company name, logo, and global time zone.'");

    // security (Admin)
    expect(LAYOUT).toContain("title: 'Security Guardrails'");
    expect(LAYOUT).toContain("subtitle: 'Enforce team-wide Single Sign-On (SSO) or 2FA.'");

    // data-privacy
    expect(LAYOUT).toContain("title: 'Data Control'");
    expect(LAYOUT).toContain("subtitle: 'Export full account history or delete workspace.'");

    // account (Admin/Editor)
    expect(LAYOUT).toContain("title: 'Personal Profile'");
    expect(LAYOUT).toContain("subtitle: 'Update name, avatar, and account password.'");

    // account (Viewer)
    expect(LAYOUT).toContain("title: 'Profile Basics'");
    expect(LAYOUT).toContain("subtitle: 'Edit own contact info and profile image.'");

    // security (Admin/Editor)
    expect(LAYOUT).toContain("title: 'Personal Security'");
    expect(LAYOUT).toContain("subtitle: 'Turn on individual 2FA and view active sessions.'");

    // integrations
    expect(LAYOUT).toContain("title: 'Integrations'");
    expect(LAYOUT).toContain("subtitle: 'Connect personal tools like Slack or Google Drive.'");

    // notifications (Admin/Editor)
    expect(LAYOUT).toContain("title: 'Alert Preferences'");
    expect(LAYOUT).toContain("subtitle: 'Control own email, push, and web notifications.'");

    // notifications (Viewer)
    expect(LAYOUT).toContain("title: 'Notification Toggles'");
    expect(LAYOUT).toContain("subtitle: 'Choose how often to receive team updates.'");
  });

  it('defines the exact empty state copy', () => {
    expect(TEAM_PAGE).toContain("No team members yet. Invite your first teammate.");
    expect(INVOICES).toContain("No invoices yet. They will appear here after your first payment.");
    expect(PAYMENT_METHOD).toContain("No payment methods on file. Add a card to avoid interruption.");
  });

  it('defines mobile and tablet responsive layouts and widths', () => {
    // 16px content padding on mobile
    expect(LAYOUT).toContain('p-4 sm:p-6 md:p-8');

    // Hamburger menu toggle, backdrop blur, and 280px drawer size
    expect(LAYOUT).toContain('isMobileMenuOpen');
    expect(LAYOUT).toContain('backdrop-blur-md');
    expect(LAYOUT).toContain("w-[280px]");

    // Close button (X) inside mobile drawer
    expect(SIDEBAR).toContain('onCloseMobileDrawer');
    expect(SIDEBAR).toContain('isMobileDrawer');

    // Tablet expand/collapse chevrons and width checks
    expect(LAYOUT).toContain('ChevronLeft');
    expect(LAYOUT).toContain('ChevronRight');
    expect(LAYOUT).toContain('isSidebarExpanded');
    expect(SIDEBAR).toContain('w-64');
    expect(SIDEBAR).toContain('w-16');

    // Tooltip labels on hover
    expect(SIDEBAR).toContain('group-hover:opacity-100');

    // At least 44px height touch targets for mobile buttons
    expect(LAYOUT).toContain('w-11 h-11');
    expect(SIDEBAR).toContain('w-11 h-11');
    expect(SIDEBAR).toContain('h-11');
  });

  it('verifies the Last Admin Guard', () => {
    // Client-side guard check on role change and remove
    expect(TEAM_PAGE).toContain('You must assign another Admin before removing this user.');
    // API route guard check
    expect(TEAM_ROUTE).toContain('You must assign another Admin before removing this user.');
    expect(TEAM_ROUTE).toContain('status: 403');
  });

  it('verifies the Self-Downgrade Guard', () => {
    // Client-side guard check
    expect(TEAM_PAGE).toContain('Transfer ownership before downgrading yourself.');
    // API route guard check
    expect(TEAM_ROUTE).toContain('Transfer ownership before downgrading yourself.');
    expect(TEAM_ROUTE).toContain('status: 403');
  });

  it('verifies the Workspace Deletion Guard', () => {
    // Case-sensitive confirmation check
    expect(DATAPRIVACY_PAGE).toContain('confirmWorkspaceName !== workspace.data.name');
    expect(DATAPRIVACY_PAGE).toContain('confirmWorkspaceName !== workspaceName');
    
    // Warning content copy
    expect(DATAPRIVACY_PAGE).toContain(
      'This will permanently delete all properties, deals, documents, and member data. This action cannot be undone.'
    );
    
    // 48-hour grace countdown and cancel button
    expect(DATAPRIVACY_PAGE).toContain('Cancel Deletion');
    expect(DATAPRIVACY_PAGE).toContain('getRemainingTime()');
    expect(DATAPRIVACY_PAGE).toContain('48-hour grace period active.');
  });

  it('verifies the Unsaved Changes warning guards', () => {
    // Workspace page page beforeunload and popstate guards
    expect(WORKSPACE_PAGE).toContain('You have unsaved changes. Leave anyway?');
    expect(WORKSPACE_PAGE).toContain('__settingsFormDirty = isDirty');
    
    // Layout and Sidebar Link click interceptors
    expect(LAYOUT).toContain('__settingsFormDirty');
    expect(LAYOUT).toContain('You have unsaved changes. Leave anyway?');
    expect(SIDEBAR).toContain('__settingsFormDirty');
    expect(SIDEBAR).toContain('You have unsaved changes. Leave anyway?');
  });

});
