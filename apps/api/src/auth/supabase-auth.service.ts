import { Injectable, Logger } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);
  private client: SupabaseClient | null = null;

  hasCredentials(): boolean {
    return Boolean(this.resolveUrl() && this.resolveKey());
  }

  private resolveUrl(): string | undefined {
    return (
      process.env.SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      undefined
    );
  }

  private resolveKey(): string | undefined {
    return (
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      undefined
    );
  }

  private getClient(): SupabaseClient {
    if (!this.hasCredentials()) {
      throw new Error('Supabase Auth credentials not configured');
    }
    if (!this.client) {
      this.client = createClient(this.resolveUrl()!, this.resolveKey()!, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return this.client;
  }

  /**
   * Validate a Supabase access JWT and return auth.users identity.
   * Nest stores this JWT in an httpOnly cookie; never trust client claims alone.
   */
  async verifyAccessToken(accessToken: string): Promise<SupabaseAuthUser> {
    const { data, error } = await this.getClient().auth.getUser(accessToken);
    if (error || !data.user?.id) {
      this.logger.warn(`Supabase JWT verify failed: ${error?.message || 'no user'}`);
      throw new Error(error?.message || 'Invalid Supabase access token');
    }
    return {
      id: data.user.id,
      email: data.user.email ?? undefined,
    };
  }
}
