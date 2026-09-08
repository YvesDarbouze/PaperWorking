'use client';

import { useState, useCallback, KeyboardEvent } from 'react';

export interface UseRovingTabindexOptions {
  itemCount: number;
  columns?: number;
  initialIndex?: number;
  loop?: boolean;
}

export function useRovingTabindex({
  itemCount,
  columns = 1,
  initialIndex = 0,
  loop = true,
}: UseRovingTabindexOptions) {
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);

  const getTabIndex = useCallback(
    (index: number): 0 | -1 => {
      return index === focusedIndex ? 0 : -1;
    },
    [focusedIndex],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>, currentIndex: number) => {
      if (itemCount <= 1) return;

      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = currentIndex + 1;
          if (nextIndex >= itemCount) {
            nextIndex = loop ? 0 : itemCount - 1;
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) {
            nextIndex = loop ? itemCount - 1 : 0;
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          nextIndex = currentIndex + columns;
          if (nextIndex >= itemCount) {
            nextIndex = loop ? currentIndex % columns : currentIndex;
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          nextIndex = currentIndex - columns;
          if (nextIndex < 0) {
            const remainder = currentIndex % columns;
            const lastRowIndex = Math.floor((itemCount - 1) / columns) * columns + remainder;
            nextIndex = loop ? (lastRowIndex < itemCount ? lastRowIndex : lastRowIndex - columns) : currentIndex;
          }
          break;

        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;

        case 'End':
          e.preventDefault();
          nextIndex = itemCount - 1;
          break;

        default:
          return;
      }

      setFocusedIndex(nextIndex);

      // Programmatically focus target element if selector matches
      const container =
        e.currentTarget.closest('#marketplace-results') ||
        e.currentTarget.closest('[role="group"]') ||
        e.currentTarget.parentElement?.parentElement ||
        e.currentTarget.parentElement;

      const targetElement = container?.querySelectorAll('[data-roving-item]')?.[
        nextIndex
      ] as HTMLElement | undefined;

      if (targetElement) {
        targetElement.focus();
      }
    },
    [itemCount, columns, loop],
  );

  return {
    focusedIndex,
    setFocusedIndex,
    getTabIndex,
    handleKeyDown,
  };
}
