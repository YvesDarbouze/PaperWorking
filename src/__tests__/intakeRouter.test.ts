import { createProject, updateProject } from "@/lib/db/projects";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";

const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    reilProject: {
      create: (args: any) => mockCreate(args),
      update: (args: any) => mockUpdate(args),
    },
  },
}));

describe("CARD 0: Intake Router Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Database Operations & Model Schema Mapping", () => {
    it("should create a project with default intake/phase values", async () => {
      mockCreate.mockResolvedValueOnce({
        id: "new-project-id",
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 1,
        dealType: null,
        retrospective: false,
        acquisitionStatus: "PROSPECT",
      });

      const proj = await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        city: "Miami",
        state: "FL",
        zip: "33101",
      });

      expect(proj.id).toBeDefined();
      expect(proj.currentPhase).toBe(1);
      expect(proj.dealType).toBeNull();
      expect(proj.retrospective).toBe(false);
      expect(proj.acquisitionStatus).toBe("PROSPECT");

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          city: "Miami",
          state: "FL",
          zip: "33101",
          lat: null,
          lng: null,
          placeId: null,
          displayName: null,
          acquisitionStatus: "PROSPECT",
          ownershipStructure: null,
          currentPhase: 1,
          dealType: null,
          dispositionType: null,
          entryStage: null,
          retrospective: false,
          subStrategy: null,
          lastActiveStage: null,
          overrideReason: null,
          propertyType: null,
          units: null,
          condition: null,
        },
      });
    });

    it("should set correct fields based on journey choice", async () => {
      mockCreate.mockResolvedValue({
        id: "new-project-id",
      });

      // Under Contract -> Phase 1, CLEAR_TO_CLOSE, retrospective = false
      await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 1,
        acquisitionStatus: "CLEAR_TO_CLOSE",
        dealType: "SALE",
        dispositionType: "SALE",
        entryStage: "under_contract",
        retrospective: false,
      });
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: {
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          city: "",
          state: "",
          zip: "",
          lat: null,
          lng: null,
          placeId: null,
          displayName: null,
          acquisitionStatus: "CLEAR_TO_CLOSE",
          ownershipStructure: null,
          currentPhase: 1,
          dealType: "SALE",
          dispositionType: "SALE",
          entryStage: "under_contract",
          retrospective: false,
          subStrategy: null,
          lastActiveStage: null,
          overrideReason: null,
          propertyType: null,
          units: null,
          condition: null,
        },
      });

      // Owned, closing in progress -> Phase 2: Fund, status = OWNED
      await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 2,
        acquisitionStatus: "OWNED",
        dealType: "LEASE",
        dispositionType: "LEASE",
        entryStage: "owned_closing",
        retrospective: false,
      });
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: {
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          city: "",
          state: "",
          zip: "",
          lat: null,
          lng: null,
          placeId: null,
          displayName: null,
          acquisitionStatus: "OWNED",
          ownershipStructure: null,
          currentPhase: 2,
          dealType: "LEASE",
          dispositionType: "LEASE",
          entryStage: "owned_closing",
          retrospective: false,
          subStrategy: null,
          lastActiveStage: null,
          overrideReason: null,
          propertyType: null,
          units: null,
          condition: null,
        },
      });

      // Renovating/marketing -> Phase 3: Hold, status = OWNED
      await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 3,
        acquisitionStatus: "OWNED",
        dealType: "SALE",
        dispositionType: "SALE",
        entryStage: "renovating_marketing",
        retrospective: false,
      });
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: {
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          city: "",
          state: "",
          zip: "",
          lat: null,
          lng: null,
          placeId: null,
          displayName: null,
          acquisitionStatus: "OWNED",
          ownershipStructure: null,
          currentPhase: 3,
          dealType: "SALE",
          dispositionType: "SALE",
          entryStage: "renovating_marketing",
          retrospective: false,
          subStrategy: null,
          lastActiveStage: null,
          overrideReason: null,
          propertyType: null,
          units: null,
          condition: null,
        },
      });

      // Already rented, leased, or sold -> Retrospective Mode (Phase 4: Exit, status = CLOSED, retrospective = true)
      await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 4,
        acquisitionStatus: "CLOSED",
        dealType: "LEASE",
        dispositionType: "LEASE",
        entryStage: "rented_leased_sold",
        retrospective: true,
      });
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: {
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          city: "",
          state: "",
          zip: "",
          lat: null,
          lng: null,
          placeId: null,
          displayName: null,
          acquisitionStatus: "CLOSED",
          ownershipStructure: null,
          currentPhase: 4,
          dealType: "LEASE",
          dispositionType: "LEASE",
          entryStage: "rented_leased_sold",
          retrospective: true,
          subStrategy: null,
          lastActiveStage: null,
          overrideReason: null,
          propertyType: null,
          units: null,
          condition: null,
        },
      });
    });

    it("should allow updating currentPhase, dealType, and retrospective", async () => {
      mockUpdate.mockResolvedValueOnce({
        id: "project-id",
        currentPhase: 3,
        dealType: "lease",
        retrospective: true,
      });

      const updated = await updateProject("project-id", {
        currentPhase: 3,
        dealType: "lease",
        retrospective: true,
      });

      expect(updated.currentPhase).toBe(3);
      expect(updated.dealType).toBe("lease");
      expect(updated.retrospective).toBe(true);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "project-id" },
        data: {
          currentPhase: 3,
          dealType: "lease",
          retrospective: true,
          subStrategy: null,
          lastActiveStage: null,
          overrideReason: null,
          propertyType: null,
          units: null,
          condition: null,
        },
      });
    });
  });

  describe("Zustand Acquisition Wizard Store", () => {
    it("should initialize with empty intake and 'intake' step", () => {
      const state = useAcquisitionWizard.getState();
      expect(state.currentStep).toBe("intake");
      expect(state.intake).toEqual({});
      expect(state.completion.intake).toBe("empty");
    });

    it("should transition to partial or done based on intake fields", () => {
      const store = useAcquisitionWizard.getState();
      
      // Select journey only
      store.setIntake({ journey: "under_contract" });
      let updatedState = useAcquisitionWizard.getState();
      expect(updatedState.intake.journey).toBe("under_contract");
      expect(updatedState.completion.intake).toBe("partial");

      // Select dealType also
      store.setIntake({ dealType: "SALE" });
      updatedState = useAcquisitionWizard.getState();
      expect(updatedState.intake.dealType).toBe("SALE");
      expect(updatedState.completion.intake).toBe("done");
    });

    it("should reset correctly", () => {
      const store = useAcquisitionWizard.getState();
      store.setIntake({ journey: "targeting", dealType: "LEASE" });
      store.reset();

      const updatedState = useAcquisitionWizard.getState();
      expect(updatedState.currentStep).toBe("intake");
      expect(updatedState.intake).toEqual({});
      expect(updatedState.completion.intake).toBe("empty");
    });
  });
});
