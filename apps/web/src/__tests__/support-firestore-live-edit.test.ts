import { describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';

describe('Support Center Firestore Knowledge Base — Live Edits & No-Redeploy Retrieval', () => {
  it('1. GET /api/support/faq returns 14 FAQs matching the canonical schema', async () => {
    const { GET } = await import('../../app/api/support/faq/route.js');
    const req = new NextRequest('http://localhost:3000/api/support/faq');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(14);
    expect(Array.isArray(data.faqs)).toBe(true);

    const projectFaq = data.faqs.find((f: any) => f.id === 'faq-projects');
    expect(projectFaq).toBeDefined();
    expect(projectFaq.question).toBe('How does a Project workspace in PaperWorking differ from generic task managers?');
  });

  it('2. GET /api/support/glossary returns 22 terms organized into sorted alphabetical groups', async () => {
    const { GET } = await import('../../app/api/support/glossary/route.js');
    const req = new NextRequest('http://localhost:3000/api/support/glossary');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(22);
    expect(Array.isArray(data.terms)).toBe(true);
    expect(Array.isArray(data.groups)).toBe(true);
    expect(data.groups.length).toBeGreaterThanOrEqual(7);

    // Verify alphabetical ordering of groups
    const letters = data.groups.map((g: any) => g.letter);
    const sortedLetters = [...letters].sort();
    expect(letters).toEqual(sortedLetters);

    // Verify presence of key terms
    const arv = data.terms.find((t: any) => t.id === 'after-repair-value-arv');
    expect(arv).toBeDefined();
    expect(arv.term).toContain('After-Repair Value');
  });

  it('3. Modifying a Firestore FAQ doc propagates immediately without redeploy to GET /api/support/faq and Pepper AI', async () => {
    const { GET: getFaq, PATCH: patchFaq } = await import('../../app/api/support/faq/route.js');
    const { POST: postPepper } = await import('../../app/api/support/pepper/route.js');

    const LIVE_EDIT_MARKER = 'LIVE FIRESTORE TEST: Project workspaces link draw schedules directly to contractor liens.';

    // A. Perform live PATCH update on faq-projects with verified admin token
    const patchReq = new NextRequest('http://localhost:3000/api/support/faq', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-admin-token',
      },
      body: JSON.stringify({
        id: 'faq-projects',
        answer: LIVE_EDIT_MARKER,
      }),
    });

    const patchRes = await patchFaq(patchReq);
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.success).toBe(true);
    expect(patchJson.faq.answer).toBe(LIVE_EDIT_MARKER);

    // B. Verify GET /api/support/faq reflects the update immediately
    const verifyReq = new NextRequest('http://localhost:3000/api/support/faq');
    const verifyRes = await getFaq(verifyReq);
    const verifyData = await verifyRes.json();
    const updatedFaq = verifyData.faqs.find((f: any) => f.id === 'faq-projects');
    expect(updatedFaq.answer).toBe(LIVE_EDIT_MARKER);

    // C. Verify Pepper AI retrieves the updated answer immediately without redeploy
    const pepperReq = new NextRequest('http://localhost:3000/api/support/pepper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How does a Project workspace in PaperWorking differ from generic task managers?',
      }),
    });

    const pepperRes = await postPepper(pepperReq);
    expect(pepperRes.status).toBe(200);
    const pepperText = await pepperRes.text();
    expect(pepperText).toContain(LIVE_EDIT_MARKER);

    // D. Revert to canonical text
    const { CANONICAL_FAQ_SEED } = await import('../../lib/support/seed-data.js');
    const canonicalProjectFaq = CANONICAL_FAQ_SEED.find((f) => f.id === 'faq-projects')!;
    const revertReq = new NextRequest('http://localhost:3000/api/support/faq', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-admin-token',
      },
      body: JSON.stringify({
        id: 'faq-projects',
        answer: canonicalProjectFaq.answer,
      }),
    });
    await patchFaq(revertReq);
  });

  it('4. Modifying a Glossary term propagates immediately to GET /api/support/glossary', async () => {
    const { GET: getGlossary, PATCH: patchGlossary } = await import('../../app/api/support/glossary/route.js');

    const LIVE_GLOSSARY_DEF = 'Phase 01 of REIL: Institutional deal pipeline with automated comps. [LIVE UPDATED]';

    // A. Perform live PATCH update on acquisition with verified admin token
    const patchReq = new NextRequest('http://localhost:3000/api/support/glossary', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-admin-token',
      },
      body: JSON.stringify({
        id: 'acquisition',
        definition: LIVE_GLOSSARY_DEF,
      }),
    });

    const patchRes = await patchGlossary(patchReq);
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.success).toBe(true);

    // B. Verify GET /api/support/glossary returns updated definition
    const verifyReq = new NextRequest('http://localhost:3000/api/support/glossary');
    const verifyRes = await getGlossary(verifyReq);
    const verifyData = await verifyRes.json();
    const acquisitionTerm = verifyData.terms.find((t: any) => t.id === 'acquisition');
    expect(acquisitionTerm.definition).toBe(LIVE_GLOSSARY_DEF);

    // C. Revert to canonical definition
    const { CANONICAL_GLOSSARY_SEED } = await import('../../lib/support/seed-data.js');
    const canonicalAcq = CANONICAL_GLOSSARY_SEED.find((t) => t.id === 'acquisition')!;
    const revertReq = new NextRequest('http://localhost:3000/api/support/glossary', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-admin-token',
      },
      body: JSON.stringify({
        id: 'acquisition',
        definition: canonicalAcq.definition,
      }),
    });
    await patchGlossary(revertReq);
  });
});
