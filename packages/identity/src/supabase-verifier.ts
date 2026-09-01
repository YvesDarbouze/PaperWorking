import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseIdentityVerifier, VerifiedIdentity } from './types.js';

let client: SupabaseClient | null = null;

function resolveUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    undefined
  );
}

function resolveKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    undefined
  );
}

export function supabaseHasCredentials(): boolean {
  return Boolean(resolveUrl() && resolveKey());
}

function getClient(): SupabaseClient {
  if (!supabaseHasCredentials()) {
    throw new Error('Supabase Auth credentials not configured');
  }
  if (!client) {
    client = createClient(resolveUrl()!, resolveKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function resetSupabaseClientForTests(): void {
  client = null;
}

export function createSupabaseIdentityVerifier(): SupabaseIdentityVerifier {
  return {
    hasCredentials(): boolean {
      return supabaseHasCredentials();
    },

    async verifyAccessToken(accessToken: string): Promise<VerifiedIdentity> {
      const { data, error } = await getClient().auth.getUser(accessToken);
      if (error || !data.user?.id) {
        throw new Error(error?.message || 'Invalid Supabase access token');
      }
      return {
        uid: data.user.id,
        email: data.user.email ?? undefined,
        provider: 'supabase',
      };
    },
  };
}
