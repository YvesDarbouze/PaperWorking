import type { AuthUser } from '@paperworking/authz';
import type { VerifiedIdentity } from '@paperworking/identity';
import { buildAuthUserForUid } from '../session/build-auth-user.js';
import type { SessionUserStore } from '../session/types.js';
import type { IdentityProvisioningService, IdentityUserRepository } from './types.js';

export type CreateIdentityProvisioningServiceInput = {
  repository: IdentityUserRepository;
  sessionStore: SessionUserStore;
  onRemap?: (oldId: string, newId: string, email: string) => void;
};

/**
 * Find/create/update authoritative Neon user identity from a verified IdP token.
 * Does not perform HTTP, authorization, or subscription logic.
 */
export function createIdentityProvisioningService(
  input: CreateIdentityProvisioningServiceInput,
): IdentityProvisioningService {
  const { repository, sessionStore, onRemap } = input;

  return {
    async provisionFromVerifiedIdentity(
      verified: VerifiedIdentity,
      accountType: string,
    ): Promise<AuthUser> {
      const authUserId = verified.uid;
      const normalizedEmail = (verified.email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error('Identity user email is required to provision application User');
      }

      const byId = await repository.findById(authUserId);
      if (byId) {
        await repository.updateEmail(byId.id, normalizedEmail);
        return buildAuthUserForUid(byId.id, sessionStore);
      }

      const byLegacy = await repository.findByLegacyUid(authUserId);
      if (byLegacy) {
        if (byLegacy.id !== authUserId) {
          await repository.remapPrimaryKey(byLegacy.id, authUserId);
        }
        return buildAuthUserForUid(authUserId, sessionStore);
      }

      const byEmail = await repository.findByEmail(normalizedEmail);
      if (byEmail) {
        if (byEmail.id !== authUserId) {
          onRemap?.(byEmail.id, authUserId, normalizedEmail);
          await repository.remapPrimaryKey(byEmail.id, authUserId);
        }
        await repository.updateAfterEmailRemap(authUserId, {
          email: normalizedEmail,
          legacyFirebaseUid: byEmail.legacyFirebaseUid ?? byEmail.id,
        });
        return buildAuthUserForUid(authUserId, sessionStore);
      }

      await repository.createUser({
        id: authUserId,
        email: normalizedEmail,
        accountType,
      });
      return buildAuthUserForUid(authUserId, sessionStore);
    },
  };
}
