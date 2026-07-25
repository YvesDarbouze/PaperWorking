import PDFDocument from 'pdfkit';

interface LOIParams {
  buyerName: string;
  buyerEmail: string;
  buyerEntity?: string;
  propertyName: string;
  offerAmount: number;
  earnestMoney: number;
  closingDate?: string;
  contingencies: string[];
}

export async function generateLOIPDF(params: LOIParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 54, bottom: 54, left: 54, right: 54 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // ── Letter Header ──
      doc.fontSize(10).font('Helvetica-Bold').text('LETTER OF INTENT (LOI)', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(10).font('Helvetica-Bold').text(`Date: `, { continued: true })
         .font('Helvetica').text(dateStr);
      
      doc.fontSize(10).font('Helvetica-Bold').text(`Buyer Entity: `, { continued: true })
         .font('Helvetica').text(params.buyerEntity || params.buyerName);
      
      doc.fontSize(10).font('Helvetica-Bold').text(`Buyer Email: `, { continued: true })
         .font('Helvetica').text(params.buyerEmail);
      doc.moveDown(1.5);

      doc.fontSize(10).font('Helvetica-Bold').text('Subject Property Address:');
      doc.fontSize(10).font('Helvetica').text(params.propertyName);
      doc.moveDown(2);

      // ── Introduction ──
      doc.fontSize(10).font('Helvetica').text(
        `This Letter of Intent ("Letter") outlines the preliminary terms and conditions under which the Buyer identified above proposes to purchase the real property address listed above. This Letter represents a non-binding offer, and the transaction is subject to the execution of a mutually acceptable Purchase and Sale Agreement (PSA).`,
        { align: 'justify' }
      );
      doc.moveDown(1.5);

      // ── Offer Terms Grid ──
      doc.fontSize(11).font('Helvetica-Bold').text('1. Proposed Deal Terms:');
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica-Bold').text('   Purchase Price: ', { continued: true })
         .font('Helvetica').text(`$${params.offerAmount.toLocaleString()} USD`);

      doc.fontSize(10).font('Helvetica-Bold').text('   Earnest Money Deposit (EMD): ', { continued: true })
         .font('Helvetica').text(`$${params.earnestMoney.toLocaleString()} USD (to be deposited within 3 days of executing PSA)`);

      doc.fontSize(10).font('Helvetica-Bold').text('   Closing Date Target: ', { continued: true })
         .font('Helvetica').text(params.closingDate ? new Date(params.closingDate).toLocaleDateString('en-US') : '30 Days after Due Diligence completion');
      doc.moveDown(1.5);

      // ── Contingencies ──
      doc.fontSize(11).font('Helvetica-Bold').text('2. Contingencies:');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(
        `The buyer's obligation to close this transaction is contingent upon the satisfaction or waiver of the following checkboxes/conditions within a standard due diligence window of 14 days after executing the final PSA:`
      );
      doc.moveDown(0.5);

      if (params.contingencies.length > 0) {
        params.contingencies.forEach((c) => {
          doc.fontSize(10).font('Helvetica-Bold').text(`   [x] ${c} Contingency: `, { continued: true })
             .font('Helvetica').text(`Transaction is subject to a satisfactory ${c.toLowerCase()} review.`);
        });
      } else {
        doc.fontSize(10).font('Helvetica').text('   No contingencies declared.');
      }
      doc.moveDown(1.5);

      // ── Non-Binding clause ──
      doc.fontSize(11).font('Helvetica-Bold').text('3. Non-Binding Clause:');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(
        `Except for the confidentiality and exclusivity sections of the final agreement, this Letter is strictly non-binding on all parties. No legal obligation is created until a final, executed Purchase and Sale Agreement is signed.`,
        { align: 'justify' }
      );
      doc.moveDown(2);

      // ── Signatures ──
      doc.fontSize(10).font('Helvetica-Bold').text('Buyer Signature:', { continued: true })
         .text('                                     ', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Name: ${params.buyerName}`);
      doc.text(`Entity: ${params.buyerEntity || 'Individual'}`);

      // Finalize and close the document
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
