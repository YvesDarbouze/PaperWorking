/**
 * Build Provenance & Identity
 *
 * Captures commit SHA and build timestamp baked at build time or resolved at runtime.
 * Fallback precedence: NEXT_PUBLIC_BUILD_SHA -> GITHUB_SHA -> COMMIT_SHA -> git rev-parse -> 'unknown'
 */

export interface BuildInfo {
  buildSha: string;
  builtAt: string;
}

export function resolveBuildSha(
  env: Record<string, string | undefined> = process.env,
  execGit?: () => string
): string {
  if (env.NEXT_PUBLIC_BUILD_SHA && env.NEXT_PUBLIC_BUILD_SHA.trim() !== '') {
    return env.NEXT_PUBLIC_BUILD_SHA.trim();
  }
  if (env.GITHUB_SHA && env.GITHUB_SHA.trim() !== '') {
    return env.GITHUB_SHA.trim();
  }
  if (env.COMMIT_SHA && env.COMMIT_SHA.trim() !== '') {
    return env.COMMIT_SHA.trim();
  }
  if (typeof window === 'undefined') {
    if (execGit) {
      try {
        const sha = execGit().trim();
        if (sha) return sha;
      } catch {
        return 'unknown';
      }
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execSync } = require('child_process');
        const sha = execSync('git rev-parse HEAD', {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        if (sha) return sha;
      } catch {
        return 'unknown';
      }
    }
  }
  return 'unknown';
}

export function resolveBuiltAt(
  env: Record<string, string | undefined> = process.env
): string {
  if (env.NEXT_PUBLIC_BUILT_AT && env.NEXT_PUBLIC_BUILT_AT.trim() !== '') {
    return env.NEXT_PUBLIC_BUILT_AT.trim();
  }
  if (env.BUILD_TIME && env.BUILD_TIME.trim() !== '') {
    return env.BUILD_TIME.trim();
  }
  return new Date().toISOString();
}

export const BUILD_SHA = resolveBuildSha();
export const BUILT_AT = resolveBuiltAt();
