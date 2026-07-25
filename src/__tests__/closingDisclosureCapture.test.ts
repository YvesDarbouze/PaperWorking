import { projectSchema } from '@/lib/schemas/projectSchema';

describe('Card F5.3 — Closing Disclosure Capture Schema Validation', () => {
  const now = new Date();
  
  const validBaseProject = {
    id: 'proj_abc123',
    organizationId: 'org_abc123',
    propertyName: '123 Elm Street',
    address: '123 Elm Street, Miami, FL 33101',
    status: 'acquisition',
    members: {
      user_abc123: {
        uid: 'user_abc123',
        role: 'Lead Investor',
        joinedAt: now,
      },
    },
    financials: {
      purchasePrice: 250000,
      estimatedARV: 350000,
      costs: [],
      finalClosingCosts: 5000,
    },
    closingRoom: {
      titleInsuranceUrl: 'https://example.com/title.pdf',
      closingDisclosureUrl: 'https://example.com/cd.pdf',
      wiringInstructionsUrl: 'https://example.com/wire.pdf',
      assignedLawyerUid: 'lawyer_abc',
      lawyerVerified: true,
      blockchainTxHash: '0x123',
      chainOfTitleStatus: 'verified',
    },
    ownerUid: 'user_abc123',
    createdAt: now,
    updatedAt: now,
  };

  it('validates a project successfully with the new CD capture fields', () => {
    const projectWithCD = {
      ...validBaseProject,
      financials: {
        ...validBaseProject.financials,
        finalCashToClose: 45000,
        finalPrepaidsReserves: 1200,
      },
      closingRoom: {
        ...validBaseProject.closingRoom,
        cdFinalClosingCosts: 5200,
        cdCashToClose: 45200,
        cdPrepaidsReserves: 1250,
        cdSourceDocumentUrl: 'https://example.com/cd.pdf',
        cdSourceDocumentName: 'cd_v2.pdf',
        cdCapturedAt: new Date().toISOString(),
        cdCapturedByUid: 'user_xyz',
        cdCapturedByName: 'Jane Doe',
      },
    };

    const parseResult = projectSchema.safeParse(projectWithCD);
    if (!parseResult.success) {
      console.log('VALIDATION ERROR:', JSON.stringify(parseResult.error.format(), null, 2));
    }
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.financials.finalCashToClose).toBe(45000);
      expect(parseResult.data.financials.finalPrepaidsReserves).toBe(1200);
      expect(parseResult.data.closingRoom?.cdFinalClosingCosts).toBe(5200);
      expect(parseResult.data.closingRoom?.cdCashToClose).toBe(45200);
      expect(parseResult.data.closingRoom?.cdPrepaidsReserves).toBe(1250);
      expect(parseResult.data.closingRoom?.cdSourceDocumentName).toBe('cd_v2.pdf');
      expect(parseResult.data.closingRoom?.cdCapturedByName).toBe('Jane Doe');
    }
  });

  it('rejects invalid types for CD capture fields', () => {
    const invalidProject = {
      ...validBaseProject,
      financials: {
        ...validBaseProject.financials,
        finalCashToClose: 'not-a-number', // Should be a number
      },
    };

    const parseResult = projectSchema.safeParse(invalidProject);
    expect(parseResult.success).toBe(false);
  });
});
