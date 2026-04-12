import { create } from 'zustand';

interface UserState {
  isNewUser: boolean;
  hasActiveSubscription: boolean;
  onboardingStep: number;
  
  setNextStep: () => void;
  completeOnboarding: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  // Set to true by default to trigger the onboarding wizard sequence
  isNewUser: true,
  hasActiveSubscription: true,
  
  // Step 1: Organization Setup Modal
  // Step 2: Team Invite Modal
  // Step 3: Tooltip Highlight over "Add Target Property"
  // Step 4: Tooltip Highlight over the newly created Property Row
  // Step 5+: Complete
  onboardingStep: 1,

  setNextStep: () => set((state) => ({ onboardingStep: state.onboardingStep + 1 })),
  
  completeOnboarding: () => set({ 
     isNewUser: false, 
     onboardingStep: 5 
  }),
}));
