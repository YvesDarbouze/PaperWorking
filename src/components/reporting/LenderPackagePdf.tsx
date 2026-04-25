import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function LenderPackagePdf() {
  const projects = useProjectStore(state => state.projects);
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePdf = () => {
    if (!selectedDealId) return toast.error("Select a deal to generate a package.");
    const deal = projects.find(d => d.id === selectedDealId);
    if (!deal) return;

    setIsGenerating(true);
    toast.loading("Compiling Executive Summary...", { id: 'pdf-gen' });

    // Simulate async WebWorker rendering payload
    setTimeout(() => {
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

      // Financials Extraction
      const purchasePrice = deal.financials.purchasePrice || 0;
      const arv = deal.financials.estimatedARV || 0;
      const baseBudget = deal.rehab?.baseBudget || 0;
      
      const approvedCosts = deal.financials.costs?.filter(c => c.approved) || [];
      const actualRehabSpend = approvedCosts.reduce((acc, curr) => acc + curr.amount, 0);

      // Simple metric calculations
      // Projected ROI (Projected Profit / Burden)
      const totalEstimatedBurden = purchasePrice + baseBudget;
      const projectedProfit = arv - totalEstimatedBurden;
      const projectedROI = totalEstimatedBurden > 0 ? (projectedProfit / totalEstimatedBurden) * 100 : 0;

      // Realized if sold
      let realizedROIHeadline = "N/A (Property Active)";
      if (deal.status === 'Sold') {
        const pPrice = deal.financials.actualSalePrice || 0;
        const buyerComm = pPrice * ((deal.financials.buyersAgentCommission || 0)/100);
        const sellerComm = pPrice * ((deal.financials.sellersAgentCommission || 0)/100);
        const basicClosingCosts = deal.financials.finalClosingCosts || 0;
        
        let ledgerExitCosts = 0;
        deal.exitCosts?.forEach(ec => {
          if (ec.isPercentage && ec.percentageRate) {
            ledgerExitCosts += (ec.percentageRate / 100) * pPrice;
          } else {
            ledgerExitCosts += ec.amount;
          }
        });

        const totalBurden = purchasePrice + actualRehabSpend + (deal.costBasisLedger ? [
          ...(deal.costBasisLedger.directAcquisition || []),
          ...(deal.costBasisLedger.financing || []),
          ...(deal.costBasisLedger.preClosing || [])
        ].reduce((s, i) => s + i.amount, 0) : 0);
        
        const netProceeds = pPrice - buyerComm - sellerComm - basicClosingCosts - ledgerExitCosts;
        const realizedProfit = netProceeds - totalBurden;
        const realROI = totalBurden > 0 ? (realizedProfit / totalBurden) * 100 : 0;
        
        realizedROIHeadline = `${realROI.toFixed(1)}% (Profit: $${realizedProfit.toLocaleString()})`;
      }

      // Tables
      autoTable(doc, {
        startY: 65,
        head: [['Metric', 'Value']],
        body: [
          ['Purchase Price', `$${purchasePrice.toLocaleString()}`],
          ['After-Repair Value (ARV)', `$${arv.toLocaleString()}`],
          ['Estimated Rehab Budget', `$${baseBudget.toLocaleString()}`],
          ['Actual Rehab Spend (To-Date)', `$${actualRehabSpend.toLocaleString()}`],
          ['Projected Profit', `$${projectedProfit.toLocaleString()}`],
          ['Projected ROI', `${projectedROI.toFixed(1)}%`],
          ['Realized Performance', realizedROIHeadline]
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 11, cellPadding: 4 }
      });

      // Rehab Breakdown Line Items
      if (approvedCosts.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 65;
        doc.setFontSize(14);
        doc.text("Rehab & Value-Add Expenditures", 14, finalY + 15);
        
        const costRows = approvedCosts.map(c => [
          new Date(c.createdAt).toLocaleDateString(),
          c.category || 'Other',
          c.description,
          `$${c.amount.toLocaleString()}`
        ]);

        autoTable(doc, {
          startY: finalY + 20,
          head: [['Date', 'Category', 'Description', 'Amount']],
          body: costRows,
          theme: 'striped',
          headStyles: { fillColor: [100, 100, 100] }
        });
      }

      // Output Document
      const filename = `Lender_Package_${deal.propertyName.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      toast.success(`Generated Lender Package: ${filename}`, { id: 'pdf-gen', icon: '📑' });

    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF. Check console.", { id: 'pdf-gen' });
    } finally {
      setIsGenerating(false);
    }
    }, 1500); // end of async simulated worker
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
           disabled={!selectedDealId || isGenerating}
           className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[150px]"
         >
           {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
           {isGenerating ? 'Compiling...' : 'Download PDF'}
         </button>
      </div>
    </div>
  );
}
