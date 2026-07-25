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
        dispositionType: null,
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
      expect(proj.dispositionType).toBeNull();
      expect(proj.retrospective).toBe(false);
      expect(proj.acquisitionStatus).toBe("PROSPECT");

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          city: "Miami",
          state: "FL",
          zip: "33101",
          acquisitionStatus: "PROSPECT",
          currentPhase: 1,
        }),
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
        dispositionType: "SALE",
        entryStage: "under_contract",
        retrospective: false,
      });
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          acquisitionStatus: "CLEAR_TO_CLOSE",
          currentPhase: 1,
          dispositionType: "SALE",
          entryStage: "under_contract",
          retrospective: false,
        }),
      });

      // Owned, closing in progress -> Phase 2: Fund, status = OWNED
      await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 2,
        acquisitionStatus: "OWNED",
        dispositionType: "LEASE",
        entryStage: "owned_closing",
        retrospective: false,
      });
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          acquisitionStatus: "OWNED",
          currentPhase: 2,
          dispositionType: "LEASE",
          entryStage: "owned_closing",
          retrospective: false,
        }),
      });

      // Renovating/marketing -> Phase 3: Hold, status = OWNED
      await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 3,
        acquisitionStatus: "OWNED",
        dispositionType: "SALE",
        entryStage: "renovating_marketing",
        retrospective: false,
      });
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          acquisitionStatus: "OWNED",
          currentPhase: 3,
          dispositionType: "SALE",
          entryStage: "renovating_marketing",
          retrospective: false,
        }),
      });

      // Already rented, leased, or sold -> Retrospective Mode (Phase 4: Exit, status = CLOSED, retrospective = true)
      await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 4,
        acquisitionStatus: "CLOSED",
        dispositionType: "LEASE",
        entryStage: "rented_leased_sold",
        retrospective: true,
      });
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          acquisitionStatus: "CLOSED",
          currentPhase: 4,
          dispositionType: "LEASE",
          entryStage: "rented_leased_sold",
          retrospective: true,
        }),
      });
    });

    it("should allow updating currentPhase, dispositionType, and retrospective", async () => {
      mockUpdate.mockResolvedValueOnce({
        id: "project-id",
        currentPhase: 3,
        dispositionType: "lease",
        retrospective: true,
      });

      const updated = await updateProject("project-id", {
        currentPhase: 3,
        dispositionType: "lease",
        retrospective: true,
      });

      expect(updated.currentPhase).toBe(3);
      expect(updated.dispositionType).toBe("lease");
      expect(updated.retrospective).toBe(true);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "project-id" },
        data: expect.objectContaining({
          currentPhase: 3,
          dispositionType: "lease",
          retrospective: true,
        }),
      }));
    });
  });

  describe("Zustand Acquisition Wizard Store", () => {
    it("should initialize with empty intake and 'address' step", () => {
      const state = useAcquisitionWizard.getState();
      expect(state.currentStep).toBe("address");
      expect(state.intake).toEqual({ journey: "targeting", dispositionType: "" });
      expect(state.completion.intake).toBe("partial");
    });

    it("should transition to partial or done based on intake fields", () => {
      const store = useAcquisitionWizard.getState();
      
      // Select journey only
      store.setIntake({ journey: "under_contract" });
      let updatedState = useAcquisitionWizard.getState();
      expect(updatedState.intake.journey).toBe("under_contract");
      expect(updatedState.completion.intake).toBe("partial");

      // Select dispositionType also
      store.setIntake({ dispositionType: "SALE" });
      updatedState = useAcquisitionWizard.getState();
      expect(updatedState.intake.dispositionType).toBe("SALE");
      expect(updatedState.completion.intake).toBe("done");
    });

    it("should reset correctly", () => {
      const store = useAcquisitionWizard.getState();
      store.setIntake({ journey: "targeting", dispositionType: "LEASE" });
      store.reset();

      const updatedState = useAcquisitionWizard.getState();
      expect(updatedState.currentStep).toBe("address");
      expect(updatedState.intake).toEqual({ journey: "targeting", dispositionType: "" });
      expect(updatedState.completion.intake).toBe("partial");
    });
  });
});
