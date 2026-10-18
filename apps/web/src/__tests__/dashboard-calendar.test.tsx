import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeEach, afterAll } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { getPageLabel } from '../../lib/navigation/nav-contract';
import { GET as getCalendarEvents } from '../../app/api/calendar/events/route';
import DashboardCalendarPage from '../../app/(dashboard)/dashboard/calendar/page';
import DashboardCalendarPanel from '../../components/dashboard/DashboardCalendarPanel';

const ORIGINAL_UID = process.env.TEST_AUTH_UID;

afterAll(() => {
  process.env.TEST_AUTH_UID = ORIGINAL_UID;
});

describe('Bug_75: /dashboard/calendar RSC route and /api/calendar/events endpoint', () => {
  beforeEach(() => {
    process.env.TEST_AUTH_UID = 'usr-lead-1';
  });

  it('has a concrete Next.js page route at app/(dashboard)/dashboard/calendar/page.tsx so _rsc prefetch returns 200 OK', () => {
    const calendarPagePath = path.resolve(
      process.cwd(),
      'app/(dashboard)/dashboard/calendar/page.tsx',
    );
    expect(fs.existsSync(calendarPagePath)).toBe(true);
  });

  it('ensures every static /dashboard/* Link in CommandCenterPanel resolves to an existing page route', () => {
    const commandCenterPath = path.resolve(
      process.cwd(),
      'components/dashboard/CommandCenterPanel.tsx',
    );
    const source = fs.readFileSync(commandCenterPath, 'utf8');
    const hrefMatches = [...source.matchAll(/href="(\/dashboard(?:\/[a-z0-9-]+)*)"/gi)];
    expect(hrefMatches.length).toBeGreaterThan(0);

    for (const match of hrefMatches) {
      const routeHref = match[1]!;
      const relativeRoute = routeHref.replace(/^\//, '');
      const pagePath = path.resolve(process.cwd(), `app/(dashboard)/${relativeRoute}/page.tsx`);
      expect(fs.existsSync(pagePath)).toBe(true);
    }
  });

  it('resolves getPageLabel("/dashboard/calendar") to "Schedule & Calendar"', () => {
    expect(getPageLabel('/dashboard/calendar')).toBe('Schedule & Calendar');
  });

  it('renders DashboardCalendarPage and DashboardCalendarPanel with initial data, touch targets, and Lyra geometry', () => {
    const pageHtml = renderToString(<DashboardCalendarPage />);
    expect(pageHtml).toContain('Portfolio Schedule');

    const seededHtml = renderToString(
      <DashboardCalendarPanel
        initialLoading={false}
        initialData={{
          totalProjects: 2,
          activity: [],
          assignments: [
            {
              projectId: 'deal-lifecycle',
              projectName: '742 Evergreen Terrace',
              projectAddress: '742 Evergreen Terrace, Austin, TX',
              projectPhase: 'acquisition',
              task: {
                id: 'task-1',
                title: 'Upload earnest money wire receipt',
                status: 'in_progress',
                dueDate: '2026-10-25',
              } as any,
            },
          ],
          upcomingDeadlines: [
            {
              projectId: 'deal-lifecycle',
              projectName: '742 Evergreen Terrace',
              event: {
                id: 'evt-1',
                title: 'Inspection Contingency Expiration',
                date: '2026-10-22',
                category: 'contingency',
                phase: 'acquisition',
                isHardDate: true,
                notes: 'Hard deadline at 5:00 PM CST',
              },
            },
          ],
        }}
      />,
    );

    expect(seededHtml).toContain('Inspection Contingency Expiration');
    expect(seededHtml).toContain('Upload earnest money wire receipt');
    expect(seededHtml).toContain('742 Evergreen Terrace');
    expect(seededHtml).toContain('Hard Date');
    expect(seededHtml).toContain('/api/projects/deal-lifecycle/schedule/export');
    expect(seededHtml).toContain('max-w-[1200px]');
    expect(seededHtml).toContain('min-h-[44px]');
    expect(seededHtml).toContain('rounded-none');
  });

  it('renders empty and error states in DashboardCalendarPanel cleanly', () => {
    const emptyHtml = renderToString(
      <DashboardCalendarPanel
        initialLoading={false}
        initialData={{
          totalProjects: 0,
          activity: [],
          assignments: [],
          upcomingDeadlines: [],
        }}
      />,
    );
    expect(emptyHtml).toContain('No upcoming deadlines scheduled');

    const errorHtml = renderToString(
      <DashboardCalendarPanel
        initialLoading={false}
        initialError="Unable to load portfolio schedule."
      />,
    );
    expect(errorHtml).toContain('Unable to load portfolio schedule.');
  });

  it('returns 200 OK with portfolio schedule events on GET /api/calendar/events and 401 when unauthenticated', async () => {
    const res = await getCalendarEvents(new Request('http://localhost/api/calendar/events'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('connected');
    expect(Array.isArray(body.events)).toBe(true);
    expect(Array.isArray(body.upcomingDeadlines)).toBe(true);

    process.env.TEST_AUTH_UID = 'unauthenticated';
    const unauthRes = await getCalendarEvents(new Request('http://localhost/api/calendar/events'));
    expect(unauthRes.status).toBe(401);
  });
});
