import { describe, expect, it, beforeEach, afterAll } from '@jest/globals';
import { GET as getGuests, POST as postGuest, DELETE as deleteGuest } from '../../app/api/projects/[id]/guests/route';
import { GET as getTeam, POST as postTeam } from '../../app/api/projects/[id]/team/route';
import { GET as getPublicLinks, POST as postPublicLink, DELETE as deletePublicLink } from '../../app/api/projects/[id]/public-links/route';
import { GET as getPublicView } from '../../app/api/projects/[id]/public-view/route';
import { updateProjectInStore } from '../../lib/projects/project-store';
import { sentEmailsForTesting, __clearSentEmailsForTesting } from '../../lib/email/sendgrid-service';

const PID = 'deal-lifecycle'; // org-1

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (url: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const get = (url: string) => new Request(url);
const as = (uid: string) => {
  process.env.TEST_AUTH_UID = uid;
};

const ORIGINAL_UID = process.env.TEST_AUTH_UID;
afterAll(() => {
  process.env.TEST_AUTH_UID = ORIGINAL_UID;
});

describe('Team, Vendor & Public Access Controls', () => {
  beforeEach(async () => {
    as('usr-lead-1'); // owner of org-1
    __clearSentEmailsForTesting();
    // Reset test project in store with clean state
    await updateProjectInStore(PID, {
      vendorAccess: [],
      teamMembers: [
        { id: 'usr-lead-1', uid: 'usr-lead-1', name: 'Lead General Partner', role: 'Managing Member' },
      ],
      publicShareLinks: [],
    });
  });

  describe('Invite Guests & Vendors with Notification Email', () => {
    it('successfully invites a vendor and sends a customized transactional notification email', async () => {
      const payload = {
        uid: 'usr-vendor-101',
        name: 'Marcus Vance',
        email: 'marcus@vancecontracting.com',
        company: 'Vance Contracting',
        guestType: 'vendor',
        personalNote: 'Please review the electrical work breakdown in To-dos.',
      };

      const req = json(`http://localhost:3000/api/projects/${PID}/guests`, payload);
      const res = await postGuest(req, ctx(PID));
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.guest.name).toBe('Marcus Vance');
      expect(data.guest.email).toBe('marcus@vancecontracting.com');
      expect(data.guest.personalNote).toBe(payload.personalNote);

      // Verify email was dispatched via SendGrid test buffer
      expect(sentEmailsForTesting.length).toBe(1);
      const sent = sentEmailsForTesting[0];
      expect(sent?.to).toEqual([{ email: 'marcus@vancecontracting.com', name: 'Marcus Vance' }]);
      expect(sent?.subject).toContain('Collaborate on');
      expect(sent?.html).toContain('Vendor / External Partner');
      expect(sent?.html).toContain('Vance Contracting');
      expect(sent?.html).toContain(payload.personalNote);
    });

    it('removes a vendor successfully and records activity', async () => {
      // First invite
      await postGuest(
        json(`http://localhost:3000/api/projects/${PID}/guests`, {
          uid: 'usr-inspector-1',
          name: 'Sarah Inspector',
          guestType: 'vendor',
        }),
        ctx(PID),
      );

      // Then delete
      const deleteReq = new Request(
        `http://localhost:3000/api/projects/${PID}/guests?uid=usr-inspector-1`,
        { method: 'DELETE' },
      );
      const res = await deleteGuest(deleteReq, ctx(PID));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.guests.some((g: any) => g.uid === 'usr-inspector-1')).toBe(false);
    });
  });

  describe('Invite Team Members with Notification Email', () => {
    it('adds internal team member and sends internal team invitation email', async () => {
      const payload = {
        name: 'Elena Rostova',
        email: 'elena@capitalventures.com',
        role: 'Acquisitions Associate',
        personalNote: 'Welcome to the team, Elena!',
      };

      const req = json(`http://localhost:3000/api/projects/${PID}/team`, payload);
      const res = await postTeam(req, ctx(PID));
      expect(res.status).toBe(201);

      // Verify email was dispatched
      expect(sentEmailsForTesting.length).toBe(1);
      const sent = sentEmailsForTesting[0];
      expect(sent?.to).toEqual([{ email: 'elena@capitalventures.com', name: 'Elena Rostova' }]);
      expect(sent?.subject).toContain('Join');
      expect(sent?.html).toContain('Investment Team Member');
      expect(sent?.html).toContain(payload.personalNote);
    });
  });

  describe('Public Share Links', () => {
    it('generates a public share link, retrieves it, and accesses public view with token', async () => {
      // 1. Create Public Link
      const createReq = json(`http://localhost:3000/api/projects/${PID}/public-links`, {
        page: 'overview',
        label: 'Client Review Link',
        vendorOnly: true,
        expiresInDays: 14,
      });

      const postRes = await postPublicLink(createReq, ctx(PID));
      expect(postRes.status).toBe(201);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(true);
      const { token } = postJson.link;
      expect(token).toBeDefined();

      // 2. List Public Links
      const getReq = get(`http://localhost:3000/api/projects/${PID}/public-links`);
      const getRes = await getPublicLinks(getReq, ctx(PID));
      const getJson = await getRes.json();
      expect(getJson.links.some((l: any) => l.token === token)).toBe(true);

      // 3. Access Public View with Valid Token
      const viewReq = get(
        `http://localhost:3000/api/projects/${PID}/public-view?token=${encodeURIComponent(token)}&page=overview`,
      );
      const viewRes = await getPublicView(viewReq, ctx(PID));
      expect(viewRes.status).toBe(200);
      const viewJson = await viewRes.json();
      expect(viewJson.project.id).toBe(PID);
      expect(viewJson.shareInfo.page).toBe('overview');
      expect(viewJson.shareInfo.vendorOnly).toBe(true);

      // 4. Revoke Link
      const deleteReq = new Request(
        `http://localhost:3000/api/projects/${PID}/public-links?token=${encodeURIComponent(token)}`,
        { method: 'DELETE' },
      );
      const deleteRes = await deletePublicLink(deleteReq, ctx(PID));
      expect(deleteRes.status).toBe(200);

      // 5. Subsequent access is rejected with 403 Forbidden
      const afterViewRes = await getPublicView(viewReq, ctx(PID));
      expect(afterViewRes.status).toBe(403);
    });

    it('rejects public view when token is missing', async () => {
      const viewReq = get(`http://localhost:3000/api/projects/${PID}/public-view?page=overview`);
      const res = await getPublicView(viewReq, ctx(PID));
      expect(res.status).toBe(401);
    });
  });
});
