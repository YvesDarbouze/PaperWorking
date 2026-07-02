import { create } from 'zustand';

export type TrackMode = 'FLIP' | 'HOLD';
export type DashboardViewMode = 'HOME' | 'COMMAND_CENTER' | 'KANBAN';
export type SuccessfulActionType = 'project_created' | 'task_completed' | 'document_uploaded' | 'bid_approved' | null;

interface UIState {
  trackMode: TrackMode;
  viewMode: DashboardViewMode;
  setTrackMode: (mode: TrackMode) => void;
  setViewMode: (mode: DashboardViewMode) => void;
  toggleTrackMode: () => void;
  
  // Action-delayed onboarding state
  lastSuccessfulAction: SuccessfulActionType;
  showOnboardingPrompt: boolean;
  triggerSuccessfulAction: (action: SuccessfulActionType) => void;
  dismissOnboardingPrompt: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  trackMode: 'FLIP',
  viewMode: 'HOME', // Default to Dashboard Home — centralized command center
  setTrackMode: (mode) => set({ trackMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleTrackMode: () => set((state) => ({ 
    trackMode: state.trackMode === 'FLIP' ? 'HOLD' : 'FLIP' 
  })),
  
  // Action-delayed onboarding defaults
  lastSuccessfulAction: null,
  showOnboardingPrompt: false,
  triggerSuccessfulAction: (action) => set({ 
    lastSuccessfulAction: action, 
    showOnboardingPrompt: true 
  }),
  dismissOnboardingPrompt: () => set({ 
    showOnboardingPrompt: false, 
    lastSuccessfulAction: null 
  }),
}));
