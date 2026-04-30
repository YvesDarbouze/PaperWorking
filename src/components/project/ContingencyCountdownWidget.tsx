import React from 'react';
import { Calendar, AlertCircle, Clock } from 'lucide-react';

interface ContingencyCountdownWidgetProps {
  closingDate?: Date | string | null;
  onClosingDateChange: (dateStr: string) => void;
  phaseColor?: string;
  readOnly?: boolean;
}

export function ContingencyCountdownWidget({ 
  closingDate, 
  onClosingDateChange, 
  phaseColor = '#595959',
  readOnly = false
}: ContingencyCountdownWidgetProps) {
  
  // Helper to parse the input date consistently
  const parseDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (d.toDate) return d.toDate(); // Firestore timestamp
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const cDate = parseDate(closingDate);

  // Formatting date to YYYY-MM-DD for the native input
  let dateString = '';
  if (cDate) {
    const year = cDate.getFullYear();
    const month = String(cDate.getMonth() + 1).padStart(2, '0');
    const day = String(cDate.getDate()).padStart(2, '0');
    dateString = `${year}-${month}-${day}`;
  }

  // Calculate days remaining from today to a given deadline
  const getDaysRemaining = (deadline: Date | null) => {
    if (!deadline) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const target = new Date(deadline);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Due Diligence is 14 days before closing
  const ddDeadline = cDate ? new Date(cDate.getTime() - 14 * 24 * 60 * 60 * 1000) : null;
  const ddDays = getDaysRemaining(ddDeadline);

  // Financing is 7 days before closing
  const finDeadline = cDate ? new Date(cDate.getTime() - 7 * 24 * 60 * 60 * 1000) : null;
  const finDays = getDaysRemaining(finDeadline);

  const renderContingencyItem = (label: string, deadline: Date | null, daysRemaining: number | null) => {
    // Warning state if deadline is <= 2 days (48 hours)
    const isWarning = daysRemaining !== null && daysRemaining <= 2;
    const isExpired = daysRemaining !== null && daysRemaining < 0;

    return (
      <div 
        className={`p-4 rounded-md border-2 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isWarning && !isExpired ? 'border-amber-500 bg-amber-50' : 
          isExpired ? 'border-red-500 bg-red-50' : 'border-transparent'
        }`}
        style={{
          borderColor: (!isWarning && !isExpired) ? 'var(--border-ui)' : undefined,
          backgroundColor: (!isWarning && !isExpired) ? 'var(--bg-default)' : undefined,
        }}
      >
        <div className="flex flex-col">
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {label}
          </span>
          <span className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
            Deadline: {deadline ? deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending Closing Date'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(isWarning || isExpired) && <AlertCircle className={`w-5 h-5 ${isExpired ? 'text-red-600' : 'text-amber-600'}`} />}
          <div 
            className="font-bold text-lg"
            style={{ 
              color: isExpired ? '#DC2626' : isWarning ? '#D97706' : 'var(--text-primary)' 
            }}
          >
            {daysRemaining !== null ? (
              daysRemaining > 0 
                ? `${daysRemaining} Days Left` 
                : daysRemaining === 0 
                  ? 'Due Today' 
                  : `${Math.abs(daysRemaining)} Days Past Due`
            ) : '--'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-sm border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
      <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ background: phaseColor }}>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4" style={{ color: '#FFFFFF' }} />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#FFFFFF' }}>
            Contingency Countdown
          </h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between border-b pb-6" style={{ borderColor: 'var(--border-ui)' }}>
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Target Closing Date</label>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Anchor date for contingency calculations
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="date"
              value={dateString}
              onChange={(e) => onClosingDateChange(e.target.value)}
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

        <div className="space-y-4">
          {renderContingencyItem('Due Diligence (14 Days Before Closing)', ddDeadline, ddDays)}
          {renderContingencyItem('Financing (7 Days Before Closing)', finDeadline, finDays)}
        </div>
      </div>
    </div>
  );
}
