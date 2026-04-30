import React from 'react';
import { Calendar, CheckCircle, Clock, DollarSign } from 'lucide-react';

interface EMDVerificationWidgetProps {
  emdAmount?: number;
  emdClearedDate?: Date | string | null;
  emdVerified?: boolean;
  onVerify: (verified: boolean, clearedDateStr: string | null) => void;
  phaseColor?: string;
  readOnly?: boolean;
}

export function EMDVerificationWidget({
  emdAmount = 0,
  emdClearedDate,
  emdVerified = false,
  onVerify,
  phaseColor = '#595959',
  readOnly = false,
}: EMDVerificationWidgetProps) {

  // Helper to parse the input date consistently
  const parseDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (d.toDate) return d.toDate(); // Firestore timestamp
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const cDate = parseDate(emdClearedDate);

  // Formatting date to YYYY-MM-DD for the native input
  let dateString = '';
  if (cDate) {
    const year = cDate.getFullYear();
    const month = String(cDate.getMonth() + 1).padStart(2, '0');
    const day = String(cDate.getDate()).padStart(2, '0');
    dateString = `${year}-${month}-${day}`;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    // If checking, and there's no date string, default to today
    let newDateStr = dateString;
    if (checked && !dateString) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      newDateStr = `${year}-${month}-${day}`;
    } else if (!checked) {
      newDateStr = '';
    }
    onVerify(checked, newDateStr);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onVerify(!!val, val); // If a date is selected, assume it is verified
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-sm border mt-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ background: phaseColor }}>
        <div className="flex items-center gap-3">
          <DollarSign className="w-4 h-4" style={{ color: '#FFFFFF' }} />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#FFFFFF' }}>
            Earnest Money Deposit (EMD)
          </h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between border-b pb-6" style={{ borderColor: 'var(--border-ui)' }}>
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>EMD Amount</label>
            <p className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(emdAmount)}
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-opacity-10 px-4 py-2 rounded-md border" style={{ 
            backgroundColor: emdVerified ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            borderColor: emdVerified ? '#22C55E' : '#F59E0B',
            color: emdVerified ? '#166534' : '#92400E'
          }}>
            {emdVerified ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
            <span className="text-sm font-bold">
              {emdVerified ? 'Cleared' : 'Pending Verification'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 p-4 rounded-md border cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--border-ui)' }}>
            <div className="pt-0.5">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                checked={emdVerified}
                onChange={handleCheckboxChange}
                disabled={readOnly}
              />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Confirm EMD Wired</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
                I verify that the earnest money deposit has been wired and cleared by the attorney/escrow account.
              </p>
            </div>
          </label>

          {emdVerified && (
            <div className="p-4 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-default)' }}>
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Funds Cleared Date</label>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Log exactly when the funds cleared the account
                </p>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={dateString}
                  onChange={handleDateChange}
                  disabled={readOnly}
                  className="pl-10 pr-4 py-2 w-full sm:w-auto rounded-md border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  style={{ 
                    backgroundColor: 'var(--bg-default)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
