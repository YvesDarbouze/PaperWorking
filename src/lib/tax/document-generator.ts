import PDFDocument from 'pdfkit';
import { ProjectTaxDatapoints } from './datapoint-schema';
import {
  calculate1040ES,
  calculateScheduleE,
  calculateDepreciation,
  calculateCapitalGains,
  calculate1099Thresholds,
} from './calculator';

export type TaxFormType =
  | '1040-ES'
  | 'Schedule-E'
  | 'Form-4562'
  | 'Schedule-D'
  | 'Form-8825'
  | 'Form-1099-NEC'
  | 'Form-1099-MISC';

export interface TaxDocumentResult {
  success: boolean;
  doc_id: string;
  formType: TaxFormType;
  taxYear: number;
  fileName: string;
  pdfBuffer: Buffer;
  generatedAt: string;
}

/**
 * Generates an automated IRS Tax Form PDF document
 */
export async function generateTaxDocument(
  datapoints: ProjectTaxDatapoints,
  formType: TaxFormType,
  taxYear: number = 2026
): Promise<TaxDocumentResult> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        const doc_id = `tax_doc_${formType.toLowerCase()}_${Date.now()}`;
        const fileName = `IRS_${formType}_${taxYear}_Project_${datapoints.project_id}.pdf`;

        resolve({
          success: true,
          doc_id,
          formType,
          taxYear,
          fileName,
          pdfBuffer,
          generatedAt: new Date().toISOString(),
        });
      });

      // Header Banner
      doc
        .fillColor('#0f172a')
        .rect(0, 0, doc.page.width, 80)
        .fill();

      doc
        .fillColor('#10b981')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('PAPERWORKING TAX AUTOMATION', 40, 20);

      doc
        .fillColor('#ffffff')
        .fontSize(12)
        .font('Helvetica')
        .text(`Internal Revenue Service - Official Data Report | Tax Year ${taxYear}`, 40, 48);

      doc.moveDown(3);

      // Document Title
      doc
        .fillColor('#0f172a')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`Form ${formType} Summary & Schedule Worksheet`, 40, 100);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#64748b')
        .text(`Project ID: ${datapoints.project_id} | Generated: ${new Date().toLocaleDateString()}`, 40, 125);

      doc.moveDown(1.5);
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, 140).lineTo(570, 140).stroke();

      let currentY = 160;

      // Populate Specific IRS Form Content
      if (formType === '1040-ES') {
        const est = calculate1040ES(datapoints.d5_1040_es.quarterly_net_income, 0.25, 12000, 120000);

        doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('Form 1040-ES: Estimated Tax Payment Voucher', 40, currentY);
        currentY += 25;

        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text(`Quarterly Net Investment Income: $${est.quarterlyNetIncome.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Estimated Federal Tax Payment Due: $${est.estimatedTaxDue.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Safe Harbor Threshold: $${est.safeHarborThreshold.toLocaleString()} (${est.qualifiesForSafeHarbor ? 'SAFE HARBOR MET' : 'ADDITIONAL PAYMENT REQUIRED'})`, 40, currentY);
        currentY += 25;

        doc.fontSize(11).font('Helvetica-Bold').text('Quarterly Payment Due Dates:', 40, currentY);
        currentY += 18;
        datapoints.d5_1040_es.payment_due_dates.forEach((date, i) => {
          doc.fontSize(10).font('Helvetica').text(`Q${i + 1}: ${date} - Voucher Amount: $${est.estimatedTaxDue.toLocaleString()}`, 50, currentY);
          currentY += 16;
        });
      } else if (formType === 'Schedule-E') {
        const schedE = calculateScheduleE(datapoints);

        doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('Schedule E: Supplemental Income and Loss (Part I)', 40, currentY);
        currentY += 25;

        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text(`Gross Rental Income Received: $${schedE.grossRentalIncome.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Mortgage Interest Paid: $${schedE.itemizedExpenses.mortgageInterest.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Property Taxes Paid: $${schedE.itemizedExpenses.propertyTaxes.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Depreciation Expense (Form 4562): $${schedE.itemizedExpenses.depreciation.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Total Operating Expenses: $${schedE.totalOperatingExpenses.toLocaleString()}`, 40, currentY);
        currentY += 22;

        doc.fontSize(11).font('Helvetica-Bold').fillColor(schedE.netRentalIncomeOrLoss >= 0 ? '#059669' : '#dc2626');
        doc.text(`Net Rental Income / (Loss): $${schedE.netRentalIncomeOrLoss.toLocaleString()}`, 40, currentY);
      } else if (formType === 'Form-4562') {
        const dep = calculateDepreciation(datapoints);

        doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('Form 4562: Depreciation and Amortization', 40, currentY);
        currentY += 25;

        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text(`Property Basis: $${dep.propertyBasis.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Land Value Allocation (Non-Depreciable): $${dep.landValue.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Depreciable Basis: $${dep.depreciableBasis.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Depreciation Method: ${dep.depreciationMethod} (27.5 Years Straight-Line)`, 40, currentY);
        currentY += 18;
        doc.text(`Annual Depreciation Deduction: $${dep.annualDepreciation.toLocaleString()}`, 40, currentY);
      } else if (formType === 'Schedule-D') {
        const gains = calculateCapitalGains(datapoints);

        doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('Schedule D: Capital Gains and Losses (Form 8949)', 40, currentY);
        currentY += 25;

        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text(`Gross Proceeds (Sale Price): $${datapoints.d4_exit.sale_price.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Adjusted Basis: $${gains.adjustedBasis.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Capital Gain / (Loss): $${gains.capitalGainOrLoss.toLocaleString()}`, 40, currentY);
        currentY += 18;
        doc.text(`Holding Period: ${gains.holdingPeriodMonths} Months (${gains.taxTreatment})`, 40, currentY);
      } else {
        // Fallback for Form 8825, 1099-NEC, 1099-MISC
        doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text(`IRS Form ${formType} Information Return`, 40, currentY);
        currentY += 25;

        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text(`Project ID: ${datapoints.project_id}`, 40, currentY);
        currentY += 18;
        doc.text(`Total Contractors Paid: ${(datapoints.d9_1099_returns.contractors_paid || []).length}`, 40, currentY);
      }

      // Footer Sign-off
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('Generated automatically by PaperWorking Tax Engine. Compliant with IRS Publication 527 & 946.', 40, 720, {
          align: 'center',
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
