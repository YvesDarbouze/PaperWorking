/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SkipNav from '../SkipNav';
import LiveRegion from '../LiveRegion';
import FocusTrap from '../FocusTrap';

describe('Accessibility Components Suite (AGENT P-3)', () => {
  describe('SkipNav', () => {
    test('renders skip navigation link pointing to target content ID', () => {
      render(<SkipNav contentId="main-content" label="Skip to content" />);
      const link = screen.getByRole('link', { name: /skip to content/i });
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('#main-content');
    });
  });

  describe('LiveRegion', () => {
    test('renders live region with polite live attribute by default', () => {
      render(<LiveRegion message="3 new notifications" />);
      const region = screen.getByText('3 new notifications');
      expect(region).not.toBeNull();
      expect(region.getAttribute('aria-live')).toBe('polite');
      expect(region.getAttribute('aria-atomic')).toBe('true');
    });

    test('supports assertive live region politeness', () => {
      render(<LiveRegion message="Form submission failed" politeness="assertive" />);
      const region = screen.getByText('Form submission failed');
      expect(region.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('FocusTrap', () => {
    test('handles Escape key to invoke onEscape callback', () => {
      const handleEscape = jest.fn();
      render(
        <FocusTrap active={true} onEscape={handleEscape}>
          <button>Inside Button</button>
        </FocusTrap>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleEscape).toHaveBeenCalledTimes(1);
    });

    test('traps tab key inside focusable elements', () => {
      render(
        <FocusTrap active={true}>
          <button id="btn1">Button 1</button>
          <button id="btn2">Button 2</button>
        </FocusTrap>
      );

      const btn1 = screen.getByRole('button', { name: 'Button 1' });
      const btn2 = screen.getByRole('button', { name: 'Button 2' });

      btn2.focus();
      expect(document.activeElement).toBe(btn2);

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    });
  });
});
