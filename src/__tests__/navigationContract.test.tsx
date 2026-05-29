/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "../components/layout/Sidebar";
import { BottomNav } from "../components/layout/BottomNav";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/command-center",
}));

// Mock Auth Context
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "test-user-id" },
    profile: {
      displayName: "Jane Doe",
      role: "Founder",
      personalOrganizationId: "personal-org",
      memberships: {
        "tenant-team-1": { tenantName: "Luminous Capital" },
      },
    },
    loading: false,
  }),
}));

// Mock Tenant Context
const mockSwitchTenant = jest.fn();
jest.mock("@/context/TenantContext", () => ({
  useTenant: () => ({
    activeTenantId: "tenant-team-1",
    switchTenant: mockSwitchTenant,
  }),
}));

// Mock Notification Context
jest.mock("@/context/NotificationContext", () => ({
  useNotification: () => ({
    unreadTotal: 5,
  }),
}));

// Mock child brand/ui components that might rely on other contexts or modules
jest.mock("@/components/brand/Logo", () => {
  return function MockLogo() {
    return <div data-testid="logo">PaperWorking Logo</div>;
  };
});

jest.mock("@/components/dashboard/LogoutButton", () => {
  return function MockLogoutButton() {
    return <button data-testid="logout">Logout</button>;
  };
});

describe("GLOBAL NAVIGATION — FIXED CONTRACT FOR EVERY PAPERWORKING SCREEN", () => {
  it("renders the primary group navigation in the exact contract order, labels, and case", () => {
    render(<Sidebar />);

    const primaryExpected = [
      "Portfolio",
      "Projects",
      "Data Room",
      "Inbox",
      "Team",
      "Reports",
      "Deal Analyzer",
    ];

    // Find all links in the sidebar
    const links = screen.getAllByRole("link");
    const linkTexts = links.map((link) => link.textContent || "");

    // Verify all primary navigation items exist in correct order
    primaryExpected.forEach((name, index) => {
      const match = linkTexts.find((text) => text.includes(name));
      expect(match).toBeTruthy();
      
      // Let's verify exact label (case-sensitive) and unread count for Inbox
      if (name === "Inbox") {
        expect(screen.getByText("Inbox")).toBeTruthy();
        expect(screen.getByText("5")).toBeTruthy(); // 5 unread from NotificationContext mock
      } else {
        expect(screen.getByText(name)).toBeTruthy();
      }
    });

    // Verify the relative ordering of primary group items
    let lastIndex = -1;
    primaryExpected.forEach((name) => {
      const index = linkTexts.findIndex((text) => text.includes(name));
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    });
  });

  it("renders the Section divider 'Account' and the account group in the exact order, labels, and case", () => {
    render(<Sidebar />);

    // Verify Section Divider
    expect(screen.getByText("Account")).toBeTruthy();

    const accountExpected = [
      "Profile",
      "Billing",
      "Settings",
    ];

    const links = screen.getAllByRole("link");
    const linkTexts = links.map((link) => link.textContent || "");

    // Verify account items in correct order
    accountExpected.forEach((name) => {
      expect(screen.getByText(name)).toBeTruthy();
    });

    let lastIndex = -1;
    accountExpected.forEach((name) => {
      const index = linkTexts.findIndex((text) => text.includes(name));
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    });
  });

  it("renders the workspace switcher with acting as exactly as specified in the contract", () => {
    render(<Sidebar />);

    // The active workspace name in mock is "Luminous Capital"
    expect(screen.getByText(/acting as:/i)).toBeTruthy();
    expect(screen.getAllByText("Luminous Capital").length).toBeGreaterThan(0);

    // Verify profile menu options are rendered (name, role, logout button)
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("Founder")).toBeTruthy();
    expect(screen.getByTestId("logout")).toBeTruthy();
  });

  it("renders correct navigation elements in BottomNav for mobile compatibility", () => {
    render(<BottomNav />);

    const bottomExpected = [
      "Portfolio",
      "Projects",
      "Inbox",
      "Reports",
    ];

    bottomExpected.forEach((name) => {
      expect(screen.getByText(name)).toBeTruthy();
    });

    // Check unread count on mobile Inbox
    expect(screen.getByText("5")).toBeTruthy();
  });
});
