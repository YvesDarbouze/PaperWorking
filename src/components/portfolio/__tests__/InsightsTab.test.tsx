/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import InsightsTab from "../InsightsTab";
import type { Project } from "@/types/schema";

// Mock Recharts ResponsiveContainer to render children cleanly in Jest JSDOM
jest.mock("recharts", () => {
  const originalModule = jest.requireActual("recharts");
  return {
    ...originalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

// Mock the project store
const mockProjects: Project[] = [
  {
    id: "p1",
    organizationId: "org-1",
    propertyName: "Oceanfront Villa",
    strategyType: "Rent",
    currentPhase: 4,
    status: "Rented",
    address: "123 Ocean Drive",
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerUid: "user-1",
    members: {},
    financials: {
      purchasePrice: 500000,
      estimatedARV: 600000,
      estimatedCurrentValue: 600000,
      loanAmount: 350000,
      loanInterestRate: 5,
      loanTermYears: 30,
      monthlyGrossRent: 4000,
      holdingCostTaxes: 400,
      holdingCostInsurance: 200,
      holdingCostUtilities: 150,
      vacancyRatePercent: 5,
      costs: [],
    },
  },
];

jest.mock("@/store/projectStore", () => {
  return {
    useProjectStore: (selector: any) => {
      return selector({ projects: mockProjects });
    },
  };
});

// Mock the ThemeProvider
jest.mock("@/lib/utils/ThemeProvider", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

describe("InsightsTab Component", () => {
  it("renders the portfolio rollup cards, charts, and comparison table", () => {
    render(<InsightsTab />);

    // Check rollup headers
    expect(screen.getByText("Capitalization Rate")).toBeTruthy();
    expect(screen.getByText("Cash-on-Cash Return")).toBeTruthy();
    expect(screen.getByText("Operating Expense Ratio (OER)")).toBeTruthy();

    // Check chart titles
    expect(screen.getByText("10-Year Debt Service Coverage Ratio (DSCR)")).toBeTruthy();
    expect(screen.getByText("10-Year Operating Income vs Cash Flow")).toBeTruthy();

    // Check property specific values in table
    expect(screen.getByText("Oceanfront Villa")).toBeTruthy();
  });
});
