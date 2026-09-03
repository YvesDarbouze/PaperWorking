import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

describe('phase B14 — browser document transport', () => {
  it('ProjectDocumentsPanel uses same-origin document BFF helpers', () => {
    const panel = readFileSync(
      join(here, '../../components/projects/ProjectDocumentsPanel.tsx'),
      'utf8',
    );

    expect(panel).toContain('listProjectDocumentsFromBff');
    expect(panel).toContain('uploadProjectDocumentFromBff');
    expect(panel).toContain('getProjectDocumentAccessFromBff');
    expect(panel).not.toContain('loadProjectById');
  });

  it('Next document routes delegate to shared document services', () => {
    const listRoute = readFileSync(
      join(here, '../../app/api/projects/[id]/documents/route.ts'),
      'utf8',
    );
    const accessRoute = readFileSync(
      join(here, '../../app/api/projects/[id]/documents/[documentId]/route.ts'),
      'utf8',
    );

    expect(listRoute).toContain('buildProjectDocumentsReadService');
    expect(listRoute).toContain('buildProjectDocumentsCommandService');
    expect(accessRoute).toContain('getDocumentAccess');
  });
});

describe('phase B14 — B1/B8 project regression guard', () => {
  it('core project routes unchanged', () => {
    const projects = readFileSync(join(here, '../../app/api/projects/route.ts'), 'utf8');
    const projectDetail = readFileSync(join(here, '../../app/api/projects/[id]/route.ts'), 'utf8');

    expect(projects).toContain('buildProjectsReadService');
    expect(projects).toContain('buildProjectsCommandService');
    expect(projectDetail).toContain('buildProjectsReadService');
    expect(projectDetail).toContain('buildProjectsCommandService');
  });
});
