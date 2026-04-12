import React from 'react';
import { useDealStore } from '@/store/dealStore';
import { DownloadCloud, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TaxExportCsvButton() {
  const deals = useDealStore(state => state.deals);

  const handleExportCsv = () => {
    try {
      // 1. Compile the Data
      const csvRows = [];
      // Headers
      csvRows.push(['Date', 'Property', 'Status', 'Category', 'Description', 'Amount', 'Approved by UID']);

      let rowCount = 0;

      deals.forEach(deal => {
        const approvedCosts = deal.financials?.costs?.filter(c => c.approved) || [];
        approvedCosts.forEach(cost => {
          const dateString = cost.createdAt ? new Date(cost.createdAt).toISOString().split('T')[0] : 'N/A';
          // Sanitize fields for CSV (remove commas)
          const propertyName = `"${deal.propertyName.replace(/"/g, '""')}"`;
          const description = `"${cost.description.replace(/"/g, '""')}"`;
          
          csvRows.push([
            dateString,
            propertyName,
            deal.status,
            cost.category || 'Other',
            description,
            cost.amount.toString(),
            cost.addedBy || 'N/A'
          ]);
          rowCount++;
        });
      });

      if (rowCount === 0) {
        toast.error("No approved ledger entries found to export.", { icon: '📄' });
        return;
      }

      // 2. Generate CSV String
      const csvString = csvRows.map(row => row.join(',')).join('\n');

      // 3. Create Blob & Trigger Download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Tax_Export_Engine_Room_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Successfully exported ${rowCount} ledger entries!`, { icon: '📊' });
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate CSV export.");
    }
  };

  return (
    <button 
      onClick={handleExportCsv}
      className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 mt-4 sm:mt-0 rounded-lg text-sm font-medium hover:bg-gray-800 transition active:scale-95 shadow-sm"
    >
      <DownloadCloud className="w-4 h-4" /> Export Schedule E / K-1 Data (CSV)
    </button>
  );
}
