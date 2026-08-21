import { REILPhase, REIL_PHASE_ORDER } from '@paperworking/shared';
import { WEB_APP_STATUS } from '../index.js';
import {
  FOOTER_COLUMNS,
  HERO_CONTENT,
  MARKETING_NAV_LINKS,
  REIL_PHASE_LABELS,
  VALUE_PROPS,
} from '../../lib/marketing/content.js';
import {
  CONTACT_CHANNELS,
  SUPPORT_CATEGORIES,
  SUPPORT_FAQS,
  SYSTEM_STATUS,
} from '../../lib/marketing/support-data.js';

describe('phase 5a — web app status', () => {
  it('reports phase-5a marketing routes before auth wave', () => {
    expect(WEB_APP_STATUS.phase).not.toBe('phase-5a');
    expect(WEB_APP_STATUS.routes).toContain('/');
    expect(WEB_APP_STATUS.routes).toContain('/home');
    expect(WEB_APP_STATUS.routes).toContain('/support');
    expect(WEB_APP_STATUS.routes).toContain('/support/glossary');
    expect(WEB_APP_STATUS.routes).toContain('/support/metrics');
    expect(WEB_APP_STATUS.routes).toContain('/marketplaces');
    expect(WEB_APP_STATUS.adminRoute).toBe('/admin');
    expect(WEB_APP_STATUS.reilPhases).toEqual(REIL_PHASE_ORDER);
    expect(WEB_APP_STATUS.firstPhase).toBe(REILPhase.ACQUISITION);
  });
});

describe('phase 5a — marketing content', () => {
  it('includes v0 primary navigation links', () => {
    expect(MARKETING_NAV_LINKS.map((link) => link.label)).toEqual([
      'How It Works',
      'Marketplaces',
      'Pricing',
      'Support',
    ]);
    expect(MARKETING_NAV_LINKS.find((link) => link.label === 'Marketplaces')?.href).toBe(
      '/marketplaces',
    );
    expect(MARKETING_NAV_LINKS.some((link) => link.href === '/support')).toBe(true);
  });

  it('defines hero and value proposition copy', () => {
    expect(HERO_CONTENT.headline.length).toBeGreaterThan(20);
    expect(HERO_CONTENT.primaryCta.href).toBe('/pricing');
    expect(VALUE_PROPS).toHaveLength(3);
  });

  it('maps all REIL phases to labels', () => {
    for (const phase of REIL_PHASE_ORDER) {
      expect(REIL_PHASE_LABELS[phase]?.title).toBeTruthy();
      expect(REIL_PHASE_LABELS[phase]?.summary).toBeTruthy();
    }
  });

  it('defines footer columns with links', () => {
    expect(FOOTER_COLUMNS.length).toBeGreaterThanOrEqual(4);
    expect(FOOTER_COLUMNS.flatMap((column) => column.links).some((link) => link.href === '/support')).toBe(true);
    expect(FOOTER_COLUMNS.find((c) => c.heading === 'Product')?.links.map((l) => l.label)).toEqual([
      'How It Works',
      'Marketplaces',
      'Pricing',
      'Changelog',
    ]);
  });
});

describe('phase 5a — support data', () => {
  it('provides categories, faqs, and contact channels', () => {
    expect(SUPPORT_CATEGORIES.length).toBeGreaterThanOrEqual(4);
    expect(SUPPORT_FAQS.length).toBeGreaterThanOrEqual(4);
    expect(CONTACT_CHANNELS.some((channel) => channel.href.startsWith('mailto:'))).toBe(true);
  });

  it('reports operational system status', () => {
    expect(SYSTEM_STATUS.status).toBe('operational');
    expect(SYSTEM_STATUS.message.length).toBeGreaterThan(0);
  });
});
