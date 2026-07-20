'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  DollarSign, 
  FileText 
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Project, EquityParty, Commitment } from '@/types/schema';

interface SyndicationCapTableProps {
  projectId: string;
  project: Project;
  parties: EquityParty[];
}

export default function SyndicationCapTable({
  projectId,
  project,
  parties
}: SyndicationCapTableProps) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loadingCommitments, setLoadingCommitments] = useState(true);

  // ── 1. Listen to commitments subcollection in real time ──
  useEffect(() => {
    if (!projectId) return;

    // Check for E2E testing mock
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      const key = `pw_e2e_commitments_${projectId}`;
      const load = () => {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            setCommitments(JSON.parse(val));
          } else {
            setCommitments([]);
          }
          setLoadingCommitments(false);
        } catch (e) {
          console.error(e);
        }
      };
      load();
      window.addEventListener('storage', (e) => {
        if (e.key === key) load();
      });
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'commitments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
        })) as Commitment[];
        setCommitments(docs);
        setLoadingCommitments(false);
      },
      (err) => {
        console.error('Failed to load commitments:', err);
        setLoadingCommitments(false);
      }
    );
    return unsub;
  }, [projectId]);

  // ── 2. Helper to fetch capital stack targets ──
  const capitalStack = project.financials?.capitalStack || [];
  
  // LP target is the 'Syndication Equity' source
  const lpTargetSource = capitalStack.find(s => s.category === 'Syndication Equity');
  const lpTargetAmount = lpTargetSource?.amount || 0;

  // GP target is the 'GP Co-investment' source
  const gpTargetSource = capitalStack.find(s => s.category === 'GP Co-investment');
  const gpTargetAmount = gpTargetSource?.amount || 0;

  // Total required equity
  const totalEquityRequired = lpTargetAmount + gpTargetAmount;

  // ── 3. Map roster parties to commitments from the ledger ──
  const capTableRows = parties.map(party => {
    // Match ledger commitments by email or name
    const matches = commitments.filter(c => 
      (party.email && c.email && c.email.toLowerCase() === party.email.toLowerCase()) ||
      c.name.toLowerCase() === party.name.toLowerCase()
    );

    if (party.role === 'GP') {
      return {
        id: party.id,
        name: party.name,
        email: party.email,
        role: 'GP' as const,
        commitmentAmount: gpTargetAmount,
        equityPct: party.ownershipPct,
        status: gpTargetSource?.status || 'Funded'
      };
    }

    // Sum committed amount in dollars
    const committedAmount = matches.reduce((sum, c) => sum + (c.amountCents / 100), 0);
    // Find latest commitment status or default to 'pledged'
    const status = matches.length > 0 ? matches[matches.length - 1].status : 'pledged';

    return {
      id: party.id,
      name: party.name,
      email: party.email,
      role: 'LP' as const,
      commitmentAmount: committedAmount,
      equityPct: party.ownershipPct,
      status
    };
  });

  // Calculate actual LP and GP totals
  const totalLpCommitted = capTableRows
    .filter(r => r.role === 'LP')
    .reduce((sum, r) => sum + r.commitmentAmount, 0);

  const totalActualGpCoInvest = gpTargetAmount;
  const totalActualEquity = totalLpCommitted + totalActualGpCoInvest;

  // Reconcile targets and gaps
  const lpGap = Math.max(0, lpTargetAmount - totalLpCommitted);
  const gpGap = Math.max(0, gpTargetAmount - totalActualGpCoInvest);
  const totalGap = Math.max(0, totalEquityRequired - totalActualEquity);

  // GP co-investment guidance percentage calculation
  const gpSharePct = totalEquityRequired > 0 ? (totalActualGpCoInvest / totalEquityRequired) * 105 : 0; // Wait, GP co-invest divided by total equity times 100
  // Fix formula: (gp / total) * 100
  const actualGpPct = totalEquityRequired > 0 ? (totalActualGpCoInvest / totalEquityRequired) * 100 : 0;
  const showGuidance = parties.some(p => p.role === 'GP');

  return (
    <div className="space-y-6">
      
      {/* Cap Table Table */}
      <div className="overflow-hidden border border-white/5 rounded-xl bg-white/[0.01]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/5 text-[10px] font-bold text-[#9E9DA0]/70 uppercase tracking-wider">
              <th className="px-6 py-3">Stakeholder</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3 text-right">Commitment</th>
              <th className="px-6 py-3 text-right">% Equity</th>
              <th className="px-6 py-3 text-center">Status (Ledger)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white">
            {loadingCommitments ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[#9E9DA0]/60">
                  <div className="flex items-center justify-center gap-2">
                    <Info className="w-4 h-4 animate-spin text-[#7A9EAA]" />
                    <span>Loading cap table data...</span>
                  </div>
                </td>
              </tr>
            ) : capTableRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[#9E9DA0]/50 font-light">
                  No partners defined. Define stakeholders in the Roster Manager tab first.
                </td>
              </tr>
            ) : (
              capTableRows.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-3">
                    <div className="font-semibold text-white">{row.name}</div>
                    <div className="text-[10px] text-[#9E9DA0]/70 font-mono">{row.email || 'No email provided'}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold uppercase tracking-wider ${
                      row.role === 'GP'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {row.role === 'GP' ? 'General Partner' : 'Limited Partner'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-white">
                    ${row.commitmentAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-semibold" style={{ color: '#7A9EAA' }}>
                    {row.equityPct.toFixed(2)}%
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold uppercase tracking-wider ${
                      row.status === 'cleared' || row.status === 'funds-confirmed' || row.status === 'Funded'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : row.status === 'signed'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : row.status === 'docs-out'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-white/5 text-[#9E9DA0]/70'
                    }`}>
                      {row.status.replace('-', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* GP Co-investment Guidance Chip */}
      {showGuidance && (
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-[#7A9EAA] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-white uppercase tracking-wider text-[10px] block">GP Co-investment Guidance</span>
            <p className="text-[#9E9DA0]/80">
              General Partners conventionally co-invest ~10% of the total equity stack to align interests. 
              Currently, GP co-investment represents <span className="font-bold text-white font-mono">{actualGpPct.toFixed(1)}%</span> of the equity target 
              (<span className="font-semibold text-white font-mono">${totalActualGpCoInvest.toLocaleString()}</span>).
            </p>
          </div>
        </div>
      )}

      {/* Capital Stack Reconciliation & Gap Indicator */}
      <div className="p-5 rounded-2xl border border-white/5 bg-[#7A9EAA]/5 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#7A9EAA]" />
            Equity Stack Reconciliation
          </h4>
          <p className="text-[10px] text-[#9E9DA0]/85 mt-1">
            Reconcile LP ledger commitments and GP co-investments against target capital stack requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          {/* Target Columns */}
          <div className="space-y-1 bg-white/[0.01] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-[#9E9DA0]/70 uppercase tracking-wider font-bold">LP Equity Target</span>
            <div className="text-sm font-bold text-white font-mono">${lpTargetAmount.toLocaleString()}</div>
            <div className="text-[9px] text-[#9E9DA0]/60">
              Committed: ${totalLpCommitted.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1 bg-white/[0.01] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-[#9E9DA0]/70 uppercase tracking-wider font-bold">GP Co-invest Target</span>
            <div className="text-sm font-bold text-white font-mono">${gpTargetAmount.toLocaleString()}</div>
            <div className="text-[9px] text-[#9E9DA0]/60">
              Funded: ${totalActualGpCoInvest.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1 bg-white/[0.01] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-[#9E9DA0]/70 uppercase tracking-wider font-bold">Total Required Equity</span>
            <div className="text-sm font-bold text-[#7A9EAA] font-mono">${totalEquityRequired.toLocaleString()}</div>
            <div className="text-[9px] text-[#9E9DA0]/60">
              Actual Stack: ${totalActualEquity.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Gap Indicator State */}
        <div className="border-t border-white/5 pt-3">
          {totalGap > 0 ? (
            <div className="flex items-center gap-2 text-amber-500 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-bold">⚠️ Funding Gap Detected: </span>
                There is an equity shortage of <span className="font-mono font-bold">${totalGap.toLocaleString()}</span> to meet the required capital target. 
                {lpGap > 0 && ` LP capital requires an additional $${lpGap.toLocaleString()}.`}
                {gpGap > 0 && ` GP co-investment requires an additional $${gpGap.toLocaleString()}.`}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/5 border border-emerald-400/10 rounded-xl p-3 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-bold">✓ Fully Reconciled: </span>
                The cap table matches or exceeds the required capital stack target of <span className="font-mono font-bold">${totalEquityRequired.toLocaleString()}</span>.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
