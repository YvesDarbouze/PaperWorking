/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Schema Validation Tests
 *
 * Tests for all canonical Zod schemas in /lib/schemas/.
 * Verifies that valid Firestore documents parse correctly
 * and that invalid data is rejected.
 *
 * Run: npx vitest run src/lib/schemas/__tests__/schemas.test.ts
 * ═══════════════════════════════════════════════════════════════
 */


import {
  userSchema,
  organizationSchema,
  projectSchema,
  propertyMetricSnapshotSchema,
  projectFolderSchema,
  projectFileSchema,
  vendorRequestSchema,
  notificationSchema,
  inboxItemSchema,
  stripeEventSchema,
  createVendorRequestSchema,
} from '../index.js';

// ── Fixtures ───────────────────────────────────────────────

const now = new Date();

const validUser = {
  uid: 'user_abc123',
  email: 'investor@paperworking.com',
  displayName: 'Jane Investor',
  role: 'Lead Investor',
  personalOrganizationId: 'org_personal_abc',
  subscriptionPlan: 'Individual',
  subscriptionStatus: 'active',
  createdAt: now,
  updatedAt: now,
};

const validOrganization = {
  id: 'org_abc123',
  name: 'Jane Capital LLC',
  ownerUid: 'user_abc123',
  accountTier: 'Team',
  subscriptionPlan: 'Team',
  subscriptionStatus: 'active',
  teamMembers: [],
  maxSeats: 10,
  createdAt: now,
  updatedAt: now,
};

const validProject = {
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
  },
  ownerUid: 'user_abc123',
  createdAt: now,
  updatedAt: now,
};

const validSnapshot = {
  id: 'proj_abc123_2026-05',
  projectId: 'proj_abc123',
  organizationId: 'org_abc123',
  period: '2026-05',
  periodType: 'monthly',
  date: now,
  noi: 18000,
  annualCashFlow: 12000,
  monthlyCashFlow: 1000,
  capRate: 7.2,
  arvCapRate: 5.1,
  cashOnCashReturn: 14.5,
  grossRentMultiplier: 10.5,
  dscr: 1.35,
  ltv: 72,
  oer: 45,
  occupancyRate: 95,
  irr: null,
  appreciation: null,
  isAppreciationRealized: null,
  propertyValue: 250000,
  totalCashInvested: 82500,
  grossRentalIncome: 26400,
  annualDebtService: 6000,
  loanAmount: 180000,
  totalOperatingExpenses: 8400,
  grossOperatingIncome: 26400,
  occupiedUnits: 1,
  numberOfUnits: 1,
  ownershipPercentage: 100,
  investorNOI: 18000,
  investorCashFlow: 12000,
  investorCoCReturn: 14.5,
  createdAt: now,
};

const validFolder = {
  id: 'folder_abc123',
  projectId: 'proj_abc123',
  organizationId: 'org_abc123',
  name: 'Find & Fund',
  phase: 'Find & Fund',
  ownerUid: 'user_abc123',
  fileCount: 3,
  createdAt: now,
};

const validFile = {
  id: 'file_abc123',
  folderId: 'folder_abc123',
  projectId: 'proj_abc123',
  organizationId: 'org_abc123',
  name: 'Appraisal Report.pdf',
  category: 'Appraisal',
  storageUrl: 'https://firebasestorage.googleapis.com/v0/b/paperworking.appspot.com/o/appraisal.pdf',
  fileType: 'application/pdf',
  sizeBytes: 524288,
  uploadedByUid: 'user_abc123',
  isVerified: false,
  uploadedAt: now,
};

const validVendorRequest = {
  id: 'vr_abc123',
  projectId: 'proj_abc123',
  vendorUid: 'vendor_xyz',
  status: 'PENDING',
  requestedAt: now,
};

const validNotification = {
  id: 'notif_abc123',
  recipientId: 'user_abc123',
  type: 'VENDOR_BID',
  title: 'John bid $15,000 on 123 Elm St',
  body: 'A vendor has submitted a quote for your project.',
  actor: {
    uid: 'vendor_xyz',
    name: 'John Contractor',
    role: 'Vendor',
  },
  objectReference: {
    projectId: 'proj_abc123',
    dealAddress: '123 Elm Street',
    amount: '$15,000',
  },
  urgencyLevel: 'actionable',
  channels: ['in-app', 'email'],
  read: false,
  archived: false,
  createdAt: now,
  deepLinkUrl: '/dashboard/projects/proj_abc123/vendors',
};

const validInboxItem = {
  id: 'inbox_abc123',
  recipientUid: 'user_abc123',
  organizationId: 'org_abc123',
  type: 'vendor_lead',
  title: 'New Vendor Lead',
  body: 'You have a new vendor lead for 123 Elm St.',
  priority: 'normal',
  read: false,
  archived: false,
  createdAt: now,
};

const validStripeEvent = {
  eventId: 'evt_1Oa8K2L4rNbg',
  type: 'checkout.session.completed',
  payload: { object: 'checkout.session' },
  processedAt: now,
};

// ── Tests ──────────────────────────────────────────────────

describe('User Schema', () => {
  it('accepts a valid user document', () => {
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('rejects a user with invalid email', () => {
    const result = userSchema.safeParse({ ...validUser, email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a user with empty uid', () => {
    const result = userSchema.safeParse({ ...validUser, uid: '' });
    expect(result.success).toBe(false);
  });

  it('accepts null email for phone-only auth', () => {
    const result = userSchema.safeParse({ ...validUser, email: null });
    expect(result.success).toBe(true);
  });
});

describe('Organization Schema', () => {
  it('accepts a valid organization', () => {
    const result = organizationSchema.safeParse(validOrganization);
    expect(result.success).toBe(true);
  });

  it('rejects an org with invalid account tier', () => {
    const result = organizationSchema.safeParse({
      ...validOrganization,
      accountTier: 'Enterprise',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an org with maxSeats < 1', () => {
    const result = organizationSchema.safeParse({
      ...validOrganization,
      maxSeats: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('Project Schema', () => {
  it('accepts a valid project document', () => {
    const result = projectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('rejects a project with invalid status', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      status: 'INVALID_STATUS',
    });
    expect(result.success).toBe(false);
  });

  it('accepts currentPhase as a number (1-4)', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      currentPhase: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects currentPhase > 4', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      currentPhase: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative purchase price', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      financials: {
        ...validProject.financials,
        purchasePrice: -100000,
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts project with cost entries', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      financials: {
        ...validProject.financials,
        costs: [
          {
            id: 'cost_1',
            description: 'Plumbing repair',
            amount: 5000,
            approved: true,
            addedBy: 'user_abc123',
            createdAt: now,
            category: 'Plumbing',
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('Property Metric Snapshot Schema', () => {
  it('accepts a valid snapshot', () => {
    const result = propertyMetricSnapshotSchema.safeParse(validSnapshot);
    expect(result.success).toBe(true);
  });

  it('accepts null metric fields (insufficient data)', () => {
    const result = propertyMetricSnapshotSchema.safeParse({
      ...validSnapshot,
      noi: null,
      capRate: null,
      dscr: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('Project Document Schemas', () => {
  it('accepts a valid folder', () => {
    const result = projectFolderSchema.safeParse(validFolder);
    expect(result.success).toBe(true);
  });

  it('accepts a valid file', () => {
    const result = projectFileSchema.safeParse(validFile);
    expect(result.success).toBe(true);
  });

  it('rejects a file with invalid category', () => {
    const result = projectFileSchema.safeParse({
      ...validFile,
      category: 'Tax Return',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a file with invalid storage URL', () => {
    const result = projectFileSchema.safeParse({
      ...validFile,
      storageUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('Vendor Request Schema', () => {
  it('accepts a valid vendor request', () => {
    const result = vendorRequestSchema.safeParse(validVendorRequest);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const result = vendorRequestSchema.safeParse({
      ...validVendorRequest,
      status: 'IN_PROGRESS',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a request with quoted fee', () => {
    const result = vendorRequestSchema.safeParse({
      ...validVendorRequest,
      status: 'QUOTED',
      quotedFee: 15000,
      quotedAt: now,
    });
    expect(result.success).toBe(true);
  });

  it('validates create vendor request input', () => {
    const result = createVendorRequestSchema.safeParse({
      projectId: 'proj_abc123',
      vendorUid: 'vendor_xyz',
      requestedBy: 'user_abc123',
    });
    expect(result.success).toBe(true);
  });
});

describe('Notification Schema', () => {
  it('accepts a valid notification', () => {
    const result = notificationSchema.safeParse(validNotification);
    expect(result.success).toBe(true);
  });

  it('rejects a notification with invalid type', () => {
    const result = notificationSchema.safeParse({
      ...validNotification,
      type: 'MAGIC_NOTIFICATION',
    });
    expect(result.success).toBe(false);
  });
});

describe('Inbox Item Schema', () => {
  it('accepts a valid inbox item', () => {
    const result = inboxItemSchema.safeParse(validInboxItem);
    expect(result.success).toBe(true);
  });

  it('rejects an inbox item with invalid priority', () => {
    const result = inboxItemSchema.safeParse({
      ...validInboxItem,
      priority: 'super-urgent',
    });
    expect(result.success).toBe(false);
  });
});

describe('Stripe Event Schema', () => {
  it('accepts a valid stripe event', () => {
    const result = stripeEventSchema.safeParse(validStripeEvent);
    expect(result.success).toBe(true);
  });

  it('rejects a stripe event with empty eventId', () => {
    const result = stripeEventSchema.safeParse({
      ...validStripeEvent,
      eventId: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional processing fields', () => {
    const result = stripeEventSchema.safeParse({
      ...validStripeEvent,
      processingStatus: 'failed',
      errorMessage: 'Webhook handler timeout',
      livemode: false,
    });
    expect(result.success).toBe(true);
  });
});
