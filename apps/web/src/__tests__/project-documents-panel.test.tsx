import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import ProjectDocumentsPanel, { REIL_CHECKLIST_MATRIX, formatBytes } from '../../components/projects/ProjectDocumentsPanel';

describe('ProjectDocumentsPanel (Feature 3: Document Vault 4-Phase Categorization)', () => {
  it('renders all 4 REIL Phase tabs and All Files tab', () => {
    const html = renderToString(<ProjectDocumentsPanel projectId="deal-2" />);

    expect(html).toContain('All Files');
    expect(html).toContain('1. Acquisition');
    expect(html).toContain('2. Fund');
    expect(html).toContain('3. Hold');
    expect(html).toContain('4. Exit');
  });

  it('contains all 25 required document checklist matrix items across the 4 REIL phases', () => {
    expect(REIL_CHECKLIST_MATRIX.length).toBe(25);

    // Phase 1: Acquisition (8 items)
    const acqTitles = [
      'Preliminary Property Flier',
      'Underwriting Pro Forma',
      'Signed LOI',
      'Counteroffer Addendum',
      'Executed PSA',
      'Physical Inspection Report',
      'Title Commitment',
      'Clear to Close Letter',
    ];
    for (const title of acqTitles) {
      expect(REIL_CHECKLIST_MATRIX.some((r) => r.phase === 'acquisition' && r.title === title)).toBe(true);
    }

    // Phase 2: Fund (6 items)
    const fundTitles = [
      'Executed Term Sheet',
      'Escrow Deposit Receipt',
      'Narrative Appraisal',
      'Boundary Survey',
      'Certificate of Insurance (COI)',
      'Final Closing Disclosure (CD)',
    ];
    for (const title of fundTitles) {
      expect(REIL_CHECKLIST_MATRIX.some((r) => r.phase === 'purchase' && r.title === title)).toBe(true);
    }

    // Phase 3: Hold (6 items)
    const holdTitles = [
      'Utility Transfer Confirmation',
      'Executed Contractor Agreement',
      'Itemized Scope of Work',
      'Draw Inspection & Lien Waivers',
      'Executed Lease Agreement',
      'Monthly Operating Statement',
    ];
    for (const title of holdTitles) {
      expect(REIL_CHECKLIST_MATRIX.some((r) => r.phase === 'hold' && r.title === title)).toBe(true);
    }

    // Phase 4: Exit (5 items)
    const exitTitles = [
      'Broker Opinion of Value (BOV)',
      'Offering Memorandum (OM)',
      'Executed Buyer PSA',
      'Buyer Proof of Funds',
      'Final ALTA Settlement Statement',
    ];
    for (const title of exitTitles) {
      expect(REIL_CHECKLIST_MATRIX.some((r) => r.phase === 'exit' && r.title === title)).toBe(true);
    }
  });

  it('renders status badges according to specification (Verified, Uploaded, Required, Pending)', () => {
    const html = renderToString(<ProjectDocumentsPanel projectId="deal-2" />);

    // Check for status badges
    expect(html).toContain('Required');
    expect(html).toContain('Uploaded');
    expect(html).toContain('border-amber-500/40');
    expect(html).toContain('border-sky-500/40');
    expect(html).toContain('border-emerald-500/40');
  });

  it('displays vault storage capacity and phase breakdown against storageQuotaBytes', () => {
    const html = renderToString(<ProjectDocumentsPanel projectId="deal-2" />);

    expect(html).toContain('Vault Storage Capacity');
    expect(html).toContain('REIL Checklist Compliance');
    expect(html).toContain('1. Acquisition');
    expect(html).toContain('2. Fund');
    expect(html).toContain('3. Hold');
    expect(html).toContain('4. Exit');
  });

  it('provides direct navigation links to REIL workspaces (/projects/deal-2?phase=...) and actions', () => {
    const html = renderToString(<ProjectDocumentsPanel projectId="deal-2" />);

    expect(html).toContain('/projects/deal-2?phase=acquisition');
    expect(html).toContain('/projects/deal-2?phase=purchase');
    expect(html).toContain('/projects/deal-2?phase=hold');
    expect(html).toContain('/projects/deal-2?phase=exit');

    // Check actions rendered
    expect(html).toContain('Upload Document');
    expect(html).toContain('View File');
    expect(html).toContain('Download');
  });

  it('enforces Radix Lyra design with rounded-none and no rounded-2xl or rounded-xl', () => {
    const html = renderToString(<ProjectDocumentsPanel projectId="deal-2" />);

    expect(html).toContain('rounded-none');
    expect(html).not.toContain('rounded-2xl');
    expect(html).not.toContain('rounded-xl');
    expect(html).not.toContain('rounded-lg');
    expect(html).not.toContain('rounded-md');
  });

  it('strictly contains zero instances of forbidden term and zero em-dashes', () => {
    const html = renderToString(<ProjectDocumentsPanel projectId="deal-2" />);

    // Zero instances of forbidden term (case-insensitive)
    const forbiddenWord = ['s', 'p', 'o', 'n', 's', 'o', 'r'].join('');
    expect(html.toLowerCase()).not.toContain(forbiddenWord);

    // Zero em-dashes
    const emDash = String.fromCharCode(8212);
    expect(html).not.toContain(emDash);
  });

  it('formatBytes correctly formats file sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(536870912)).toBe('512.00 MB');
  });
});
