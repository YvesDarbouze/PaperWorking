import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Step definitions ─────────────────────────────────────────────────────────

export const WIZARD_STEPS = [
  { key: "intake",    label: "Intake",     icon: "explore"       },
  { key: "address",   label: "Address",    icon: "location_on"   },
  { key: "status",    label: "Status",     icon: "flag"          },
  { key: "property",  label: "Property",   icon: "home"          },
  { key: "ownership", label: "Ownership",  icon: "account_tree"  },
  { key: "terms",     label: "Terms",      icon: "handshake"     },
  { key: "review",    label: "Review",     icon: "fact_check"    },
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number]["key"];
export type StepCompletion = "empty" | "partial" | "done";

// ─── Form data shapes ─────────────────────────────────────────────────────────

export interface IntakeData {
  journey: "targeting" | "under_contract" | "owned_closing" | "renovating_marketing" | "rented_leased_sold" | "";
  dispositionType: "SALE" | "LEASE" | "RENT" | "";
}

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
  propertyType?:    string;
  units?:           number;
  sqft?:            number;
  lotSqft?:         number;
  yearBuilt?:       number;
  condition?:       string;
}

export interface StatusData {
  acquisitionStatus: string;
}

export interface OwnershipData {
  ownershipStructure: string;
  entityType?:        string;   // populated when ENTITY is selected
  entityName?:        string;
  coOwners?:          string[]; // free-text names; linked to Members in a later phase
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
  savedAt:     string | null; // ISO string for serialisability
  isSaving:    boolean;

  // Form data
  intake:    Partial<IntakeData>;
  address:   Partial<AddressData>;
  status:    Partial<StatusData>;
  ownership: Partial<OwnershipData>;
  terms:     Partial<TermsData>;

  // Actions
  setProjectId:    (id: string) => void;
  goToStep:        (step: WizardStepKey) => void;
  setIntake:       (data: Partial<IntakeData>) => void;
  setAddress:      (data: Partial<AddressData>) => void;
  setStatus:       (data: Partial<StatusData>) => void;
  setOwnership:    (data: Partial<OwnershipData>) => void;
  setTerms:        (data: Partial<TermsData>) => void;
  setStepDone:     (step: WizardStepKey) => void;
  setStepPartial:  (step: WizardStepKey) => void;
  setSaving:       (v: boolean) => void;
  markSaved:       () => void;
  reset:           () => void;
}

// ─── Initial / default state ──────────────────────────────────────────────────

const INITIAL_COMPLETION: Record<WizardStepKey, StepCompletion> = {
  intake:    "empty",
  address:   "empty",
  status:    "empty",
  property:  "empty",
  ownership: "empty",
  terms:     "empty",
  review:    "empty",
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAcquisitionWizard = create<WizardState>()(
  persist(
    (set) => ({
      projectId:   null,
      currentStep: "intake",
      completion:  { ...INITIAL_COMPLETION },
      savedAt:     null,
      isSaving:    false,

      intake:    {},
      address:   {},
      status:    {},
      ownership: {},
      terms:     {},

      setProjectId: (id) => set({ projectId: id }),

      goToStep: (step) => set({ currentStep: step }),

      setIntake: (data) =>
        set((s) => {
          const merged = { ...s.intake, ...data };
          const isDone = !!merged.journey && !!merged.dispositionType;
          return {
            intake:     merged,
            completion: {
              ...s.completion,
              intake: isDone ? "done" : "partial",
            },
          };
        }),

      setAddress: (data) =>
        set((s) => ({
          address:    { ...s.address, ...data },
          completion: {
            ...s.completion,
            address: data.placeId ? "done" : "partial",
          },
        })),

      setStatus: (data) =>
        set((s) => ({
          status:     { ...s.status, ...data },
          completion: {
            ...s.completion,
            status: data.acquisitionStatus ? "done" : "partial",
          },
        })),

      setOwnership: (data) =>
        set((s) => {
          const merged = { ...s.ownership, ...data };
          // ENTITY is "done" when entityName is also set
          const isDone = merged.ownershipStructure &&
            (merged.ownershipStructure !== "ENTITY" || !!merged.entityName);
          return {
            ownership:  merged,
            completion: {
              ...s.completion,
              ownership: isDone ? "done" : "partial",
            },
          };
        }),

      setTerms: (data) =>
        set((s) => ({
          terms:      { ...s.terms, ...data },
          completion: {
            ...s.completion,
            terms: Object.keys(data).length > 0 ? "partial" : s.completion.terms,
          },
        })),

      setStepDone:    (step) => set((s) => ({ completion: { ...s.completion, [step]: "done"    } })),
      setStepPartial: (step) => set((s) => ({ completion: { ...s.completion, [step]: "partial" } })),

      setSaving: (v) => set({ isSaving: v }),
      markSaved: ()  => set({ savedAt: new Date().toISOString(), isSaving: false }),

      reset: () =>
        set({
          projectId:   null,
          currentStep: "intake",
          completion:  { ...INITIAL_COMPLETION },
          savedAt:     null,
          isSaving:    false,
          intake:      {},
          address:     {},
          status:      {},
          ownership:   {},
          terms:       {},
        }),
    }),
    {
      name:    "reil-acquisition-wizard-v2", // changed version to avoid caching issues with old format
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
