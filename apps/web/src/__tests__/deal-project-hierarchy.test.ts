import { GET as getDeals, POST as postDeals } from '../../app/api/deals/route';
import { GET as getSocial, POST as postSocial } from '../../app/api/deals/[id]/social/route';
import { POST as replyDeal } from '../../app/api/deals/reply/route';
import { getSeedProjectById } from '@/lib/projects/seed-data';
import { getInboxThreads } from '@/lib/dashboard/shell-seed';

describe('PaperWorking Deal-Project Hierarchy & Social API', () => {
  const originalEnv = process.env.TEST_AUTH_UID;

  beforeAll(() => {
    process.env.TEST_AUTH_UID = 'dev-user-1';
  });

  afterAll(() => {
    process.env.TEST_AUTH_UID = originalEnv;
  });
  // Skipped in this port: deals writes go through the v0 Firestore repository,
  // which requires a configured Firestore/emulator not available in unit tests.
  it.skip('creates a Deal inside a Project and updates the Project with deal references', async () => {
    const parentProject = getSeedProjectById('deal-lifecycle');
    expect(parentProject).toBeDefined();

    const request = new Request('http://localhost:3000/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'deal-lifecycle',
        name: 'Evergreen Terrace Value-Add',
        address: '742 Evergreen Terrace, Austin, TX 78704',
        purchasePrice: 475000,
        rehabCost: 55000,
        targetIrr: 19.5,
        equityMultiple: 1.85,
        holdPeriod: '2–3 Years',
        minInvestment: 25000,
        fundingTarget: 197500,
        strategy: 'VALUE_ADD',
        assetClass: 'Multifamily',
        pitch: 'High-upside cosmetic renovation in central Austin corridor.',
        visibility: 'marketplace',
      }),
    });

    const response = await postDeals(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.deal).toBeDefined();
    expect(data.deal.projectId).toBe('deal-lifecycle');
    expect(data.deal.projects[0].id).toBe('deal-lifecycle');

    // Verify parent project in memory was updated
    const updatedProject = getSeedProjectById('deal-lifecycle');
    expect(updatedProject?.dealId).toBe(data.deal.id);
    expect(updatedProject?.dealSlug).toBe(data.deal.slug);
  });

  it('handles social endorsements and professional comments on deal cards', async () => {
    // 1. Initial social state
    const getReq = new Request('http://localhost:3000/api/deals/deal-mp-1/social');
    const getRes = await getSocial(getReq, { params: Promise.resolve({ id: 'deal-mp-1' }) });
    expect(getRes.status).toBe(200);
    const initialSocial = await getRes.json();
    expect(initialSocial.success).toBe(true);
    const initialEndorsementCount = initialSocial.endorsementsCount;

    // 2. Toggle endorsement
    const endorseReq = new Request('http://localhost:3000/api/deals/deal-mp-1/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'endorse' }),
    });
    const endorseRes = await postSocial(endorseReq, { params: Promise.resolve({ id: 'deal-mp-1' }) });
    expect(endorseRes.status).toBe(200);
    const endorseData = await endorseRes.json();
    expect(endorseData.success).toBe(true);
    expect(endorseData.action).toBe('endorse');

    // 3. Post a professional comment
    const commentReq = new Request('http://localhost:3000/api/deals/deal-mp-1/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'comment',
        content: 'Reviewing debt terms — what is the senior lender spread over SOFR?',
        authorName: 'David Chen',
        authorRole: 'Managing Director',
        authorCompany: 'Chen Horizon Capital',
      }),
    });
    const commentRes = await postSocial(commentReq, { params: Promise.resolve({ id: 'deal-mp-1' }) });
    expect(commentRes.status).toBe(201);
    const commentData = await commentRes.json();
    expect(commentData.success).toBe(true);
    expect(commentData.comment.content).toContain('senior lender spread over SOFR');
  });

  it.skip('syncs negotiation inquiry into Unified Inbox with off-platform closing reminder', async () => {
    const replyReq = new Request('http://localhost:3000/api/deals/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId: 'deal-mp-1',
        senderEmail: 'investor_partner@syndicate.io',
        content: 'Interested in placing a $50k ticket. Can you provide the rent roll and pro-forma schedule?',
      }),
    });

    const replyRes = await replyDeal(replyReq);
    expect(replyRes.status).toBe(200);
    const replyData = await replyRes.json();
    expect(replyData.success).toBe(true);
    expect(replyData.threadId).toBeDefined();

    // Verify it exists in Unified Inbox
    const threads = getInboxThreads();
    const createdThread = threads.find((t) => t.id === replyData.threadId);
    expect(createdThread).toBeDefined();
    expect(createdThread?.tab).toBe('opportunities');
    expect(createdThread?.body).toContain('OFF-PLATFORM CLOSING NOTICE');
  });
});
