import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Step definitions ─────────────────────────────────────────────────────────

export const WIZARD_STEPS = [
  { key: "address",       label: "Address",       icon: "location_on" },
  { key: "projectName",   label: "Project Name",  icon: "badge" },
  { key: "strategy",      label: "Strategy",      icon: "explore" },
  { key: "status",        label: "Status",        icon: "flag" },
  { key: "propertyType",  label: "Property Type", icon: "home" },
  { key: "units",         label: "Units",         icon: "view_cozy" },
  { key: "condition",     label: "Condition",     icon: "build" },
  { key: "ownership",     label: "Ownership",     icon: "account_tree" },
  { key: "entityName",    label: "Entity Details",icon: "corporate_fare" },
  { key: "purchasePrice", label: "Purchase Price",icon: "payments" },
  { key: "rehabBudget",   label: "Rehab Budget",  icon: "construction" },
  { key: "review",        label: "Review",        icon: "fact_check" },
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number]["key"] | "property" | "terms" | "intake";
export type StepCompletion = "empty" | "partial" | "done";

// ─── Form data shapes ─────────────────────────────────────────────────────────

export interface AddressData {
  placeId:          string;
  formattedAddress: string;
  displayName:      string;
  addressLine:      string;
  city:             string;
  state:            string;
  zip:              string;
  lat:              number;
  lng:              number;
  apn?:             string;
  sqft?:            number;
  lotSqft?:         number;
  yearBuilt?:       number;
}

export interface IntakeData {
  journey: "targeting" | "under_contract" | "owned_closing" | "renovating_marketing" | "rented_leased_sold" | "";
  dispositionType: "SALE" | "LEASE" | "RENT" | "";
}

export interface StatusData {
  acquisitionStatus: string;
}

export interface OwnershipData {
  ownershipStructure: string;
  entityType?:        string;
  entityName?:        string;
  coOwners?:          string[];
}

export interface TermsData {
  offerMadeCents?:       number;
  offerDate?:            string;
  sellerResponse?:       string;
  counterPriceCents?:    number;
  acceptedPriceCents?:   number;
  earnestMoneyCents?:    number;
  estClosingCostsCents?: number;
  amountPaidCents?:      number;
}

// ─── Store state ──────────────────────────────────────────────────────────────

interface WizardState {
  // Persistence
  projectId:   string | null;
  currentStep: WizardStepKey;
  completion:  Record<WizardStepKey, StepCompletion>;
  savedAt:     string | null;
  isSaving:    boolean;

  // Form data
  address:   Partial<AddressData>;
  projectName: string;
  strategy: "SALE" | "LEASE" | "RENT" | "";
  journey: "targeting" | "under_contract" | "owned_closing" | "renovating_marketing" | "rented_leased_sold" | "";
  status:    Partial<StatusData>;
  propertyType: string;
  units:      number;
  condition:  string;
  ownership: Partial<OwnershipData>;
  purchasePrice: number; // in cents
  rehabBudget:   number; // in cents
  terms:     Partial<TermsData>;
  intake:    IntakeData;

  // Actions
  setProjectId:    (id: string | null) => void;
  goToStep:        (step: WizardStepKey) => void;
  setAddress:      (data: Partial<AddressData>) => void;
  setProjectName:  (name: string) => void;
  setStrategy:     (strat: "SALE" | "LEASE" | "RENT" | "") => void;
  setJourney:      (journey: "targeting" | "under_contract" | "owned_closing" | "renovating_marketing" | "rented_leased_sold" | "") => void;
  setStatus:       (data: Partial<StatusData>) => void;
  setPropertyType: (type: string) => void;
  setUnits:        (count: number) => void;
  setCondition:    (cond: string) => void;
  setOwnership:    (data: Partial<OwnershipData>) => void;
  setPurchasePrice:(price: number) => void;
  setRehabBudget:  (budget: number) => void;
  setTerms:        (data: Partial<TermsData>) => void;
  setIntake:       (data: Partial<IntakeData>) => void;
  setStepDone:     (step: WizardStepKey) => void;
  setStepPartial:  (step: WizardStepKey) => void;
  setSaving:       (v: boolean) => void;
  markSaved:       () => void;
  reset:           () => void;
}

const INITIAL_COMPLETION: Record<WizardStepKey, StepCompletion> = {
  address:       "empty",
  projectName:   "empty",
  strategy:      "empty",
  status:        "empty",
  propertyType:  "empty",
  units:         "empty",
  condition:     "empty",
  ownership:     "empty",
  entityName:    "empty",
  purchasePrice: "empty",
  rehabBudget:   "empty",
  review:        "empty",
  property:      "empty",
  terms:         "empty",
  intake:        "partial",
};

export const useAcquisitionWizard = create<WizardState>()(
  persist(
    (set) => ({
      projectId:   null,
      currentStep: "address",
      completion:  { ...INITIAL_COMPLETION },
      savedAt:     null,
      isSaving:    false,

      address:   {},
      projectName: "",
      strategy: "",
      journey: "targeting",
      status:    { acquisitionStatus: "PROSPECT" },
      propertyType: "Single Family",
      units:      1,
      condition:  "turnkey",
      ownership:   { ownershipStructure: "INDIVIDUAL" },
      purchasePrice: 0,
      rehabBudget:   0,
      terms:     {},
      intake:    { journey: "targeting", dispositionType: "" },

      setProjectId: (id) => set({ projectId: id }),

      goToStep: (step) => set({ currentStep: step }),

      setAddress: (data) =>
        set((s) => ({
          address:    { ...s.address, ...data },
          completion: {
            ...s.completion,
            address: data.placeId ? "done" : "partial",
          },
        })),

      setProjectName: (name) =>
        set((s) => ({
          projectName: name,
          completion: {
            ...s.completion,
            projectName: name.trim() ? "done" : "empty",
          },
        })),

      setStrategy: (strat) =>
        set((s) => ({
          strategy: strat,
          completion: {
            ...s.completion,
            strategy: strat ? "done" : "empty",
          },
        })),

      setJourney: (journey) =>
        set((s) => ({
          journey,
          intake: { ...s.intake, journey },
        })),

      setStatus: (data) =>
        set((s) => ({
          status:     { ...s.status, ...data },
          completion: {
            ...s.completion,
            status: data.acquisitionStatus ? "done" : "partial",
          },
        })),

      setPropertyType: (type) =>
        set((s) => ({
          propertyType: type,
          completion: {
            ...s.completion,
            propertyType: type ? "done" : "empty",
          },
        })),

      setUnits: (count) =>
        set((s) => ({
          units: count,
          completion: {
            ...s.completion,
            units: count >= 0 ? "done" : "empty",
          },
        })),

      setCondition: (cond) =>
        set((s) => ({
          condition: cond,
          completion: {
            ...s.completion,
            condition: cond ? "done" : "empty",
          },
        })),

      setOwnership: (data) =>
        set((s) => {
          const merged = { ...s.ownership, ...data };
          const isDone = !!merged.ownershipStructure;
          return {
            ownership:  merged,
            completion: {
              ...s.completion,
              ownership: isDone ? "done" : "partial",
              entityName: merged.ownershipStructure === "ENTITY" 
                ? (merged.entityName ? "done" : "partial")
                : "done",
            },
          };
        }),

      setPurchasePrice: (price) =>
        set((s) => ({
          purchasePrice: price,
          completion: {
            ...s.completion,
            purchasePrice: price > 0 ? "done" : "empty",
          },
        })),

      setRehabBudget: (budget) =>
        set((s) => ({
          rehabBudget: budget,
          completion: {
            ...s.completion,
            rehabBudget: budget >= 0 ? "done" : "empty",
          },
        })),

      setTerms: (data) =>
        set((s) => ({
          terms:      { ...s.terms, ...data },
        })),

      setIntake: (data) =>
        set((s) => {
          const merged = { ...s.intake, ...data };
          const isDone = !!merged.journey && !!merged.dispositionType;
          const isPartial = !!merged.journey || !!merged.dispositionType;
          return {
            intake: merged,
            strategy: merged.dispositionType || s.strategy,
            journey: merged.journey || s.journey,
            completion: {
              ...s.completion,
              intake: isDone ? "done" : (isPartial ? "partial" : "empty"),
            }
          };
        }),

      setStepDone:    (step) => set((s) => ({ completion: { ...s.completion, [step]: "done"    } })),
      setStepPartial: (step) => set((s) => ({ completion: { ...s.completion, [step]: "partial" } })),

      setSaving: (v) => set({ isSaving: v }),
      markSaved: ()  => set({ savedAt: new Date().toISOString(), isSaving: false }),

      reset: () =>
        set({
          projectId:   null,
          currentStep: "address",
          completion:  { ...INITIAL_COMPLETION },
          savedAt:     null,
          isSaving:    false,
          address:     {},
          projectName: "",
          strategy:    "",
          journey:     "targeting",
          status:      { acquisitionStatus: "PROSPECT" },
          propertyType: "Single Family",
          units:       1,
          condition:   "turnkey",
          ownership:   { ownershipStructure: "INDIVIDUAL" },
          purchasePrice: 0,
          rehabBudget:   0,
          terms:       {},
          intake:      { journey: "targeting", dispositionType: "" },
        }),
    }),
    {
      name:    "reil-acquisition-wizard-v3", // upgraded version for new 12 step architecture
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
