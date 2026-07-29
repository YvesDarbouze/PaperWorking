import React, { useState } from 'react';
import { Download, AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Invoice } from '@/types/Invoice';

interface InvoiceTableProps {
  invoices: Invoice[];
  onDownload: (id: string) => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, onDownload }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const paginatedInvoices = invoices.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-base font-semibold text-slate-900">Invoice History</h3>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
          <FileText className="w-8 h-8 mx-auto text-slate-350" />
          <p className="text-xs text-slate-450">No invoices yet. They will appear here after your first payment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500">
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {paginatedInvoices.map((inv) => {
                  let badgeCls = 'bg-slate-100 text-slate-600';
                  if (inv.status === 'paid') badgeCls = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                  if (inv.status === 'pending') badgeCls = 'bg-amber-50 text-amber-700 border border-amber-100';
                  if (inv.status === 'failed') badgeCls = 'bg-red-50 text-red-700 border border-red-100';

                  return (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pl-2 text-slate-900 font-medium">
                        {new Date(inv.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 text-slate-500">{inv.number || 'Subscription Renewal'}</td>
                      <td className="py-3.5 text-right text-slate-900 font-semibold">{inv.amount}</td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeCls}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={() => onDownload(inv.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#6B8E6B] hover:bg-slate-50 inline-flex items-center justify-center cursor-pointer transition-colors"
                          title="Download Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">
                Page {pageIndex + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={pageIndex === 0}
                  className="h-8 px-2.5 rounded border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-350 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={pageIndex === totalPages - 1}
                  className="h-8 px-2.5 rounded border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-350 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
