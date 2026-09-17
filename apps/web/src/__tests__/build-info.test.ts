import { describe, expect, it } from '@jest/globals';
import { resolveBuildSha, resolveBuiltAt } from '@/lib/build-info';
import { GET as healthRouteGet } from '@/app/api/health/route';

describe('Build Info Provenance', () => {
  it('prefers NEXT_PUBLIC_BUILD_SHA over others', () => {
    const sha = resolveBuildSha({
      NEXT_PUBLIC_BUILD_SHA: 'custom-sha-1234567',
      GITHUB_SHA: 'github-sha-ignore',
      COMMIT_SHA: 'cloudbuild-sha-ignore',
    });
    expect(sha).toBe('custom-sha-1234567');
  });

  it('falls back to GITHUB_SHA when NEXT_PUBLIC_BUILD_SHA is missing', () => {
    const sha = resolveBuildSha({
      GITHUB_SHA: 'github-action-commit-sha',
      COMMIT_SHA: 'cloudbuild-sha-ignore',
    });
    expect(sha).toBe('github-action-commit-sha');
  });

  it('falls back to COMMIT_SHA when GITHUB_SHA is missing', () => {
    const sha = resolveBuildSha({
      COMMIT_SHA: 'firebase-apphosting-commit-sha',
    });
    expect(sha).toBe('firebase-apphosting-commit-sha');
  });

  it('invokes git fallback when provided and env is empty', () => {
    const mockGit = () => 'git-local-head-sha-abcdef\n';
    const sha = resolveBuildSha({}, mockGit);
    expect(sha).toBe('git-local-head-sha-abcdef');
  });

  it('falls back gracefully to "unknown" when git fails and env is empty', () => {
    const failingGit = () => {
      throw new Error('fatal: not a git repository');
    };
    const sha = resolveBuildSha({}, failingGit);
    expect(sha).toBe('unknown');
  });

  it('resolves builtAt with timestamp fallback', () => {
    const customTime = '2026-09-04T12:00:00.000Z';
    expect(resolveBuiltAt({ NEXT_PUBLIC_BUILT_AT: customTime })).toBe(customTime);
    expect(resolveBuiltAt({ BUILD_TIME: customTime })).toBe(customTime);

    const fallbackTime = resolveBuiltAt({});
    expect(fallbackTime).toBeDefined();
    expect(isNaN(Date.parse(fallbackTime))).toBe(false);
  });
});

describe('Next.js /api/health Route', () => {
  it('returns 200 with status, buildSha, and builtAt fields', async () => {
    const res = await healthRouteGet();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.status).toBeDefined();
    expect(['string', 'object']).toContain(typeof data.status);
    expect(data.buildSha).toBeDefined();
    expect(typeof data.buildSha).toBe('string');
    expect(data.builtAt).toBeDefined();
    expect(typeof data.builtAt).toBe('string');
  });
});
