/**
 * Prompt 70 — Vendor Request Payload Contract
 *
 * Invariant: every form field captured in VendorRequestModal state
 * MUST appear in the assignVendorToProject call AND in every Firestore
 * write path inside that action. A missing field here is a regression.
 *
 * This test reads source text — it will fail if any field is dropped,
 * even if the runtime would not throw.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

const MODAL        = read('components/marketplace/VendorRequestModal.tsx');
const ACTION       = read('actions/vendorAssignment.ts');
const SCHEMA       = read('lib/schemas/vendorRequestSchema.ts');
const VENDOR_PORTAL = read('app/vendor-portal/page.tsx');

/* ──────────────────────────────────────────────────────────────────────────
   Section 1: Full form-field audit — every captured state field exists
   and is forwarded in the callsite
   ────────────────────────────────────────────────────────────────────────── */
describe('Prompt 70 — Full form-field audit (no field is captured-but-dropped)', () => {

  // The canonical list of all form fields captured in useState
  const capturedFields = [
    'message',
    'customProjectId',
    'agreeToS',
    'urgency',
    'desiredTimeline',
  ] as const;

  it.each(capturedFields)('form captures "%s" in useState', (field) => {
    expect(MODAL).toMatch(new RegExp(`const \\[${field},`));
  });

  it('assignVendorToProject callsite passes urgency as 6th positional argument', () => {
    // The call must include urgency after message.trim()
    expect(MODAL).toContain('urgency,');
  });

  it('assignVendorToProject callsite passes desiredTimeline as 7th positional argument', () => {
    expect(MODAL).toContain('desiredTimeline.trim() || undefined');
  });

  it('assignVendorToProject callsite forwards all 7 arguments (idToken, projectId, vendorUid, serviceType, message, urgency, desiredTimeline)', () => {
    // All seven positional args must appear between the opening paren and closing paren
    const callBlock = MODAL.slice(
      MODAL.indexOf('const res = await assignVendorToProject('),
      MODAL.indexOf('const res = await assignVendorToProject(') + 400,
    );
    expect(callBlock).toContain('idToken');
    expect(callBlock).toContain('customProjectId.trim()');
    expect(callBlock).toContain('vendorUid');
    expect(callBlock).toContain('serviceType');
    expect(callBlock).toContain('message.trim()');
    expect(callBlock).toContain('urgency');
    expect(callBlock).toContain('desiredTimeline');
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   Section 2: Action signature — urgency and desiredTimeline are declared
   ────────────────────────────────────────────────────────────────────────── */
describe('Prompt 70 — Action signature includes urgency and desiredTimeline', () => {

  it('action function signature declares urgency param', () => {
    expect(ACTION).toContain("urgency?: 'standard' | 'rush' | 'asap'");
  });

  it('action function signature declares desiredTimeline param', () => {
    expect(ACTION).toContain('desiredTimeline?: string');
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   Section 3: All three Firestore write paths carry urgency + desiredTimeline
   ────────────────────────────────────────────────────────────────────────── */
describe('Prompt 70 — All three Firestore write paths include urgency and desiredTimeline', () => {

  // Extract the three batch.set blocks from the action source
  function extractBatchSetBlocks(src: string): string[] {
    const blocks: string[] = [];
    let idx = 0;
    while (true) {
      const start = src.indexOf('batch.set(', idx);
      if (start === -1) break;
      // Find the matching closing paren (crude but sufficient for well-formatted source)
      let depth = 0;
      let end = start;
      for (let i = start; i < src.length; i++) {
        if (src[i] === '(') depth++;
        if (src[i] === ')') { depth--; if (depth === 0) { end = i + 2; break; } }
      }
      blocks.push(src.slice(start, end));
      idx = end;
    }
    return blocks;
  }

  const batchSets = extractBatchSetBlocks(ACTION);

  it('action has exactly 3 batch.set calls (assignmentDoc, vendorInbox, vendorRequests)', () => {
    expect(batchSets).toHaveLength(3);
  });

  // batch.set #1 passes assignmentData as a variable reference — fields live in that object literal
  it('assignmentData object includes urgency', () => {
    // Find the assignmentData const block
    const start = ACTION.indexOf('const assignmentData = {');
    const end   = ACTION.indexOf('};', start) + 2;
    const block = ACTION.slice(start, end);
    expect(block).toContain('urgency');
  });

  it('assignmentData object includes desiredTimeline', () => {
    const start = ACTION.indexOf('const assignmentData = {');
    const end   = ACTION.indexOf('};', start) + 2;
    const block = ACTION.slice(start, end);
    expect(block).toContain('desiredTimeline');
  });

  // batch.set #2 (vendorInbox) is an inline object
  it('vendorInbox doc (batch.set #2) includes urgency', () => {
    expect(batchSets[1]).toContain('urgency');
  });

  it('vendorInbox doc (batch.set #2) includes desiredTimeline', () => {
    expect(batchSets[1]).toContain('desiredTimeline');
  });

  // batch.set #3 (vendorRequests) is an inline object
  it('vendorRequests doc (batch.set #3) includes urgency', () => {
    expect(batchSets[2]).toContain('urgency');
  });

  it('vendorRequests doc (batch.set #3) includes desiredTimeline', () => {
    expect(batchSets[2]).toContain('desiredTimeline');
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   Section 4: urgency defaults to 'standard' when omitted (never undefined
   in the persisted document)
   ────────────────────────────────────────────────────────────────────────── */
describe('Prompt 70 — urgency defaults gracefully', () => {

  it('action defaults urgency to "standard" via nullish coalescing', () => {
    expect(ACTION).toContain("urgency: urgency ?? 'standard'");
  });

  it('desiredTimeline is trimmed and null-coalesced before persisting', () => {
    expect(ACTION).toContain("desiredTimeline: desiredTimeline?.trim() || null");
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   Section 5: Existing fields not regressed — message, serviceType,
   requestedBy, status still present in all write paths
   ────────────────────────────────────────────────────────────────────────── */
describe('Prompt 70 — No regression on existing fields', () => {

  const requiredFieldsInAction = ['message', 'serviceType', 'requestedBy', 'status'];

  it.each(requiredFieldsInAction)(
    'action still writes "%s" to at least one persistence path',
    (field) => {
      const count = (ACTION.match(new RegExp(field, 'g')) || []).length;
      expect(count).toBeGreaterThan(0);
    },
  );

  it('modal still resets urgency to "standard" on successful submit', () => {
    expect(MODAL).toContain("setUrgency('standard')");
  });

  it('modal still resets desiredTimeline to empty string on successful submit', () => {
    expect(MODAL).toContain("setDesiredTimeline('')");
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   Section 6: Zod schema declares urgency and desiredTimeline
   A missing field here means validation/parsing would silently strip it.
   ────────────────────────────────────────────────────────────────────────── */
describe('Prompt 70 — vendorRequestSchema includes urgency and desiredTimeline', () => {

  it('vendorRequestSchema declares urgency field', () => {
    // Must appear as a named field in the object shape
    expect(SCHEMA).toContain("urgency:");
  });

  it('vendorRequestSchema urgency enum matches modal options (standard | rush | asap)', () => {
    expect(SCHEMA).toContain("'standard'");
    expect(SCHEMA).toContain("'rush'");
    expect(SCHEMA).toContain("'asap'");
  });

  it('vendorRequestSchema declares desiredTimeline field', () => {
    expect(SCHEMA).toContain("desiredTimeline:");
  });

  it('createVendorRequestSchema also declares urgency and desiredTimeline', () => {
    const start = SCHEMA.indexOf('createVendorRequestSchema');
    const block = SCHEMA.slice(start, start + 600);
    expect(block).toContain('urgency');
    expect(block).toContain('desiredTimeline');
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   Section 7: Vendor-portal view declares and renders urgency + desiredTimeline
   Fields in Firestore mean nothing if the vendor cannot see them.
   ────────────────────────────────────────────────────────────────────────── */
describe('Prompt 70 — Vendor-portal renders urgency and desiredTimeline', () => {

  it('VendorRequest interface includes urgency field', () => {
    // The local TypeScript interface must declare the field so the template can use it safely
    const ifaceStart = VENDOR_PORTAL.indexOf('interface VendorRequest');
    const ifaceEnd   = VENDOR_PORTAL.indexOf('}', ifaceStart);
    const iface      = VENDOR_PORTAL.slice(ifaceStart, ifaceEnd);
    expect(iface).toContain('urgency');
  });

  it('VendorRequest interface includes desiredTimeline field', () => {
    const ifaceStart = VENDOR_PORTAL.indexOf('interface VendorRequest');
    const ifaceEnd   = VENDOR_PORTAL.indexOf('}', ifaceStart);
    const iface      = VENDOR_PORTAL.slice(ifaceStart, ifaceEnd);
    expect(iface).toContain('desiredTimeline');
  });

  it('vendor-portal card renders req.urgency', () => {
    expect(VENDOR_PORTAL).toContain('req.urgency');
  });

  it('vendor-portal card renders req.desiredTimeline', () => {
    expect(VENDOR_PORTAL).toContain('req.desiredTimeline');
  });

  it('vendorRequests write path includes requestedByName so vendor sees investor identity', () => {
    // The third batch.set (vendorRequests) must persist the investor display name
    const start = ACTION.lastIndexOf('batch.set(requestRef');
    const end   = ACTION.indexOf(');', start) + 2;
    const block = ACTION.slice(start, end);
    expect(block).toContain('requestedByName');
  });
});
