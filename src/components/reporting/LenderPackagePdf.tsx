import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { FileDown, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { computeFlipMetrics, computeAutopsyMetrics } from '@/lib/metrics';

export default function LenderPackagePdf() {
  const projects = useProjectStore(state => state.projects);
  const [selectedDealId, setSelectedDealId] = useState<string>('');

  const handleGeneratePdf = () => {
    if (!selectedDealId) return toast.error("Select a deal to generate a package.");
    const deal = projects.find(d => d.id === selectedDealId);
    if (!deal) return;

    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(22);
      doc.setTextColor(33, 33, 33);
      doc.text("LENDER EXECUTIVE SUMMARY", 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

      // Property Info
      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text(`Target Property: ${deal.propertyName}`, 14, 40);
      doc.setFontSize(11);
      doc.text(`Address: ${deal.address}`, 14, 46);
      doc.text(`Current Phase: ${deal.status.toUpperCase()}`, 14, 52);

      // Projected metrics via @metrics
      const flip = computeFlipMetrics(deal);
      const approvedCostEntries = deal.financials.costs?.filter(c => c.approved) || [];

      // Realized metrics via @metrics (Sold deals only)
      let realizedROIHeadline = "N/A (Property Active)";
      if (deal.status === 'Sold') {
        const autopsy = computeAutopsyMetrics(deal);
        realizedROIHeadline = `${autopsy.roi.toFixed(1)}% (Profit: $${Math.round(autopsy.netProfit).toLocaleString()})`;
      }

      // Tables
      autoTable(doc, {
        startY: 65,
        head: [['Metric', 'Value']],
        body: [
          ['Purchase Price', `$${(deal.financials.purchasePrice || 0).toLocaleString()}`],
          ['After-Repair Value (ARV)', `$${flip.arv.toLocaleString()}`],
          ['Estimated Rehab Budget', `$${flip.rehabBudget.toLocaleString()}`],
          ['Actual Rehab Spend (To-Date)', `$${flip.rehabActual.toLocaleString()}`],
          ['Projected Profit', `$${Math.round(flip.netProjectedProfit).toLocaleString()}`],
          ['Projected ROI', `${flip.roi.toFixed(1)}%`],
          ['Realized Performance', realizedROIHeadline],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 11, cellPadding: 4 },
      });

      // Rehab Breakdown Line Items
      if (approvedCostEntries.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 65;
        doc.setFontSize(14);
        doc.text("Rehab & Value-Add Expenditures", 14, finalY + 15);

        const costRows = approvedCostEntries.map(c => [
          new Date(c.createdAt).toLocaleDateString(),
          c.category || 'Other',
          c.description,
          `$${c.amount.toLocaleString()}`,
        ]);

        autoTable(doc, {
          startY: finalY + 20,
          head: [['Date', 'Category', 'Description', 'Amount']],
          body: costRows,
          theme: 'striped',
          headStyles: { fillColor: [100, 100, 100] },
        });
      }

      // Output Document
      const filename = `Lender_Package_${deal.propertyName.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      toast.success(`Generated Lender Package: ${filename}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF. Check console.");
    }
  };

  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
         <h3 className="text-lg font-bold text-text-primary flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600"/> Lender Package Generator</h3>
         <p className="text-sm text-text-secondary mt-1">Export professional PDF reports combining ARV, actual rehabs, and ROI to secure funding.</p>
      </div>
      <div className="flex gap-3">
         <select
           value={selectedDealId}
           onChange={(e) => setSelectedDealId(e.target.value)}
           className="border border-border-accent rounded-lg text-sm p-2 bg-bg-primary focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[200px]"
         >
           <option value="" disabled>Select Property...</option>
           {projects.map(d => (
              <option key={d.id} value={d.id}>{d.propertyName} ({d.status})</option>
           ))}
         </select>
         <button
           onClick={handleGeneratePdf}
           disabled={!selectedDealId}
           className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[150px]"
         >
           <FileDown className="w-4 h-4" />
           Download PDF
         </button>
      </div>
    </div>
  );
}
