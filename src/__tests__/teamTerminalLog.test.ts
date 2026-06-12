/** @jest-environment node */

/* ═══════════════════════════════════════════════════════
   teamTerminalLog.test.ts — Regression for Prompt 36
   Verifies that the simulated terminal log mechanism
   is permanently removed from team/page.tsx:
     - No terminalLogs state variable
     - No setTerminalLogs calls
     - No initialLogs array (fake boot messages)
     - No "Security Access Log" console div
     - No "admin@paperworking" fake shell prompt
     - No "AES-256 enabled" fabricated log line
   ═══════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';

const TEAM_PAGE = path.join(__dirname, '../app/dashboard/team/page.tsx');
const src = fs.readFileSync(TEAM_PAGE, 'utf-8');

describe('Simulated terminal log is removed from team/page.tsx', () => {
  it('terminalLogs state variable is gone', () => {
    expect(src).not.toContain('terminalLogs');
  });

  it('setTerminalLogs calls are gone', () => {
    expect(src).not.toContain('setTerminalLogs');
  });

  it('initialLogs array (fake boot messages) is gone', () => {
    expect(src).not.toContain('initialLogs');
  });

  it('Security Access Log panel is gone', () => {
    expect(src).not.toContain('Security Access Log');
  });

  it('admin@paperworking fake shell prompt is gone', () => {
    expect(src).not.toContain('admin@paperworking');
  });

  it('AES-256 fabricated log line is gone', () => {
    expect(src).not.toContain('AES-256');
  });

  it('History icon import (only used by terminal) is gone', () => {
    // History was exclusively used by the terminal panel header
    expect(src).not.toContain('History');
  });

  it('Terminal simulated logs comment is gone', () => {
    expect(src).not.toContain('Terminal simulated logs');
  });

  it('STABLE monitoring fabricated line is gone', () => {
    expect(src).not.toContain('STABLE. Monitoring');
  });
});
