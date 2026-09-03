import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '../..');
const repoRoot = join(webRoot, '../..');

describe('phase E — Supabase runtime removed', () => {
  it('web package no longer depends on @supabase/supabase-js', () => {
    const pkg = JSON.parse(readFileSync(join(webRoot, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.['@supabase/supabase-js']).toBeUndefined();
  });

  it('identity package no longer depends on @supabase/supabase-js', () => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, 'packages/identity/package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.['@supabase/supabase-js']).toBeUndefined();
  });

  it('AuthContext is Firebase-only (supabaseReady always false)', () => {
    const source = readFileSync(join(webRoot, 'context/AuthContext.tsx'), 'utf8');
    expect(source).toContain('const supabaseReady = false');
    expect(source).not.toContain('@/lib/supabase/');
    expect(source).toContain('shouldUseFirebaseAuthClient');
  });

  it('legacy api client module removed', () => {
    let threw = false;
    try {
      readFileSync(join(webRoot, 'lib/api/client.ts'), 'utf8');
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('OAuth callback redirects away from Supabase flow', () => {
    const source = readFileSync(join(webRoot, 'app/auth/callback/page.tsx'), 'utf8');
    expect(source).not.toContain('supabase');
    expect(source).toContain('AUTH_ROUTES.login');
  });
});

describe('phase E — identity router rejects Supabase tokens', () => {
  it('identity-router source rejects supabase issuers', () => {
    const source = readFileSync(
      join(repoRoot, 'packages/identity/src/identity-router.ts'),
      'utf8',
    );
    expect(source).toContain('Supabase tokens are not accepted');
    expect(source).not.toContain('createSupabaseIdentityVerifier');
  });
});
