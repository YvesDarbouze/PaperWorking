/**
 * Wave-2 production scope gate — FE path prefixes that are NOT backed by Nest Wave-1.
 * Direct navigation must be blocked in production; do not migrate Wave-2 here.
 */

/** Reserved / future Wave-2 FE paths (block even if not yet implemented). */
export const WAVE2_EXCLUDED_PATH_PREFIXES = [
  '/dashboard/banking',
  '/dashboard/plaid',
  '/dashboard/integrations',
  '/dashboard/esign',
  '/dashboard/drive',
  '/dashboard/capital-stack',
  '/dashboard/loans',
  '/dashboard/lender-package',
  '/dashboard/reconciliations',
  '/dashboard/financial',
  '/dashboard/tax',
  '/dashboard/reil',
  '/integrations',
  '/plaid',
  '/banking',
] as const;

/** Wave-1 launch-allowed app route prefixes (primary product surface). */
export const WAVE1_ALLOWED_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/auth',
  '/dashboard',
  '/projects',
  '/project',
  '/deals',
  '/vendor-portal',
  '/admin',
  '/pricing',
  '/support',
  '/help',
  '/marketplaces',
  '/how-it-works',
  '/home',
  '/changelog',
  '/contact',
  '/privacy',
  '/terms',
  '/billing',
] as const;

export function isWave2ExcludedPath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  return WAVE2_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Production gate: block Wave-2 reserved paths.
 * Non-production may keep paths for future UI scaffolding.
 */
export function shouldBlockWave2Path(
  pathname: string,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (nodeEnv !== 'production') return false;
  return isWave2ExcludedPath(pathname);
}
