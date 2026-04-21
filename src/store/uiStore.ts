import { create } from 'zustand';

export type TrackMode = 'FLIP' | 'HOLD';
export type DashboardViewMode = 'HOME' | 'COMMAND_CENTER' | 'KANBAN';

interface UIState {
  trackMode: TrackMode;
  viewMode: DashboardViewMode;
  setTrackMode: (mode: TrackMode) => void;
  setViewMode: (mode: DashboardViewMode) => void;
  toggleTrackMode: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  trackMode: 'FLIP',
  viewMode: 'HOME', // Default to Dashboard Home — centralized command center
  setTrackMode: (mode) => set({ trackMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleTrackMode: () => set((state) => ({ 
    trackMode: state.trackMode === 'FLIP' ? 'HOLD' : 'FLIP' 
  })),
}));
