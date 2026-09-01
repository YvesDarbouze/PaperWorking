import { Injectable, Logger } from '@nestjs/common';
import {
  createSupabaseIdentityVerifier,
  supabaseHasCredentials,
  type VerifiedIdentity,
} from '@paperworking/identity';

/** @deprecated Prefer @paperworking/identity directly — kept for Nest module exports. */
export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);
  private readonly verifier = createSupabaseIdentityVerifier();

  hasCredentials(): boolean {
    return supabaseHasCredentials();
  }

  async verifyAccessToken(accessToken: string): Promise<SupabaseAuthUser> {
    try {
      const identity: VerifiedIdentity = await this.verifier.verifyAccessToken(accessToken);
      return { id: identity.uid, email: identity.email };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Supabase JWT verify failed: ${message}`);
      throw error;
    }
  }
}
