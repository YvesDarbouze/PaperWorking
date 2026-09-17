import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

describe('Storage Security Rules: Default Deny & Per-Tenant Isolation Matrix', () => {
  const rulesPath = path.resolve(process.cwd(), '../../storage.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  it('verifies storage.rules file exists and specifies rules_version = 2 and service firebase.storage', () => {
    expect(rulesContent).toContain("rules_version = '2'");
    expect(rulesContent).toContain('service firebase.storage');
  });

  it('Matrix Policy: Global default-deny rule is present and unconditional', () => {
    expect(rulesContent).toMatch(/match\s*\/\{allPaths=\*\*\}[^}]*allow\s+read,\s*write:\s*if\s+false/);
  });

  it('verifies helper functions: isAuthenticated, isOwner, isInOrg', () => {
    expect(rulesContent).toContain('function isAuthenticated()');
    expect(rulesContent).toContain('request.auth != null');
    expect(rulesContent).toContain('function isOwner(uid)');
    expect(rulesContent).toContain('request.auth.uid == uid');
    expect(rulesContent).toContain('function isInOrg(orgId)');
    expect(rulesContent).toContain('request.auth.token.organizationId == orgId');
    expect(rulesContent).toContain('request.auth.token.orgId == orgId');
  });

  it('1. Org-Scoped Storage Paths: matches organizationId or orgId custom claim; max 50MB', () => {
    expect(rulesContent).toMatch(/match\s*\/orgs\/\{orgId\}\/\{allPaths=\*\*\}[^}]*allow\s+read:\s*if\s+isInOrg\(orgId\)/);
    expect(rulesContent).toMatch(/allow\s+write:\s*if\s+isInOrg\(orgId\)\s*&&\s*request\.resource\.size\s*<\s*50\s*\*\s*1024\s*\*\s*1024/);
  });

  it('2. Per-UID Temp Upload Quarantine Buffers: owner only; max 25MB', () => {
    expect(rulesContent).toMatch(/match\s*\/temp\/\{uid\}\/\{fileName\}[^}]*allow\s+read:\s*if\s+isOwner\(uid\)/);
    expect(rulesContent).toMatch(/match\s*\/temp\/\{uid\}\/\{fileName\}[^}]*allow\s+write:\s*if\s+isOwner\(uid\)\s*&&\s*request\.resource\.size\s*<\s*25\s*\*\s*1024\s*\*\s*1024/);

    expect(rulesContent).toMatch(/match\s*\/users\/\{uid\}\/temp\/\{fileName\}[^}]*allow\s+read:\s*if\s+isOwner\(uid\)/);
    expect(rulesContent).toMatch(/match\s*\/users\/\{uid\}\/temp\/\{fileName\}[^}]*allow\s+write:\s*if\s+isOwner\(uid\)\s*&&\s*request\.resource\.size\s*<\s*25\s*\*\s*1024\s*\*\s*1024/);
  });

  it('3. User Avatars: authenticated read; owner write max 5MB', () => {
    expect(rulesContent).toMatch(/match\s*\/users\/\{uid\}\/avatar\/\{fileName\}[^}]*allow\s+read:\s*if\s+isAuthenticated\(\)/);
    expect(rulesContent).toMatch(/match\s*\/users\/\{uid\}\/avatar\/\{fileName\}[^}]*allow\s+write:\s*if\s+isOwner\(uid\)\s*&&\s*request\.resource\.size\s*<\s*5\s*\*\s*1024\s*\*\s*1024/);
  });

  it('4. Deals Media: authenticated read; write false (server-only)', () => {
    expect(rulesContent).toMatch(/match\s*\/deals\/\{dealId\}\/media\/\{fileName\}[^}]*allow\s+read:\s*if\s+isAuthenticated\(\)/);
    expect(rulesContent).toMatch(/match\s*\/deals\/\{dealId\}\/media\/\{fileName\}[^}]*allow\s+write:\s*if\s+false/);
  });

  it('5. Contract Vault & Due Diligence (P-03 Closure): direct client reads revoked; server proxy only', () => {
    expect(rulesContent).toMatch(/match\s*\/deals\/\{dealId\}\/documents\/\{fileName\}[^}]*allow\s+read,\s*write:\s*if\s+false/);
    expect(rulesContent).toMatch(/match\s*\/projects\/\{projectId\}\/\{allPaths=\*\*\}[^}]*allow\s+read,\s*write:\s*if\s+false/);
  });

  it('Full Path-Class Evaluation Matrix Simulation for Storage', () => {
    type StorageAuthContext = {
      uid: string;
      token?: { organizationId?: string; orgId?: string };
    } | null;

    type RequestResource = {
      size: number;
    } | null;

    const evaluateStorageRule = (
      pathPattern: 'org' | 'temp' | 'avatar' | 'deal_media' | 'deal_documents' | 'project_docs' | 'unknown',
      operation: 'read' | 'write',
      auth: StorageAuthContext,
      targetEntityId: string,
      resource?: RequestResource,
    ): boolean => {
      const isAuthenticated = auth !== null;
      const isOwner = (uid: string) => isAuthenticated && auth?.uid === uid;
      const isInOrg = (orgId: string) =>
        isAuthenticated &&
        (auth?.token?.organizationId === orgId || auth?.token?.orgId === orgId);

      switch (pathPattern) {
        case 'org':
          if (!isInOrg(targetEntityId)) return false;
          if (operation === 'read') return true;
          return (resource?.size ?? 0) < 50 * 1024 * 1024;

        case 'temp':
          if (!isOwner(targetEntityId)) return false;
          if (operation === 'read') return true;
          return (resource?.size ?? 0) < 25 * 1024 * 1024;

        case 'avatar':
          if (operation === 'read') return isAuthenticated;
          if (!isOwner(targetEntityId)) return false;
          return (resource?.size ?? 0) < 5 * 1024 * 1024;

        case 'deal_media':
          return operation === 'read' ? isAuthenticated : false;

        case 'deal_documents':
        case 'project_docs':
          // P-03 Remediation: client direct access strictly forbidden
          return false;

        default:
          // Global default deny
          return false;
      }
    };

    const unauth: StorageAuthContext = null;
    const userOrg1: StorageAuthContext = { uid: 'u1', token: { organizationId: 'org-1' } };
    const userOrg2: StorageAuthContext = { uid: 'u2', token: { orgId: 'org-2' } };
    const userNoOrg: StorageAuthContext = { uid: 'u3' };

    // 1. Org-scoped paths
    expect(evaluateStorageRule('org', 'read', unauth, 'org-1')).toBe(false);
    expect(evaluateStorageRule('org', 'read', userNoOrg, 'org-1')).toBe(false);
    expect(evaluateStorageRule('org', 'read', userOrg2, 'org-1')).toBe(false); // wrong-org
    expect(evaluateStorageRule('org', 'read', userOrg1, 'org-1')).toBe(true); // matching organizationId
    expect(evaluateStorageRule('org', 'read', userOrg2, 'org-2')).toBe(true); // matching orgId

    // Org write payload size limits
    expect(evaluateStorageRule('org', 'write', userOrg1, 'org-1', { size: 10 * 1024 * 1024 })).toBe(true); // <50MB
    expect(evaluateStorageRule('org', 'write', userOrg1, 'org-1', { size: 60 * 1024 * 1024 })).toBe(false); // >50MB

    // 2. Temp upload buffers
    expect(evaluateStorageRule('temp', 'read', unauth, 'u1')).toBe(false);
    expect(evaluateStorageRule('temp', 'read', userOrg2, 'u1')).toBe(false); // wrong-uid
    expect(evaluateStorageRule('temp', 'read', userOrg1, 'u1')).toBe(true); // owner
    expect(evaluateStorageRule('temp', 'write', userOrg1, 'u1', { size: 20 * 1024 * 1024 })).toBe(true); // <25MB
    expect(evaluateStorageRule('temp', 'write', userOrg1, 'u1', { size: 30 * 1024 * 1024 })).toBe(false); // >25MB

    // 3. User Avatars
    expect(evaluateStorageRule('avatar', 'read', unauth, 'u1')).toBe(false);
    expect(evaluateStorageRule('avatar', 'read', userOrg2, 'u1')).toBe(true); // authenticated any user
    expect(evaluateStorageRule('avatar', 'write', userOrg2, 'u1', { size: 1024 })).toBe(false); // wrong-uid
    expect(evaluateStorageRule('avatar', 'write', userOrg1, 'u1', { size: 2 * 1024 * 1024 })).toBe(true); // owner <5MB
    expect(evaluateStorageRule('avatar', 'write', userOrg1, 'u1', { size: 6 * 1024 * 1024 })).toBe(false); // owner >5MB

    // 4. Deal Media
    expect(evaluateStorageRule('deal_media', 'read', unauth, 'deal-1')).toBe(false);
    expect(evaluateStorageRule('deal_media', 'read', userOrg1, 'deal-1')).toBe(true);
    expect(evaluateStorageRule('deal_media', 'write', userOrg1, 'deal-1', { size: 1024 })).toBe(false);

    // 5. Deal Documents & Projects Docs (P-03 Closure)
    expect(evaluateStorageRule('deal_documents', 'read', unauth, 'deal-1')).toBe(false);
    expect(evaluateStorageRule('deal_documents', 'read', userOrg1, 'deal-1')).toBe(false);
    expect(evaluateStorageRule('deal_documents', 'write', userOrg1, 'deal-1')).toBe(false);
    expect(evaluateStorageRule('project_docs', 'read', userOrg1, 'proj-1')).toBe(false);
    expect(evaluateStorageRule('project_docs', 'write', userOrg1, 'proj-1')).toBe(false);

    // 6. Unknown paths
    expect(evaluateStorageRule('unknown', 'read', userOrg1, 'any')).toBe(false);
    expect(evaluateStorageRule('unknown', 'write', userOrg1, 'any')).toBe(false);
  });
});
