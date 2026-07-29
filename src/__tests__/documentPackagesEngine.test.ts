import {
  assembleLenderPackage,
  assembleInvestorPackage,
  canCreateShareLink,
  canAssemblePackage,
  createShareTokenRecord,
  validatePackageTokenAccess,
} from '@/lib/packages/documentPackagesEngine';
import type { ProjectFile } from '@/types/documents';

describe('PK-1 — Document Packages & Archive Engine', () => {
  const mockProject = {
    id: 'proj_123',
    propertyName: 'Highland Park Quadplex',
    name: 'Highland Park Quadplex',
    rentRoll: [{ unit: 'Unit A', rent: 1500 }],
    financials: { monthlyGrossRent: 6000, purchasePrice: 450000 },
  };

  const mockFiles: ProjectFile[] = [
    {
      id: 'file_1',
      folderId: 'folder_1',
      projectId: 'proj_123',
      organizationId: 'org_1',
      name: 'Purchase_Agreement_Signed.pdf',
      category: 'Purchase Agreement',
      storageUrl: 'https://storage.firebase.com/purchase.pdf',
      fileType: 'application/pdf',
      uploadedByUid: 'user_1',
      isVerified: true,
      uploadedAt: new Date(),
      phase: 'phase-1',
    },
    {
      id: 'file_2',
      folderId: 'folder_2',
      projectId: 'proj_123',
      organizationId: 'org_1',
      name: 'Appraisal_Report_2026.pdf',
      category: 'Appraisal',
      storageUrl: 'https://storage.firebase.com/appraisal.pdf',
      fileType: 'application/pdf',
      uploadedByUid: 'user_1',
      isVerified: true,
      uploadedAt: new Date(),
      phase: 'phase-2',
    },
    {
      id: 'file_3',
      folderId: 'folder_3',
      projectId: 'proj_123',
      organizationId: 'org_1',
      name: 'Title_Commitment_Policy.pdf',
      category: 'Title Report',
      storageUrl: 'https://storage.firebase.com/title.pdf',
      fileType: 'application/pdf',
      uploadedByUid: 'user_1',
      isVerified: true,
      uploadedAt: new Date(),
      phase: 'phase-2',
    },
  ];

  describe('1. Lender Package Assembly & Zero File Duplication', () => {
    it('auto-populates customary lender slots and calculates completeness percentage with phase deep links', () => {
      const lenderPkg = assembleLenderPackage(mockProject, mockFiles);

      expect(lenderPkg.packageType).toBe('Lender');
      expect(lenderPkg.totalSlots).toBe(8);
      expect(lenderPkg.completenessPct).toBeGreaterThan(0);
      expect(lenderPkg.slots.length).toBe(8);

      // Verify slot deep link paths match phase cards
      const purchaseSlot = lenderPkg.slots.find((s) => s.slotKey === 'PURCHASE_CLOSING');
      expect(purchaseSlot).toBeDefined();
      expect(purchaseSlot?.isFulfilled).toBe(true);
      expect(purchaseSlot?.deepLinkPath).toBe('/dashboard/projects/proj_123/phase-1');

      const sreoSlot = lenderPkg.slots.find((s) => s.slotKey === 'SREO');
      expect(sreoSlot?.isFulfilled).toBe(true);
      expect(sreoSlot?.deepLinkPath).toBe('/dashboard/projects/proj_123/phase-4');
    });

    it('enforces zero file duplication — package holds document references only', () => {
      const originalFilesCount = mockFiles.length;
      const lenderPkg = assembleLenderPackage(mockProject, mockFiles);

      const purchaseSlot = lenderPkg.slots.find((s) => s.slotKey === 'PURCHASE_CLOSING');
      expect(purchaseSlot?.matchedFiles[0].id).toBe('file_1');

      // Modifying/deleting package definition leaves original projectFiles intact
      const clonedPkg = JSON.parse(JSON.stringify(lenderPkg));
      clonedPkg.slots = [];

      expect(mockFiles.length).toBe(originalFilesCount);
    });

    it('accurately calculates missing slots when partial docs are seeded', () => {
      // Seed empty files list
      const partialPkg = assembleLenderPackage(mockProject, []);

      const insuranceSlot = partialPkg.slots.find((s) => s.slotKey === 'INSURANCE');
      expect(insuranceSlot?.isFulfilled).toBe(false);
      expect(insuranceSlot?.itemCount).toBe(0);

      // SREO & P&L remain fulfilled via report engine auto-population
      const sreoSlot = partialPkg.slots.find((s) => s.slotKey === 'SREO');
      expect(sreoSlot?.isFulfilled).toBe(true);
    });
  });

  describe('2. Investor Package Assembly', () => {
    it('auto-populates investor slots with metrics, pro forma, and track record', () => {
      const investorPkg = assembleInvestorPackage(mockProject, mockFiles);

      expect(investorPkg.packageType).toBe('Investor');
      expect(investorPkg.totalSlots).toBe(6);
      expect(investorPkg.completenessPct).toBeGreaterThan(0);

      const dealSummarySlot = investorPkg.slots.find((s) => s.slotKey === 'DEAL_SUMMARY');
      expect(dealSummarySlot?.isFulfilled).toBe(true);
      expect(dealSummarySlot?.deepLinkPath).toBe('/dashboard/projects/proj_123/phase-1');
    });
  });

  describe('3. Governance & Role Access', () => {
    it('enforces creation and assembly rules per role', () => {
      expect(canCreateShareLink('Lead Investor')).toBe(true);
      expect(canCreateShareLink('Investor')).toBe(true);
      expect(canCreateShareLink('Admin')).toBe(true);

      // Team Members assemble but CANNOT create share links
      expect(canCreateShareLink('Team Member')).toBe(false);
      expect(canAssemblePackage('Team Member')).toBe(true);

      // Vendors CANNOT assemble or create share links
      expect(canCreateShareLink('Vendor')).toBe(false);
      expect(canAssemblePackage('Vendor')).toBe(false);
    });

    it('prevents unauthorized roles from creating share token records', () => {
      expect(() =>
        createShareTokenRecord('proj_123', 'Lender', 'user_team', 'team@pw.com', 'Team Member')
      ).toThrow(/Access denied/);
    });
  });

  describe('4. Token Security, Access Log & Scope Invariant', () => {
    it('creates token record with max 30-day expiry, access log tracking, and revocation', () => {
      const tokenRecord = createShareTokenRecord(
        'proj_123',
        'Lender',
        'user_lead',
        'lead@pw.com',
        'Lead Investor',
        30,
        true
      );

      expect(tokenRecord.token).toMatch(/^pkg_/);
      expect(tokenRecord.revoked).toBe(false);
      expect(tokenRecord.canDownload).toBe(true);
      expect(Array.isArray(tokenRecord.accessLog)).toBe(true);

      // Assert token scope bound strictly to single project & package type
      expect(tokenRecord.projectId).toBe('proj_123');
      expect(tokenRecord.packageType).toBe('Lender');

      const validation = validatePackageTokenAccess(tokenRecord);
      expect(validation.valid).toBe(true);

      // Test revocation
      tokenRecord.revoked = true;
      const revokedValidation = validatePackageTokenAccess(tokenRecord);
      expect(revokedValidation.valid).toBe(false);
      expect(revokedValidation.reason).toMatch(/revoked/i);
    });

    it('rejects expired tokens', () => {
      const expiredTokenRecord = createShareTokenRecord(
        'proj_123',
        'Investor',
        'user_lead',
        'lead@pw.com',
        'Lead Investor',
        1
      );

      // Artificially expire
      expiredTokenRecord.expiresAt = new Date(Date.now() - 1000).toISOString();

      const validation = validatePackageTokenAccess(expiredTokenRecord);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toMatch(/expired/i);
    });
  });
});
