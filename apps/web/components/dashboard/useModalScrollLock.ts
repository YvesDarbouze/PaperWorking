'use client';

import { useEffect } from 'react';

export interface ScrollLockTargetElement {
  style: {
    overflow: string;
    overflowY?: string;
    overscrollBehavior?: string;
  };
  setAttribute?: (name: string, value: string) => void;
  removeAttribute?: (name: string) => void;
}

export interface ScrollLockDocumentLike {
  documentElement?: ScrollLockTargetElement | null;
  body?: ScrollLockTargetElement | null;
  querySelectorAll?: (selector: string) => ArrayLike<ScrollLockTargetElement>;
}

interface SavedElementStyles {
  element: ScrollLockTargetElement;
  overflow: string;
  overflowY: string;
  overscrollBehavior: string;
}

let activeLockCount = 0;
let savedTargets: SavedElementStyles[] = [];

function lockElement(el: ScrollLockTargetElement): SavedElementStyles {
  const saved: SavedElementStyles = {
    element: el,
    overflow: el.style.overflow ?? '',
    overflowY: el.style.overflowY ?? '',
    overscrollBehavior: el.style.overscrollBehavior ?? '',
  };
  el.style.overflow = 'hidden';
  el.style.overflowY = 'hidden';
  el.style.overscrollBehavior = 'none';
  el.setAttribute?.('data-scroll-locked', 'true');
  return saved;
}

function restoreElement(saved: SavedElementStyles): void {
  saved.element.style.overflow = saved.overflow;
  saved.element.style.overflowY = saved.overflowY;
  saved.element.style.overscrollBehavior = saved.overscrollBehavior;
  saved.element.removeAttribute?.('data-scroll-locked');
}

export function acquireModalScrollLock(customDoc?: ScrollLockDocumentLike | null): () => void {
  const doc: ScrollLockDocumentLike | null =
    customDoc !== undefined
      ? customDoc
      : typeof document !== 'undefined'
      ? (document as unknown as ScrollLockDocumentLike)
      : null;

  if (!doc) {
    return () => {};
  }

  activeLockCount += 1;

  if (activeLockCount === 1) {
    const targets: ScrollLockTargetElement[] = [];
    if (doc.documentElement) {
      targets.push(doc.documentElement);
    }
    if (doc.body && doc.body !== doc.documentElement) {
      targets.push(doc.body);
    }
    if (typeof doc.querySelectorAll === 'function') {
      const containers = doc.querySelectorAll('[data-dashboard-scroll-container="true"]');
      for (let i = 0; i < containers.length; i += 1) {
        const container = containers[i];
        if (container && !targets.includes(container)) {
          targets.push(container);
        }
      }
    }
    savedTargets = targets.map(lockElement);
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLockCount = Math.max(0, activeLockCount - 1);
    if (activeLockCount === 0) {
      const toRestore = savedTargets;
      savedTargets = [];
      for (const item of toRestore) {
        restoreElement(item);
      }
    }
  };
}

export function useModalScrollLock(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) return;
    return acquireModalScrollLock();
  }, [isOpen]);
}
