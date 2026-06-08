/**
 * createProjectModalStore — controls whether the full-screen
 * AcquisitionWizard overlay is open or closed.
 *
 * Usage:
 *   const { open } = useCreateProjectModal();   // trigger from Sidebar / any button
 *   const { isOpen, close } = useCreateProjectModal(); // read in the wizard host
 */

import { create } from "zustand";

interface CreateProjectModalState {
  isOpen: boolean;
  open:   () => void;
  close:  () => void;
}

export const useCreateProjectModal = create<CreateProjectModalState>((set) => ({
  isOpen: false,
  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
}));
