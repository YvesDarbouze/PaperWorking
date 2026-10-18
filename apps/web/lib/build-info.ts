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
  env?: Record<string, string | undefined>,
  execGit?: () => string
): string {
  const targetEnv = env ?? process.env;
  const publicBuildSha =
    env === undefined ? process.env.NEXT_PUBLIC_BUILD_SHA : targetEnv.NEXT_PUBLIC_BUILD_SHA;
  if (publicBuildSha && publicBuildSha.trim() !== '') {
    return publicBuildSha.trim();
  }
  if (targetEnv.GITHUB_SHA && targetEnv.GITHUB_SHA.trim() !== '') {
    return targetEnv.GITHUB_SHA.trim();
  }
  if (targetEnv.COMMIT_SHA && targetEnv.COMMIT_SHA.trim() !== '') {
    return targetEnv.COMMIT_SHA.trim();
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
  env?: Record<string, string | undefined>
): string {
  const targetEnv = env ?? process.env;
  const publicBuiltAt =
    env === undefined ? process.env.NEXT_PUBLIC_BUILT_AT : targetEnv.NEXT_PUBLIC_BUILT_AT;
  if (publicBuiltAt && publicBuiltAt.trim() !== '') {
    return publicBuiltAt.trim();
  }
  if (targetEnv.BUILD_TIME && targetEnv.BUILD_TIME.trim() !== '') {
    return targetEnv.BUILD_TIME.trim();
  }
  return new Date().toISOString();
}

export const BUILD_SHA = resolveBuildSha();
export const BUILT_AT = resolveBuiltAt();
