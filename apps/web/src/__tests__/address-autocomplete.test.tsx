import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import AddressSearch from '../../components/deals/AddressSearch.js';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('AddressSearch Autocomplete & Accessibility Suite', () => {
  it('renders input with full ARIA 1.2 combobox semantics', () => {
    const html = renderToString(
      <AddressSearch placeholder="Search property address..." />,
    );

    // Combobox role and ARIA attributes
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="address-predictions-list"');
    expect(html).toContain('placeholder="Search property address..."');
  });

  it('renders search icon and input styling', () => {
    const html = renderToString(
      <AddressSearch className="custom-test-class" />,
    );

    expect(html).toContain('custom-test-class');
    expect(html).toContain('search');
    expect(html).toContain('focus:border-[#00DD94]');
  });

  it('does not render predictions listbox when closed/empty', () => {
    const html = renderToString(<AddressSearch />);
    expect(html).not.toContain('id="address-predictions-list"');
  });

  it('guarantees Powered by Google attribution is structured in component markup', () => {
    const componentSource = fs.readFileSync(
      path.resolve(process.cwd(), 'components/deals/AddressSearch.tsx'),
      'utf8',
    );
    expect(componentSource).toContain('data-testid="powered-by-google-attribution"');
    expect(componentSource).toContain('Powered by');
    expect(componentSource).toContain('Google');
  });

  describe('Google Places Autocomplete Session Token Lifecycle', () => {
    it('creates a session token on first gesture and retains it across keystrokes', async () => {
      const { PlacesSessionManager } = await import('../../lib/maps/session-token.js');
      const manager = new PlacesSessionManager();

      expect(manager.hasToken()).toBe(false);

      // Keystroke 1: "1"
      const token1 = manager.getToken();
      expect(typeof token1).toBe('string');
      expect(token1.length).toBeGreaterThan(0);
      expect(manager.hasToken()).toBe(true);

      // Keystroke 2: "12"
      const token2 = manager.getToken();
      expect(token2).toBe(token1);

      // Keystroke 3: "123 Main St"
      const token3 = manager.getToken();
      expect(token3).toBe(token1);
    });

    it('consumes and clears session token on place details fetch', async () => {
      const { PlacesSessionManager } = await import('../../lib/maps/session-token.js');
      const manager = new PlacesSessionManager();

      const activeToken = manager.getToken();
      expect(manager.hasToken()).toBe(true);

      // Place details selected -> token consumed
      const consumed = manager.consumeToken();
      expect(consumed).toBe(activeToken);
      expect(manager.hasToken()).toBe(false);

      // Next search gesture starts a new unique token
      const nextToken = manager.getToken();
      expect(nextToken).not.toBe(activeToken);
    });

    it('resets session token on address form submission', async () => {
      const { PlacesSessionManager } = await import('../../lib/maps/session-token.js');
      const manager = new PlacesSessionManager();

      const token = manager.getToken();
      expect(manager.hasToken()).toBe(true);

      manager.resetToken();
      expect(manager.hasToken()).toBe(false);

      const newToken = manager.getToken();
      expect(newToken).not.toBe(token);
    });
  });
});
