/**
 * Marketplace — No Demo Vendors Regression Test
 *
 * Root cause (documented here): The /api/vendors route queries
 * users where accountType === 'vendor' && subscriptionStatus === 'active'.
 * DEMO_VENDORS activated when that query returned zero results (no seeded
 * vendor accounts in the environment). The fallback displayed fictional
 * businesses with live "Request Quote" buttons, indistinguishable from
 * real vendors.
 *
 * Fix: removed DEMO_VENDORS and the fallback branch entirely.
 * Empty results now render an honest empty state.
 *
 * These tests enforce that no demo vendor data can re-enter the source.
 */

import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../app/dashboard/marketplace/page.tsx'),
  'utf8',
);

describe('Marketplace — DEMO_VENDORS removed (root cause: no active vendor accounts in Firestore)', () => {

  it('DEMO_VENDORS constant does not exist', () => {
    expect(src).not.toContain('DEMO_VENDORS');
  });

  it('fictional company "Prime Structural" is not present', () => {
    expect(src).not.toContain('Prime Structural');
  });

  it('fictional company "Capital Bridge Lending" is not present', () => {
    expect(src).not.toContain('Capital Bridge Lending');
  });

  it('fictional company "Coastal Title" is not present', () => {
    expect(src).not.toContain('Coastal Title');
  });

  it('fictional company "ProBuild Contractors" is not present', () => {
    expect(src).not.toContain('ProBuild Contractors');
  });

  it('fictional company "Premier Property Group" is not present', () => {
    expect(src).not.toContain('Premier Property Group');
  });

  it('fictional company "NextGen Realty Partners" is not present', () => {
    expect(src).not.toContain('NextGen Realty Partners');
  });

  it('demo- prefix UIDs are not present', () => {
    expect(src).not.toMatch(/['"](demo-\d+)['"]/);
  });

  it('vendor display list is derived from real API results (vendors.map)', () => {
    // The displayVendors memo must map over the `vendors` state array
    expect(src).toMatch(/vendors\.map\s*\(/);
  });

  it('no fallback to a hardcoded array when API returns empty', () => {
    // Must not contain a ternary/conditional that substitutes a literal array
    // when vendors.length === 0
    expect(src).not.toMatch(/vendors\.length\s*[=><!]+\s*0[\s\S]{0,80}:\s*\[/);
  });

  it('empty state message is honest (not "sample data" or "example")', () => {
    expect(src).not.toContain('Sample Data');
    expect(src).not.toContain('example vendor profiles');
  });
});
