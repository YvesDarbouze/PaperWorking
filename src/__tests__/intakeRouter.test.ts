import { createProject, updateProject, mapPostgresProjectToFrontend } from "@/lib/db/projects";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";

const mockCreate = jest.fn((args: any) => Promise.resolve({ id: "new-project-id", ...args?.data }));
const mockUpdate = jest.fn((args: any) => Promise.resolve({ id: args?.where?.id, ...args?.data }));

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
    mockCreate.mockClear();
    mockUpdate.mockClear();
  });

  describe("Database Operations & Model Schema Mapping", () => {
    it("should create a project with default intake/phase values", async () => {
      mockCreate.mockResolvedValueOnce({
        id: "new-project-id",
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        status: "acquisition",
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
      expect(proj.status).toBe("acquisition");
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
          status: "acquisition",
        }),
      });
    });

    it("should set correct fields based on journey choice", async () => {

      // Under Contract -> Phase 1, CLEAR_TO_CLOSE, retrospective = false
      const proj1 = await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 1,
        acquisitionStatus: "CLEAR_TO_CLOSE",
        disposition_type: "SALE",
        project_entry_point: "under_contract",
        property_type: "Single Family",
        unit_count: 1,
        list_price: 35000000,
        retrospective: false,
      });
      expect(proj1.entryStage).toBe("under_contract");
      expect(proj1.propertyType).toBe("Single Family");
      expect(proj1.units).toBe(1);
      expect(proj1.dispositionType).toBe("SALE");
      expect(Number(proj1.askingPriceCents)).toBe(35000000);
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          acquisitionStatus: "CLEAR_TO_CLOSE",
          status: "acquisition",
          dispositionType: "SALE",
          entryStage: "under_contract",
          propertyType: "Single Family",
          units: 1,
          askingPriceCents: BigInt(35000000),
          retrospective: false,
        }),
      });

      // Owned, closing in progress -> Phase 2: Fund, status = OWNED
      const proj2 = await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 2,
        acquisitionStatus: "OWNED",
        dispositionType: "LEASE",
        project_entry_point: "owned_closing",
        retrospective: false,
      });
      expect(proj2.entryStage).toBe("owned_closing");
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          acquisitionStatus: "OWNED",
          status: "fund",
          dispositionType: "LEASE",
          entryStage: "owned_closing",
          retrospective: false,
        }),
      });

      // Renovating/marketing -> Phase 3: Hold, status = OWNED
      const proj3 = await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 3,
        acquisitionStatus: "OWNED",
        dispositionType: "SALE",
        project_entry_point: "renovating_marketing",
        retrospective: false,
      });
      expect(proj3.entryStage).toBe("renovating_marketing");
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          acquisitionStatus: "OWNED",
          status: "hold",
          dispositionType: "SALE",
          entryStage: "renovating_marketing",
          retrospective: false,
        }),
      });

      // Already rented, leased, or sold -> Retrospective Mode (Phase 4: Exit, status = CLOSED, retrospective = true)
      const proj4 = await createProject({
        createdById: "test-user-uid",
        addressLine: "123 Main St",
        currentPhase: 4,
        acquisitionStatus: "CLOSED",
        dispositionType: "LEASE",
        project_entry_point: "rented_leased_sold",
        retrospective: true,
      });
      expect(proj4.entryStage).toBe("rented_leased_sold");
      expect(mockCreate).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          createdById: "test-user-uid",
          addressLine: "123 Main St",
          acquisitionStatus: "CLOSED",
          status: "exit",
          dispositionType: "LEASE",
          entryStage: "rented_leased_sold",
          retrospective: true,
        }),
      });
    });

    it("should allow updating status/currentPhase, dispositionType/disposition_type, retrospective, and project_entry_point", async () => {
      mockUpdate.mockResolvedValueOnce({
        id: "project-id",
        status: "hold",
        dispositionType: "LEASE",
        retrospective: true,
        entryStage: "renovating_marketing",
        propertyType: "Multi Family",
        units: 4,
        askingPriceCents: BigInt(45000000),
      });

      const updated = await updateProject("project-id", {
        currentPhase: 3,
        disposition_type: "LEASE",
        retrospective: true,
        project_entry_point: "renovating_marketing",
        property_type: "Multi Family",
        unit_count: 4,
        list_price: 45000000,
      });

      expect(updated.status).toBe("hold");
      expect(updated.dispositionType).toBe("LEASE");
      expect(updated.retrospective).toBe(true);
      expect(updated.entryStage).toBe("renovating_marketing");
      expect(updated.propertyType).toBe("Multi Family");
      expect(updated.units).toBe(4);
      expect(Number(updated.askingPriceCents)).toBe(45000000);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "project-id" },
        data: expect.objectContaining({
          status: "hold",
          dispositionType: "LEASE",
          retrospective: true,
          entryStage: "renovating_marketing",
          propertyType: "Multi Family",
          units: 4,
          askingPriceCents: BigInt(45000000),
        }),
      }));
    });

    it("should map gross_annual_rent to firstPassRentCents divided by 12", async () => {
      mockUpdate.mockResolvedValueOnce({
        id: "project-id",
        firstPassRentCents: BigInt(200000),
      });

      const updated = await updateProject("project-id", {
        gross_annual_rent: 2400000,
      });

      const mapped = mapPostgresProjectToFrontend(updated);
      expect(Number(updated.firstPassRentCents)).toBe(200000);
      expect(mapped?.gross_annual_rent).toBe(2400000);

      expect(mockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
        where: { id: "project-id" },
        data: expect.objectContaining({
          firstPassRentCents: BigInt(200000),
        }),
      }));
    });

    it("should update project beds and baths inside propertyFacts", async () => {
      mockUpdate.mockResolvedValueOnce({
        id: "project-id",
        propertyFacts: {
          beds: 3,
          baths: 2.5,
        },
      });

      const updated = await updateProject("project-id", {
        beds: 3,
        baths: 2.5,
      });

      const mapped = mapPostgresProjectToFrontend(updated);
      expect(mapped?.beds).toBe(3);
      expect(mapped?.baths).toBe(2.5);

      expect(mockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
        where: { id: "project-id" },
        data: expect.objectContaining({
          propertyFacts: expect.objectContaining({
            upsert: expect.objectContaining({
              create: expect.objectContaining({ beds: 3, baths: 2.5 }),
              update: expect.objectContaining({ beds: 3, baths: 2.5 }),
            }),
          }),
        }),
      }));
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
      expect(updatedState.currentStep).toBe("intake");
      expect(updatedState.intake).toEqual({});
      expect(updatedState.completion.intake).toBe("empty");
    });
  });
});
