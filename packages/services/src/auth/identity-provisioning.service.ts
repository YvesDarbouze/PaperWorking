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

function emailDocId(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Find/create/update authoritative user identity from a verified IdP token.
 * Firestore user documents use lowercase email as document id for console readability.
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
      const normalizedEmail = emailDocId(verified.email || '');
      if (!normalizedEmail) {
        throw new Error('Identity user email is required to provision application User');
      }

      const targetDocumentId = emailDocId(normalizedEmail);

      const byUid = await repository.findByFirebaseUid(authUserId);
      if (byUid) {
        if (byUid.documentId !== targetDocumentId) {
          onRemap?.(byUid.documentId, targetDocumentId, normalizedEmail);
          await repository.remapPrimaryKey(byUid.documentId, targetDocumentId);
        }
        await repository.updateEmail(targetDocumentId, normalizedEmail);
        return buildAuthUserForUid(authUserId, sessionStore);
      }

      const byEmail = await repository.findByEmail(normalizedEmail);
      if (byEmail) {
        if (byEmail.documentId !== targetDocumentId) {
          onRemap?.(byEmail.documentId, targetDocumentId, normalizedEmail);
          await repository.remapPrimaryKey(byEmail.documentId, targetDocumentId);
        }
        await repository.updateAfterEmailRemap(targetDocumentId, {
          email: normalizedEmail,
          legacyFirebaseUid: byEmail.legacyFirebaseUid ?? byEmail.id,
          firebaseUid: authUserId,
        });
        return buildAuthUserForUid(authUserId, sessionStore);
      }

      await repository.createUser({
        firebaseUid: authUserId,
        email: normalizedEmail,
        accountType,
      });
      return buildAuthUserForUid(authUserId, sessionStore);
    },
  };
}
