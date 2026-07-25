/** @jest-environment jsdom */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { AcquisitionWizard } from "@/components/acquisition/AcquisitionWizard";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";

// ── Mock next/navigation ───────────────────────────────
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock AuthContext
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      getIdToken: jest.fn().mockResolvedValue("mock-token"),
    },
  }),
}));

// Mock framer-motion to render synchronously in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock child step components to avoid complex renders
jest.mock("@/components/acquisition/steps/AddressStep", () => ({
  AddressStep: ({ onNext }: any) => (
    <div data-testid="step-address">
      <button onClick={onNext} data-testid="btn-next-address">Next Address</button>
    </div>
  ),
}));

describe("AcquisitionWizard — DM-16 Progressive Disclosure & Skip Logic", () => {
  beforeEach(() => {
    act(() => {
      useAcquisitionWizard.getState().reset();
    });
  });

  it("starts at address lookup if no pre-resolved address exists", () => {
    render(<AcquisitionWizard />);
    expect(screen.getByTestId("step-address")).toBeTruthy();
  });

  it("auto-skips address lookup step and starts at projectName if placeId is set", async () => {
    act(() => {
      useAcquisitionWizard.getState().setAddress({
        placeId: "place_abc",
        formattedAddress: "123 Main St, Miami, FL 33101",
        displayName: "123 Main St",
      });
    });

    render(<AcquisitionWizard />);

    // Wait for the useEffect skip to fire and render Project Name step
    const heading = await screen.findByText("Name your project");
    expect(heading).toBeTruthy();
    expect(screen.queryByTestId("step-address")).toBeNull();
  });

  it("skips entityName screen and goes from ownership back to purchasePrice if INDIVIDUAL owner", async () => {
    act(() => {
      useAcquisitionWizard.getState().setAddress({
        placeId: "place_abc",
        formattedAddress: "123 Main St, Miami, FL 33101",
      });
      useAcquisitionWizard.getState().goToStep("purchasePrice");
      useAcquisitionWizard.getState().setOwnership({
        ownershipStructure: "INDIVIDUAL",
      });
    });

    render(<AcquisitionWizard />);
    expect(screen.getByText("What is the target purchase price?")).toBeTruthy();

    // Click back button on purchasePrice step
    const backBtn = screen.getByRole("button", { name: /back/i });
    act(() => {
      backBtn.click();
    });

    // Rerender / transition check: should skip entityName and land on ownership structure
    const heading = await screen.findByText("Select ownership structure");
    expect(heading).toBeTruthy();
  });
});
