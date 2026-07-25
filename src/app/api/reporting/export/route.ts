import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { computeFlipMetrics, computeAutopsyMetrics } from '@/lib/metrics';
import { logger } from '@/lib/logger';
import type { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   POST /api/reporting/export

   Security contract:
   • Requires a valid Firebase ID token (Bearer scheme). No token → 401.
   • Caller may only export projects they are a member of, or that belong
     to their organization (legacy fallback). Any unknown ID → 403.
   • All financial figures are derived server-side via the @metrics engine
     (computeFlipMetrics / computeAutopsyMetrics) from Firestore data, so
     an export can never disagree with the dashboard.
   • The request body must contain projectIds (string[]); full project
     objects are never accepted from the client.
   ═══════════════════════════════════════════════════════ */

function fmt(val: number): string {
  const neg = val < 0;
  return `${neg ? '-' : ''}$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export async function POST(req: NextRequest) {
  // ── 1. Authenticate ──────────────────────────────────────
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth; // 401 with reason

  const callerUid = auth.uid;

  try {
    const body = await req.json();
    const { format, type, projectIds } = body;

    if (!format || !type || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: format, type, projectIds (non-empty array)' },
        { status: 400 }
      );
    }

    if (!['csv', 'pdf', 'json'].includes(format)) {
      return NextResponse.json({ success: false, error: 'Invalid format' }, { status: 400 });
    }

    if (!['pl', 'cashflow', 'balance'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }

    // ── 2. Load caller profile once (for org-level membership fallback) ─
    const callerSnap = await adminDb.collection('users').doc(callerUid).get();
    const callerData = callerSnap.data();
    const callerOrgId: string | undefined = callerData?.organizationId;

    // ── 3. Fetch and authorize each requested project ────────
    const projects: Project[] = [];

    for (const projectId of projectIds) {
      if (typeof projectId !== 'string' || !projectId) {
        return NextResponse.json(
          { success: false, error: 'projectIds must be an array of non-empty strings' },
          { status: 400 }
        );
      }

      const snap = await adminDb.collection('projects').doc(projectId).get();
      if (!snap.exists) {
        return NextResponse.json(
          { success: false, error: `Project not found: ${projectId}` },
          { status: 404 }
        );
      }

      const deal = snap.data()!;

      // Primary: explicit membership entry
      const member = deal.members?.[callerUid];
      let authorized = !!member;

      // Fallback: org-level for legacy projects without a members map
      if (!authorized && callerOrgId && callerOrgId === deal.organizationId) {
        authorized = true;
      }

      if (!authorized) {
        logger.warn('[Export] Caller does not have access to project', { callerUid, projectId });
        return NextResponse.json(
          { success: false, error: 'Forbidden: you do not have access to one or more requested projects' },
          { status: 403 }
        );
      }

      projects.push({ ...deal, id: snap.id } as unknown as Project);
    }

    logger.info('[Export] Generating export', { callerUid, format, type, count: projects.length });

    // ── 4. Compute metrics and build export rows ─────────────
    // All figures derive from the @metrics engine so the export matches the dashboard.
    let dataRows: string[][] = [];

    if (type === 'pl') {
      // computeAutopsyMetrics handles all statuses:
      //   sold   → uses actualSalePrice, actual holdDays
      //   active → uses estimatedARV, holdDays-to-today (projected)
      let revenue = 0, purchaseCost = 0, rehabCosts = 0, acquisitionCosts = 0,
          holdingCosts = 0, exitCosts = 0;

      projects.forEach(deal => {
        if (!deal.financials) return;
        const m = computeAutopsyMetrics(deal);
        revenue        += m.grossSalePrice;
        purchaseCost   += m.purchasePrice;
        rehabCosts     += m.actualRehabCost;
        acquisitionCosts += m.acquisitionCosts;
        holdingCosts   += m.holdingCosts;
        exitCosts      += m.sellClosingCosts;
      });

      const cogs       = purchaseCost + rehabCosts + acquisitionCosts;
      const grossProfit = revenue - cogs;
      const totalOpex  = holdingCosts + exitCosts;
      const netProfit  = grossProfit - totalOpex;

      dataRows = [
        ['Revenue', ''],
        ['Sale Proceeds (Actual or Projected ARV)', fmt(revenue)],
        ['Total Revenue', fmt(revenue)],
        ['', ''],
        ['Cost of Goods Sold', ''],
        ['Purchase Price', fmt(purchaseCost)],
        ['Rehab & Renovation', fmt(rehabCosts)],
        ['Acquisition & Pre-Closing', fmt(acquisitionCosts)],
        ['Total COGS', fmt(cogs)],
        ['', ''],
        ['GROSS PROFIT', fmt(grossProfit)],
        ['', ''],
        ['Operating Expenses', ''],
        ['Holding Costs', fmt(holdingCosts)],
        ['Exit & Closing Costs', fmt(exitCosts)],
        ['Total Operating Expenses', fmt(totalOpex)],
        ['', ''],
        ['NET PROFIT / (LOSS)', fmt(netProfit)],
      ];
    } else if (type === 'balance') {
      // Active deals: book value = totalCost from computeFlipMetrics (purchase + rehab + projected hold)
      // Sold deals:   net cash   = grossSalePrice − sellClosingCosts from computeAutopsyMetrics
      let propertyInventory = 0, cashFromSales = 0, hardMoneyDebt = 0, privateLenderEquity = 0;

      projects.forEach(deal => {
        const fin = deal.financials;
        if (!fin) return;

        if (deal.status === 'exit' && deal.dispositionType === 'SALE') {
          const m = computeAutopsyMetrics(deal);
          cashFromSales += m.grossSalePrice - m.sellClosingCosts;
        } else {
          const flip = computeFlipMetrics(deal);
          propertyInventory += flip.totalCost;
          hardMoneyDebt += fin.loanAmount || 0;
        }

        deal.fractionalInvestors?.forEach(inv => {
          if (inv.status === 'confirmed') privateLenderEquity += inv.contributionAmount;
        });
      });

      const totalAssets      = propertyInventory + cashFromSales;
      const totalLiabilities = hardMoneyDebt + privateLenderEquity;

      dataRows = [
        ['ASSETS', ''],
        ['Property Inventory (Book Value)', fmt(propertyInventory)],
        ['Cash from Sales', fmt(cashFromSales)],
        ['Total Assets', fmt(totalAssets)],
        ['', ''],
        ['LIABILITIES', ''],
        ['Hard Money / Construction Loans', fmt(hardMoneyDebt)],
        ['Private Investor Equity', fmt(privateLenderEquity)],
        ['Total Liabilities', fmt(totalLiabilities)],
        ['', ''],
        ["OWNER'S EQUITY", fmt(totalAssets - totalLiabilities)],
      ];
    } else if (type === 'cashflow') {
      // Cash Flow: timeline-bucketed inflows and outflows derived from Firestore data
      const getMonthKey = (d: Date | string) => {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      };
      const buckets: Record<string, { inflows: number; outflows: number }> = {};
      const ensure = (k: string) => { if (!buckets[k]) buckets[k] = { inflows: 0, outflows: 0 }; };

      projects.forEach(deal => {
        const fin = deal.financials;
        if (!fin) return;

        if (deal.createdAt) {
          const k = getMonthKey(deal.createdAt);
          ensure(k);
          buckets[k].outflows += fin.purchasePrice || 0;
        }

        fin.costs?.forEach(c => {
          if (c.approved && c.createdAt) {
            const k = getMonthKey(c.createdAt);
            ensure(k);
            buckets[k].outflows += c.amount;
          }
        });

        if (deal.status === 'exit' && deal.dispositionType === 'SALE' && fin.actualSalePrice && fin.soldDate) {
          const k = getMonthKey(fin.soldDate);
          ensure(k);
          buckets[k].inflows += fin.actualSalePrice;
        }
      });

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      let cum = 0;
      dataRows = [['Month', 'Inflows', 'Outflows', 'Net Cash', 'Cumulative']];
      Object.keys(buckets).sort().forEach(k => {
        const b = buckets[k];
        const net = b.inflows - b.outflows;
        cum += net;
        const [y, m] = k.split('-');
        dataRows.push([`${monthNames[parseInt(m, 10) - 1]} ${y}`, fmt(b.inflows), fmt(b.outflows), fmt(net), fmt(cum)]);
      });
    }

    // ── 5. Format and return ─────────────────────────────────
    if (format === 'csv') {
      const csvString = dataRows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="export_${type}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: dataRows });
  } catch (error) {
    logger.error('[Export] Error generating export', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { success: false, error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
