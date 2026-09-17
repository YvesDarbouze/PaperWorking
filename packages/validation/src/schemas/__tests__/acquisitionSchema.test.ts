import {
  acquisitionPipelineStatusEnum,
  deadReasonCategoryEnum,
  deadRecordSchema,
  sourcingIntakeSchema,
  propertySnapshotSchema,
  underwritingAssumptionsSchema,
  underwritingOutputsSchema,
  underwritingSnapshotSchema,
  offerLoiSchema,
  earnestMoneyDepositSchema,
  purchaseAndSaleAgreementSchema,
  contingencyItemSchema,
  contingencyExtensionSchema,
  dueDiligenceItemSchema,
  acquisitionTaskSchema,
  itemizedRehabBudgetSchema,
  holdingCostsSchema,
  counterofferRoundSchema,
  recordingInfoSchema,
  getStrategyTemplateDefaults,
  projectSchema,
} from '../index.js';

describe('Acquisition Pipeline Schemas (Phase 01)', () => {
  describe('Pipeline Status & Dead Record', () => {
    it('accepts all 8 forward states plus dead', () => {
      const states = [
        'lead',
        'analyzing',
        'offer_sent',
        'negotiating',
        'under_contract',
        'due_diligence',
        'clear_to_close',
        'closed',
        'dead',
      ];
      for (const s of states) {
        expect(acquisitionPipelineStatusEnum.parse(s)).toBe(s);
      }
    });

    it('rejects invalid pipeline status', () => {
      expect(() => acquisitionPipelineStatusEnum.parse('in_limbo')).toThrow();
    });

    it('validates a dead record with mandatory reason', () => {
      const validDead = {
        deadReasonCategory: 'failed_inspection',
        deadReasonNotes: 'Foundation crack discovered during structural inspection. Estimated repair $60k.',
        archivedAt: '2026-09-10T12:00:00.000Z',
        archivedByUid: 'user-investor-1',
        previousStatus: 'due_diligence',
      };
      expect(deadRecordSchema.parse(validDead)).toEqual(validDead);
    });

    it('rejects a dead record without notes', () => {
      expect(() =>
        deadRecordSchema.parse({
          deadReasonCategory: 'price_gap',
          deadReasonNotes: '',
          archivedAt: '2026-09-10T12:00:00.000Z',
          archivedByUid: 'user-investor-1',
          previousStatus: 'negotiating',
        }),
      ).toThrow();
    });
  });

  describe('Sourcing & Intake Schema', () => {
    it('accepts valid wholesaler sourcing intake', () => {
      const intake = {
        sourceType: 'wholesaler',
        sourceContactName: 'Dave Miller',
        sourceContactEmail: 'dave@austinwholesale.com',
        sourceContactPhone: '512-555-0199',
        sourceOrganization: 'Apex Wholesalers',
        askingPrice: 485000,
        offMarketFlag: true,
        sourcingNotes: 'Pocket listing, seller wants 14-day close.',
      };
      expect(sourcingIntakeSchema.parse(intake)).toMatchObject({
        sourceType: 'wholesaler',
        askingPrice: 485000,
        offMarketFlag: true,
      });
    });

    it('rejects non-positive asking price', () => {
      expect(() =>
        sourcingIntakeSchema.parse({
          sourceType: 'MLS',
          sourceContactName: 'MLS Listing Agent',
          askingPrice: -1000,
        }),
      ).toThrow();
    });

    it('rejects empty contact name', () => {
      expect(() =>
        sourcingIntakeSchema.parse({
          sourceType: 'inbound',
          sourceContactName: '   ',
          askingPrice: 350000,
        }),
      ).toThrow();
    });
  });

  describe('Property Snapshot Schema', () => {
    it('accepts verified property facts snapshot', () => {
      const snapshot = {
        address: '1247 Elm Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '78702',
        parcelNumberAPN: '02-1247-009',
        beds: 3,
        baths: 2,
        squareFeet: 1650,
        lotSizeSqFt: 6200,
        yearBuilt: 1984,
        propertyType: 'single_family',
        zoning: 'SF-3',
        currentOccupancy: 'vacant',
        estimatedRentMonthly: 2800,
        annualTaxAssessment: 420000,
        annualTaxBilled: 8400,
        hoaMonthlyFee: 0,
        dataProvider: 'rentcast',
        dataFetchedAt: '2026-09-10T10:00:00.000Z',
        isVerifiedByInvestor: true,
      };
      expect(propertySnapshotSchema.parse(snapshot)).toMatchObject({
        city: 'Austin',
        state: 'TX',
        zipCode: '78702',
        isVerifiedByInvestor: true,
      });
    });

    it('rejects invalid state code or ZIP code format', () => {
      expect(() =>
        propertySnapshotSchema.parse({
          address: '123 Main St',
          city: 'Austin',
          state: 'TEXAS', // Must be 2-letter abbreviation
          zipCode: '78702',
          propertyType: 'single_family',
        }),
      ).toThrow();

      expect(() =>
        propertySnapshotSchema.parse({
          address: '123 Main St',
          city: 'Austin',
          state: 'TX',
          zipCode: '787', // Invalid ZIP format
          propertyType: 'single_family',
        }),
      ).toThrow();
    });
  });

  describe('Underwriting Snapshot with Immutable Lineage', () => {
    it('accepts complete underwriting assumptions, outputs, and snapshot', () => {
      const assumptions = {
        strategy: 'flip' as const,
        purchasePrice: 520000,
        buyerClosingCostsPct: 2.0,
        buyerClosingCostsAmount: 10400,
        rehabBudget: 65000,
        estimatedARV: 680000,
        grossMonthlyRent: 4500,
        otherMonthlyIncome: 0,
        vacancyRatePct: 5.0,
        operatingExpenseRatioPct: 35.0,
        annualPropertyTax: 9200,
        annualInsurance: 1800,
        monthlyHOA: 0,
        monthlyManagementFeePct: 8.0,
        targetLtvPct: 75.0,
        interestRatePct: 6.5,
        amortizationYears: 30,
        interestOnlyMonths: 0,
        holdPeriodYears: 5,
        exitCapRatePct: 6.5,
        costOfSalePct: 5.0,
      };

      const outputs = {
        totalCostBasis: 595400,
        loanAmount: 390000,
        cashRequired: 205400,
        grossOperatingIncome: 59280,
        totalOperatingExpenses: 21142,
        netOperatingIncome: 38138,
        monthlyDebtService: 2465,
        annualDebtService: 29580,
        annualNetCashFlow: 8558,
        capRateOnCost: 6.4,
        cashOnCashReturnPct: 4.2,
        projectedIrrPct: 3.8,
        dscr: 1.29,
        ltvPct: 75.0,
        grossRentMultiplier: 8.3,
        maximumAllowableOffer70Pct: 400600,
        calculatedAt: '2026-09-10T12:00:00.000Z',
        engineVersion: '1.0.0',
      };

      const snapshot = {
        snapshotId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        version: 1,
        createdAt: '2026-09-10T12:00:00.000Z',
        createdByUid: 'investor-uid-42',
        source: 'deal_calculator' as const,
        calculatorVersion: '1.0.0',
        inputs: assumptions,
        outputs,
        assumptions: {
          propertyCondition: 'Distressed / Full cosmetic flip needed',
          submarketRating: 'A-',
          notes: 'Prime neighborhood, exit comps strong at $680k-$710k.',
        },
      };

      const parsed = underwritingSnapshotSchema.parse(snapshot);
      expect(parsed.snapshotId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(parsed.inputs.purchasePrice).toBe(520000);
      expect(parsed.outputs.maximumAllowableOffer70Pct).toBe(400600);
    });
  });

  describe('Offer, PSA & Earnest Money Deposit', () => {
    it('validates offer terms and earnest money requirements', () => {
      const offer = {
        offerPrice: 500000,
        earnestMoneyDepositAmount: 15000,
        inspectionPeriodDays: 10,
        financingContingencyDays: 21,
        appraisalContingencyDays: 14,
        titleContingencyDays: 14,
        targetClosingDate: '2026-10-15T17:00:00.000Z',
        escalationClauseEnabled: true,
        escalationMaxPrice: 525000,
        escalationIncrement: 2500,
        proofOfFundsAttached: true,
        sellerResponseStatus: 'accepted' as const,
      };
      expect(offerLoiSchema.parse(offer)).toMatchObject({
        offerPrice: 500000,
        escalationClauseEnabled: true,
      });

      const psa = {
        psaExecutionDate: '2026-09-10T14:00:00.000Z',
        effectiveDate: '2026-09-10T14:00:00.000Z',
        finalContractPrice: 505000,
        sellerLegalName: 'Elm Street Holdings LLC',
        buyerLegalEntityName: 'Austin Acquisitions I LLC',
        executedPsaDocUrl: 'https://storage.paperworking.co/docs/psa-signed.pdf',
        closingDateContractual: '2026-10-20T17:00:00.000Z',
        earnestMoney: {
          amount: 15000,
          dueDate: '2026-09-13T17:00:00.000Z',
          holderType: 'title_company' as const,
          holderEntityName: 'Heritage Title Co of Austin',
          holderContactName: 'Karen Vance',
          holderContactEmail: 'karen@heritagetitle.com',
          status: 'received_in_escrow' as const,
          receiptConfirmed: true,
          receiptConfirmedAt: '2026-09-12T11:30:00.000Z',
        },
      };
      expect(purchaseAndSaleAgreementSchema.parse(psa)).toMatchObject({
        finalContractPrice: 505000,
        earnestMoney: { receiptConfirmed: true },
      });
    });
  });

  describe('Contingencies, Diligence & Tasks', () => {
    it('validates contingency item with deadline and documents', () => {
      const contingency = {
        id: '11111111-2222-3333-4444-555555555555',
        type: 'inspection' as const,
        label: '10-Day General Structural & Mechanical Inspection',
        deadline: '2026-09-20T17:00:00.000Z',
        daysRemaining: 10,
        status: 'pending' as const,
        responsiblePartyUid: 'user-gc-1',
        responsiblePartyName: 'David Chen',
        notes: 'Inspect HVAC, roof condition, and sewer scope.',
        supportingDocumentUrls: [],
      };
      expect(contingencyItemSchema.parse(contingency)).toMatchObject({
        type: 'inspection',
        status: 'pending',
      });
    });

    it('validates due diligence item with findings severity and repair credit', () => {
      const item = {
        id: '22222222-3333-4444-5555-666666666666',
        category: 'physical_inspection' as const,
        title: 'Roof & Attic Inspection',
        status: 'approved' as const,
        assigneeUid: 'user-gc-1',
        assigneeName: 'David Chen',
        findingsSeverity: 'minor_issues' as const,
        findingsSummary: '3 missing shingles; minor flashing leak repaired.',
        repairCreditRequested: 2500,
        repairCreditApproved: 2000,
      };
      expect(dueDiligenceItemSchema.parse(item)).toMatchObject({
        category: 'physical_inspection',
        repairCreditApproved: 2000,
      });
    });

    it('validates acquisition task model with status and auto-generated flag', () => {
      const task = {
        id: '33333333-4444-5555-6666-777777777777',
        projectId: 'proj-1247-elm',
        title: 'Wire Earnest Money Deposit ($15,000)',
        dueDate: '2026-09-13T17:00:00.000Z',
        status: 'pending' as const,
        isAutoGenerated: true,
        sortOrder: 1,
      };
      expect(acquisitionTaskSchema.parse(task)).toMatchObject({
        title: 'Wire Earnest Money Deposit ($15,000)',
        isAutoGenerated: true,
      });
    });
  });

  describe('Strategy Template Presets Helper', () => {
    it('returns tailored configuration for Fix & Flip', () => {
      const flip = getStrategyTemplateDefaults('flip');
      expect(flip.dispositionType).toBe('SALE');
      expect(flip.holdPeriodYears).toBe(1);
      expect(flip.interestRatePct).toBe(9.5);
    });

    it('returns tailored configuration for BRRRR', () => {
      const brrrr = getStrategyTemplateDefaults('brrrr');
      expect(brrrr.dispositionType).toBe('RENT');
      expect(brrrr.operatingExpenseRatioPct).toBe(35.0);
      expect(brrrr.targetLtvPct).toBe(75.0);
    });

    it('returns tailored configuration for Short-Term Rental', () => {
      const str = getStrategyTemplateDefaults('short_term_rental_airbnb');
      expect(str.dispositionType).toBe('RENT');
      expect(str.operatingExpenseRatioPct).toBe(45.0);
      expect(str.vacancyRatePct).toBe(25.0);
    });
  });

  describe('Integration into Project Schema', () => {
    it('validates a complete project document with all typed Acquisition properties', () => {
      const fullProject = {
        id: 'proj-acquisition-test-01',
        ownerUid: 'user-investor-lead',
        organizationId: 'org-austin-syndicate',
        propertyName: '1247 Elm Street Quad',
        property_address: '1247 Elm Street, Austin, TX 78702',
        address: '1247 Elm Street, Austin, TX 78702',
        currentPhase: 1,
        phase: 'acquisition',
        status: 'acquisition',
        members: {
          'user-investor-lead': {
            uid: 'user-investor-lead',
            role: 'Lead Investor',
            joinedAt: '2026-09-10T10:00:00.000Z',
          },
        },
        createdAt: '2026-09-10T10:00:00.000Z',
        updatedAt: '2026-09-10T10:00:00.000Z',
        financials: {
          purchasePrice: 520000,
          estimatedARV: 680000,
          costs: [],
        },
        acquisitionStatus: 'under_contract',
        sourcing: {
          sourceType: 'wholesaler',
          sourceContactName: 'Dave Miller',
          askingPrice: 535000,
          offMarketFlag: true,
        },
        propertySnapshot: {
          address: '1247 Elm Street',
          city: 'Austin',
          state: 'TX',
          zipCode: '78702',
          propertyType: 'multi_family_2_4',
        },
        contingencies: [
          {
            id: '11111111-2222-3333-4444-555555555555',
            type: 'inspection',
            label: 'Inspection Contingency',
            deadline: '2026-09-20T17:00:00.000Z',
            status: 'pending',
            responsiblePartyUid: 'user-gc-1',
            responsiblePartyName: 'David Chen',
            supportingDocumentUrls: [],
          },
        ],
        dueDiligenceChecklist: [
          {
            id: '22222222-3333-4444-5555-666666666666',
            category: 'physical_inspection',
            title: 'Sewer Scope',
            status: 'not_started',
          },
        ],
        actionItems: [
          {
            id: '33333333-4444-5555-6666-777777777777',
            projectId: 'proj-acquisition-test-01',
            title: 'Wire EMD',
            dueDate: '2026-09-13T17:00:00.000Z',
            status: 'pending',
            isAutoGenerated: true,
            sortOrder: 0,
          },
        ],
      };

      const parsed = projectSchema.parse(fullProject);
      expect(parsed.acquisitionStatus).toBe('under_contract');
      expect(parsed.sourcing?.sourceType).toBe('wholesaler');
      expect(parsed.contingencies?.[0]).toMatchObject({ type: 'inspection' });
      expect(parsed.actionItems?.[0]).toMatchObject({ title: 'Wire EMD' });
    });
  });

  describe('Itemized Rehab Budget & Holding Costs', () => {
    it('validates itemized rehab budget with categories and contingency percentage', () => {
      const rehabBudget = {
        lineItems: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            category: 'roof_and_exterior' as const,
            description: 'Architectural shingle roof tear-off and replacement',
            laborCost: 6500,
            materialCost: 5500,
            totalCost: 12000,
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            category: 'kitchen_and_appliances' as const,
            description: 'Shaker cabinets, quartz counters, stainless package',
            laborCost: 5000,
            materialCost: 10000,
            totalCost: 15000,
          },
        ],
        subtotal: 27000,
        contingencyPct: 10.0,
        contingencyAmount: 2700,
        totalRehabBudget: 29700,
      };

      const parsed = itemizedRehabBudgetSchema.parse(rehabBudget);
      expect(parsed.subtotal).toBe(27000);
      expect(parsed.contingencyPct).toBe(10.0);
      expect(parsed.totalRehabBudget).toBe(29700);
      expect(parsed.lineItems).toHaveLength(2);
    });

    it('validates holding costs breakdown', () => {
      const holding = {
        monthlyLoanInterest: 2112,
        monthlyPropertyTax: 700,
        monthlyInsurance: 150,
        monthlyUtilities: 250,
        monthlyHOA: 0,
        totalMonthlyHoldingCost: 3212,
        estimatedHoldMonths: 6,
        totalHoldingCosts: 19272,
      };

      const parsed = holdingCostsSchema.parse(holding);
      expect(parsed.totalMonthlyHoldingCost).toBe(3212);
      expect(parsed.totalHoldingCosts).toBe(19272);
    });
  });

  describe('Counteroffers, Contingency Extensions & Recording Info', () => {
    it('validates versioned counteroffer rounds', () => {
      const counter = {
        roundNumber: 2,
        offeringParty: 'seller' as const,
        offerPrice: 515000,
        earnestMoneyAmount: 15000,
        concessionsRequested: 5000,
        termsSummary: 'Seller counters at $515k with $5k seller credit at closing.',
        submittedAt: '2026-09-11T16:00:00.000Z',
        status: 'pending' as const,
      };

      const parsed = counterofferRoundSchema.parse(counter);
      expect(parsed.roundNumber).toBe(2);
      expect(parsed.offerPrice).toBe(515000);
    });

    it('validates contingency extensions and recording information', () => {
      const extension = {
        extensionId: '44444444-4444-4444-4444-444444444444',
        previousDeadline: '2026-09-20T17:00:00.000Z',
        newDeadline: '2026-09-25T17:00:00.000Z',
        reason: 'Sewer line inspection requires specialized camera crew scheduled for Tuesday.',
        requestedAt: '2026-09-18T10:00:00.000Z',
        approvedBySeller: true,
      };
      expect(contingencyExtensionSchema.parse(extension)).toMatchObject({
        approvedBySeller: true,
      });

      const recording = {
        county: 'Travis County',
        recordingDate: '2026-10-21T14:30:00.000Z',
        instrumentNumber: 'DOC-2026-0098765',
        bookNumber: 'Vol 452',
        pageNumber: 'Page 112',
      };
      expect(recordingInfoSchema.parse(recording)).toMatchObject({
        county: 'Travis County',
        instrumentNumber: 'DOC-2026-0098765',
      });
    });

    it('validates canonical dead reason categories from specification', () => {
      const specCategories = [
        'numbers_failed',
        'offer_rejected',
        'inspection',
        'financing',
        'title',
        'other',
      ];
      for (const cat of specCategories) {
        expect(deadReasonCategoryEnum.parse(cat)).toBe(cat);
      }
    });
  });
});
