import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { computeScheduleE, ScheduleEPreview } from '@/lib/tax/scheduleE';
import { computeProjectProfitAndLoss, ProjectProfitAndLoss } from '@/lib/tax/profitAndLoss';
import { aggregatePortfolioProfitAndLoss, aggregateScheduleE } from '@/lib/tax/portfolioSummary';
import { generateScheduleEPdf, generateProfitAndLossPdf } from '@/lib/tax/pdfGenerator';
import { getLogoBase64 } from '@/lib/tax/logo.server';
import { parseDateSafe } from '@/lib/utils/taxService';
import JSZip from 'jszip';
import { Project, LedgerItem } from '@/types/schema';

export const dynamic = 'force-dynamic';

const DISCLAIMER = "DISCLAIMER: This is not tax advice. Review with a licensed tax professional before filing. PaperWorking does not file taxes on your behalf.";

function fmt$(n: number): string {
  const isNeg = n < 0;
  const abs = Math.abs(n);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNeg ? '-' : ''}$${str}`;
}

export async function POST(request: NextRequest) {
  try {
    let taxYear: number;
    let projectIds: string[];
    let isCpaShare = false;

    // Check for shareToken in body
    const body = await request.json().catch(() => ({}));
    const { shareToken } = body;

    if (shareToken) {
      // 1. Verify shareToken
      const shareDoc = await adminDb.collection('taxShares').doc(shareToken).get();
      if (!shareDoc.exists) {
        return NextResponse.json({ error: 'Share link not found or invalid' }, { status: 404 });
      }
      
      const shareData = shareDoc.data();
      if (!shareData) {
        return NextResponse.json({ error: 'Share link data is empty' }, { status: 404 });
      }
      if (shareData.revoked) {
        return NextResponse.json({ error: 'This share link has been revoked' }, { status: 403 });
      }

      const expiresAtDate = shareData.expiresAt?.toDate?.() || new Date(shareData.expiresAt);
      if (new Date() > expiresAtDate) {
        return NextResponse.json({ error: 'This share link has expired' }, { status: 403 });
      }

      taxYear = shareData.taxYear;
      projectIds = shareData.projectIds;
      isCpaShare = true;
    } else {
      // 2. Perform normal user authorization
      const auth = await requireAuth(request);
      if (isAuthError(auth)) return auth;
      const { uid } = auth;

      taxYear = body.taxYear;
      projectIds = body.projectIds;

      if (!taxYear || typeof taxYear !== 'number') {
        return NextResponse.json({ error: 'Valid taxYear is required' }, { status: 400 });
      }
      
      if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
        return NextResponse.json({ error: 'At least one projectId is required' }, { status: 400 });
      }

      // 3. Verify user has read access to all selected projects
      for (const projectId of projectIds) {
        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectSnap = await projectRef.get();
        
        if (!projectSnap.exists) {
          return NextResponse.json({ error: `Project ${projectId} not found` }, { status: 404 });
        }

        const projectData = projectSnap.data();
        const targetOrgId = projectData?.organizationId;

        const userSnap = await adminDb.collection('users').doc(uid).get();
        const profile = userSnap.exists ? userSnap.data() : null;

        let hasAccess = false;
        if (targetOrgId && profile) {
          if (profile.personalOrganizationId === targetOrgId) hasAccess = true;
          else if (profile.organizationId === targetOrgId) hasAccess = true;
          else if (profile.memberships?.[targetOrgId]) hasAccess = true;
        }

        if (projectData?.ownerUid === uid || projectData?.members?.[uid]) {
          hasAccess = true;
        }

        if (!hasAccess) {
          return NextResponse.json(
            { error: `Access denied. You do not have permission to access project ${projectId}.` },
            { status: 403 }
          );
        }
      }
    }

    // 4. Fetch projects data
    const projects: Project[] = [];
    for (const pid of projectIds) {
      const doc = await adminDb.collection('projects').doc(pid).get();
      if (doc.exists) {
        projects.push({ id: doc.id, ...doc.data() } as Project);
      }
    }

    // 5. Fetch ledger items
    const allLedgerItems: Record<string, LedgerItem[]> = {};
    for (const project of projects) {
      const ledgerSnap = await adminDb
        .collection('projects')
        .doc(project.id)
        .collection('ledgerItems')
        .get();

      allLedgerItems[project.id] = ledgerSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LedgerItem[];
    }

    // 6. Compute Schedule E previews & P&L Statements
    const schedEPreviews = projects.map((p) =>
      computeScheduleE(p, allLedgerItems[p.id] || [], taxYear)
    );
    const aggregatedSchedE = aggregateScheduleE(schedEPreviews, taxYear);

    const plReports = projects.map((p) =>
      computeProjectProfitAndLoss(p, allLedgerItems[p.id] || [], taxYear)
    );
    const aggregatedPL = aggregatePortfolioProfitAndLoss(plReports, taxYear);

    // 7. Generate PDFs (server-side → include the disk-read logo in the header)
    const logoBase64 = getLogoBase64();
    const schedEPdfBytes = generateScheduleEPdf(schedEPreviews, aggregatedSchedE, taxYear, logoBase64);
    const plPdfBytes = generateProfitAndLossPdf(plReports, aggregatedPL, taxYear, logoBase64);

    // 8. Generate CSV
    let csvContent = 'Project Name,Date,Category,Description,Amount,Status,Receipt URL,Tax Category\n';
    const escapeCSV = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    
    for (const p of projects) {
      const items = allLedgerItems[p.id] || [];
      for (const item of items) {
        const itemDate = parseDateSafe(item.createdAt);
        if (itemDate && itemDate.getFullYear() === taxYear) {
          csvContent += `${escapeCSV(p.propertyName || p.address)},${
            itemDate.toISOString().split('T')[0]
          },${escapeCSV(item.category)},${escapeCSV(item.description)},${
            item.amount
          },${item.status},${escapeCSV(item.receiptUrl || '')}\n`;
        }
      }
    }

    // 9. Generate Reconciliation Summary TXT
    const propertiesList = projects
      .map((p, idx) => `  - ${String.fromCharCode(65 + idx)}) ${p.propertyName} (${p.address || 'No Address'})`)
      .join('\n');

    const reconSummary = `PAPERWORKING TAX PACK RECONCILIATION SUMMARY
Tax Year: ${taxYear}
Generated on: ${new Date().toLocaleDateString()}
Export Scope: ${isCpaShare ? 'CPA Share View' : 'Owner Export'}

Properties Included:
${propertiesList}

==================================================
PORTFOLIO TAX SUMMARY (AGGREGATED)
==================================================
Active Properties: ${aggregatedPL.activePropertiesCount}
Total Active Months: ${aggregatedPL.totalActiveMonths}

GROSS RENTAL INCOME: ${fmt$(aggregatedPL.grossRevenue)}
  Rental Revenue: ${fmt$(aggregatedPL.rentalIncome)}
  Other Operating Income: ${fmt$(aggregatedPL.otherIncome)}

OPERATING EXPENSES: ${fmt$(aggregatedPL.totalOperatingExpenses)}
  Property Taxes: ${fmt$(aggregatedPL.propertyTaxes)}
  Insurance: ${fmt$(aggregatedPL.insurance)}
  Utilities: ${fmt$(aggregatedPL.utilities)}
  Management Fees: ${fmt$(aggregatedPL.managementFees)}
  Repairs & Maintenance: ${fmt$(aggregatedPL.repairsMaintenance)}
  HOA Fees: ${fmt$(aggregatedPL.hoaFees)}
  Other Expenses: ${fmt$(aggregatedPL.otherExpenses)}

NET OPERATING INCOME (NOI): ${fmt$(aggregatedPL.netOperatingIncome)}

TAX DEDUCTIONS & CAPITAL FLOWS:
  Mortgage Interest: ${fmt$(aggregatedPL.mortgageInterest)}
  Mortgage Principal Paid: ${fmt$(aggregatedPL.mortgagePrincipal)}
  Capitalized Rehab Improvements: ${fmt$(aggregatedPL.capitalizedImprovements)}
  Depreciation Expense: ${fmt$(aggregatedPL.depreciation)}

--------------------------------------------------
NET TAXABLE INCOME / RESULT: ${fmt$(aggregatedPL.netTaxableIncome)}
NET CASH FLOW: ${fmt$(aggregatedPL.netCashFlow)}
==================================================

${DISCLAIMER}
`;

    // 10. Compile ZIP via JSZip
    const zip = new JSZip();
    zip.file('Schedule_E_Preview.pdf', schedEPdfBytes);
    zip.file('Profit_And_Loss.pdf', plPdfBytes);
    zip.file('Transactions.csv', csvContent);
    zip.file('Reconciliation_Summary.txt', reconSummary);

    // 11. Fetch receipts from storage bucket and add them
    try {
      const filesSnap = await adminDb
        .collection('projectFiles')
        .where('projectId', 'in', projectIds)
        .get();

      const bucket = adminStorage.bucket();
      
      for (const doc of filesSnap.docs) {
        const fileData = doc.data();
        const uploadedDate = fileData.uploadedAt?.toDate?.() || parseDateSafe(fileData.uploadedAt);
        
        if (uploadedDate && uploadedDate.getFullYear() === taxYear) {
          const storagePath = fileData.storagePath;
          if (storagePath) {
            try {
              const fileRef = bucket.file(storagePath);
              const [exists] = await fileRef.exists();
              if (exists) {
                const [content] = await fileRef.download();
                const categoryFolder = (fileData.category || 'Other').replace(/[^a-zA-Z0-9_-]/g, '_');
                const safeName = (fileData.name || 'receipt').replace(/[^a-zA-Z0-9._-]/g, '_');
                zip.file(`Receipts/${categoryFolder}/${safeName}`, content);
              }
            } catch (err: any) {
              console.warn(`[Tax export] Skipped downloading receipt file: ${storagePath}. Error:`, err.message);
            }
          }
        }
      }
    } catch (storageErr: any) {
      console.warn('[Tax export] Storage initialization or query skipped/failed. Continuing ZIP packaging without attachments:', storageErr.message);
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=PaperWorking_TaxPack_${taxYear}.zip`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tax export] Error compiling ZIP:', errMsg);
    return NextResponse.json(
      { error: 'Failed to compile tax export bundle', details: errMsg },
      { status: 500 }
    );
  }
}
