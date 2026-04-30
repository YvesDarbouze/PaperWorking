'use client';

import React, { useEffect, useState } from 'react';
import KPICard from '@/components/dashboard/KPICard';
import { DollarSign, TrendingUp, FolderOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

/* ═══════════════════════════════════════════════════════════════
   KPIGrid — Top-of-Dashboard Metric Strip

   Renders 3 core portfolio KPIs in a responsive CSS grid.
   Wires to the user's Organization document to display live
   portfolio aggregates.
   ═══════════════════════════════════════════════════════════════ */

export default function KPIGrid() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState({
    totalNetProfit: '—',
    averagePortfolioROI: '—',
    totalProjectsClosed: '0'
  });

  useEffect(() => {
    if (!profile?.organizationId || profile.organizationId === 'org_placeholder') {
      return;
    }

    const orgRef = doc(db, 'organizations', profile.organizationId);
    
    const unsubscribe = onSnapshot(orgRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        
        const netProfit = data.totalNetRealizedProfit || 0;
        const avgROI = data.averagePortfolioROI || 0;
        const closedCount = data.totalProjectsClosed || 0;
        
        setMetrics({
          totalNetProfit: `$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          averagePortfolioROI: `${avgROI.toFixed(1)}%`,
          totalProjectsClosed: closedCount.toString()
        });
      }
    });

    return () => unsubscribe();
  }, [profile?.organizationId]);

  return (
    <section
      aria-label="Portfolio performance metrics"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
    >
      <KPICard
        title="Total Net Realized Profit"
        value={metrics.totalNetProfit}
        trend="—"
        icon={<DollarSign className="w-4 h-4" />}
      />
      <KPICard
        title="Average Portfolio ROI"
        value={metrics.averagePortfolioROI}
        trend="—"
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <KPICard
        title="Closed Deal Count"
        value={metrics.totalProjectsClosed}
        trend="—"
        icon={<FolderOpen className="w-4 h-4" />}
      />
    </section>
  );
}
