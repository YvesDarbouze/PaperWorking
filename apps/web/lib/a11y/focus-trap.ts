/**
 * Focus Trap Utility for Modals, Sheets, and Dialogs.
 * Traps focus within container, supports Shift+Tab wrap-around, Escape dismissal,
 * and restores focus to the invoking trigger upon closing.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => {
    // Check aria-hidden or hidden attributes
    if (el.closest('[aria-hidden="true"]') || el.hasAttribute('hidden')) {
      return false;
    }
    // In browser with rendering engine, offsetParent checks for display:none
    if (el.offsetParent === null && typeof window !== 'undefined' && window.getComputedStyle) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
    }
    return !el.hasAttribute('disabled');
  });
}

export interface FocusTrapOptions {
  container: HTMLElement | null;
  isActive: boolean;
  onClose?: () => void;
  initialFocusEl?: HTMLElement | null;
}

export function setupFocusTrap({
  container,
  isActive,
  onClose,
  initialFocusEl,
}: FocusTrapOptions): () => void {
  if (!container || !isActive) {
    return () => {};
  }

  // Record the currently active element so we can restore focus upon close
  const previousActiveElement = document.activeElement as HTMLElement | null;

  const focusables = getFocusableElements(container);
  if (initialFocusEl && focusables.includes(initialFocusEl)) {
    initialFocusEl.focus();
  } else if (focusables.length > 0) {
    focusables[0].focus();
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose?.();
      return;
    }

    if (e.key !== 'Tab') return;

    const currentFocusables = getFocusableElements(container);
    if (currentFocusables.length === 0) {
      e.preventDefault();
      return;
    }

    const first = currentFocusables[0];
    const last = currentFocusables[currentFocusables.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab
      if (document.activeElement === last || !container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown, true);

  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
    // Restore focus to original trigger
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  };
}
