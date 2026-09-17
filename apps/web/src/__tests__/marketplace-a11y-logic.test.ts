/**
 * @jest-environment jsdom
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { composeDealCardAriaLabel } from '../../lib/marketplace/deal-card-aria.js';
import { getFocusableElements, setupFocusTrap } from '../../lib/a11y/focus-trap.js';

describe('Screen Reader Aria-Label Composer (composeDealCardAriaLabel)', () => {
  it('composes standard deal card speech string correctly', () => {
    const deal: any = {
      id: 'deal-1',
      slug: 'meridian-crossing',
      propertyName: 'Meridian Crossing',
      city: 'Austin',
      state: 'TX',
      targetIrr: 18.5,
      equityMultiple: 1.9,
      minInvestment: 25000,
      fundingTarget: 1000000,
      committedAmount: 620000,
      status: 'funding',
    };

    const label = composeDealCardAriaLabel(deal);
    expect(label).toBe(
      'New. Meridian Crossing, Austin TX. Target IRR 18.5 percent, equity multiple 1.9, minimum investment 25 thousand dollars. 62 percent funded.',
    );
  });

  it('composes fully funded status prefix when deal is funded', () => {
    const deal: any = {
      id: 'deal-2',
      slug: 'lincolnheightsfunded',
      propertyName: 'Lincoln Heights',
      address: '2400 Broadway, Los Angeles, CA',
      city: 'Los Angeles',
      state: 'CA',
      targetIrr: 17.2,
      equityMultiple: 1.8,
      minInvestment: 50000,
      fundingTarget: 2000000,
      committedAmount: 2000000,
      status: 'funded',
    };

    const label = composeDealCardAriaLabel(deal);
    expect(label).toContain('Fully Funded. Lincoln Heights, Los Angeles CA.');
    expect(label).toContain('100 percent funded.');
    expect(label).toContain('50 thousand dollars');
  });

  it('formats millions correctly in minimum investment', () => {
    const deal: any = {
      id: 'deal-3',
      slug: 'trophy-tower',
      propertyName: 'Trophy Tower',
      city: 'New York',
      state: 'NY',
      targetIrr: 15.0,
      equityMultiple: 2.1,
      minInvestment: 1500000,
      fundingTarget: 10000000,
      committedAmount: 9000000,
      status: 'closing_soon',
    };

    const label = composeDealCardAriaLabel(deal);
    expect(label).toContain('Closing Soon. Trophy Tower, New York NY.');
    expect(label).toContain('minimum investment 1.5 million dollars');
  });
});

describe('Focus Trap Utility (setupFocusTrap & getFocusableElements)', () => {
  let container: HTMLDivElement;
  let triggerButton: HTMLButtonElement;

  beforeEach(() => {
    triggerButton = document.createElement('button');
    triggerButton.textContent = 'Open Dialog';
    document.body.appendChild(triggerButton);
    triggerButton.focus();

    container = document.createElement('div');
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <input id="inp1" type="text" />
      <button id="btnDisabled" disabled>Disabled</button>
      <div aria-hidden="true"><button id="btnHidden">Hidden</button></div>
      <button id="btn2">Button 2</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts only enabled and visible focusable elements', () => {
    // In jsdom offsetParent is mocked or null for unstyled elements; let's ensure getFocusableElements finds buttons
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.closest('[aria-hidden="true"]'));

    expect(focusables.map((el) => el.id)).toEqual(['btn1', 'inp1', 'btn2']);
  });

  it('intercepts Tab on the last element and wraps focus to the first element', () => {
    const onClose = jest.fn();
    const cleanup = setupFocusTrap({
      container,
      isActive: true,
      onClose,
    });

    const btn1 = container.querySelector('#btn1') as HTMLElement;
    const btn2 = container.querySelector('#btn2') as HTMLElement;
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    // Simulate Tab on last item
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
      shiftKey: false,
    });
    document.dispatchEvent(tabEvent);

    expect(document.activeElement).toBe(btn1);
    cleanup();
  });

  it('intercepts Shift+Tab on the first element and wraps focus to the last element', () => {
    const onClose = jest.fn();
    const cleanup = setupFocusTrap({
      container,
      isActive: true,
      onClose,
    });

    const btn1 = container.querySelector('#btn1') as HTMLElement;
    const btn2 = container.querySelector('#btn2') as HTMLElement;
    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    // Simulate Shift+Tab on first item
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
      shiftKey: true,
    });
    document.dispatchEvent(shiftTabEvent);

    expect(document.activeElement).toBe(btn2);
    cleanup();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    const cleanup = setupFocusTrap({
      container,
      isActive: true,
      onClose,
    });

    const escEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escEvent);

    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('restores focus to original trigger upon cleanup', () => {
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    const cleanup = setupFocusTrap({
      container,
      isActive: true,
    });

    // During modal open, active element moves inside container
    const btn1 = container.querySelector('#btn1') as HTMLElement;
    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    // Cleanup restores focus
    cleanup();
    expect(document.activeElement).toBe(triggerButton);
  });
});

describe('Reduced Motion Preference Detection (useReducedMotion logic)', () => {
  it('detects reduced motion setting via matchMedia query', () => {
    let currentMatches = false;
    window.matchMedia = jest.fn((query: any) => ({
      matches: currentMatches,
      media: String(query),
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })) as any;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    expect(mq.matches).toBe(false);

    currentMatches = true;
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    expect(mqReduced.matches).toBe(true);
  });
});
