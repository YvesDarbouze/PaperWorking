'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useProjectStore } from '@/store/projectStore';
import { usePropertyStore } from '@/store/propertyStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { TopAppBar } from '@/components/layout/TopAppBar';
import { CommandCenter } from '@/components/dashboard/command-center/CommandCenter';
import { NotificationProvider } from '@/context/NotificationContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DemoPage() {
  const setDeals = useProjectStore((s) => s.setDeals);
  const setLedgerItems = useProjectStore((s) => s.setLedgerItems);
  const setProperties = usePropertyStore((s) => s.setProperties);
  const setTransactions = usePropertyStore((s) => s.setTransactions);
  const setPropertyLoading = usePropertyStore((s) => s.setIsLoading);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDemoData() {
      try {
        setLoading(true);
        setError(null);
        setPropertyLoading(true);

        const docRef = doc(db, 'demo', 'default');
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          throw new Error('Demo data not found in Firestore. Make sure to run seed-demo script.');
        }

        const data = snap.data();
        
        // Hydrate Project Store
        if (data.projects) {
          setDeals(data.projects);
          // Auto select first project
          if (data.projects.length > 0) {
            useProjectStore.setState({ currentProject: data.projects[0] });
          }
        }

        // Hydrate Ledger Items
        if (data.ledgerItems) {
          Object.entries(data.ledgerItems).forEach(([projId, items]: [string, any]) => {
            // Convert strings back to Dates if necessary
            const formattedItems = items.map((item: any) => ({
              ...item,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
            }));
            setLedgerItems(projId, formattedItems);
          });
        }

        // Hydrate Property Store
        if (data.properties) {
          const formattedProps = data.properties.map((prop: any) => ({
            ...prop,
            purchaseDate: prop.purchaseDate ? new Date(prop.purchaseDate) : new Date(),
            createdAt: prop.createdAt ? new Date(prop.createdAt) : new Date(),
            updatedAt: prop.updatedAt ? new Date(prop.updatedAt) : new Date(),
          }));
          setProperties(formattedProps);
        }

        if (data.transactions) {
          const formattedTxs = data.transactions.map((tx: any) => ({
            ...tx,
            date: tx.date ? new Date(tx.date) : new Date(),
          }));
          setTransactions(formattedTxs);
        }

        toast.success('Loaded read-only demo dataset!', {
          icon: '✨',
          style: { background: '#111', color: '#fff', border: '1px solid #333' }
        });
      } catch (err: any) {
        console.error('Error fetching demo data:', err);
        setError(err.message || 'Failed to load demo data.');
      } finally {
        setLoading(false);
        setPropertyLoading(false);
      }
    }

    loadDemoData();

    return () => {
      useProjectStore.getState().clearStore();
      usePropertyStore.getState().clearStore();
    };
  }, [setDeals, setLedgerItems, setProperties, setTransactions, setPropertyLoading]);

  if (loading) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen text-on-surface"
        style={{
          background: 'linear-gradient(135deg, #091015 0%, #0f1922 40%, #091015 100%)',
        }}
      >
        <Loader2 className="w-10 h-10 animate-spin text-pw-primary mb-4" />
        <p className="text-sm text-pw-muted uppercase tracking-widest font-semibold animate-pulse">Initializing Demo Workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen text-on-surface p-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #091015 0%, #0f1922 40%, #091015 100%)',
        }}
      >
        <ShieldAlert className="w-12 h-12 text-error mb-4 animate-bounce" />
        <h1 className="text-xl font-bold mb-2">Failed to Load Demo Mode</h1>
        <p className="text-sm text-pw-muted mb-6 max-w-md">{error}</p>
        <Link href="/" className="px-5 py-2.5 bg-pw-glass-bg border border-pw-border rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <div 
        className="dashboard-context flex flex-col md:flex-row h-screen overflow-hidden text-on-surface"
        style={{
          background: 'linear-gradient(135deg, #091015 0%, #0f1922 40%, #091015 100%)',
        }}
      >
        {/* Sidebar (Desktop) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen relative overflow-hidden">
          {/* Top App Bar (Mobile & Desktop) */}
          <TopAppBar />

          {/* Persistent Glassmorphic Demo Banner */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-6 py-3 text-center text-xs font-semibold select-none z-10 shrink-0"
            style={{
              background: 'linear-gradient(90deg, rgba(45,212,191,0.08) 0%, rgba(45,212,191,0.04) 50%, rgba(45,212,191,0.08) 100%)',
              borderBottom: '1px solid rgba(45,212,191,0.15)',
              backdropFilter: 'blur(12px)',
              color: 'rgba(218, 228, 236, 0.95)',
            }}
          >
            <span className="flex items-center gap-1.5 text-pw-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-pw-primary" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pw-primary" />
              </span>
              Demo Mode Active
            </span>
            <span className="opacity-80">You are viewing a read-only example account.</span>
            <Link 
              href="/register" 
              className="inline-flex items-center gap-1 text-[#2dd4bf] hover:text-[#2dd4bf]/80 underline transition-all font-bold"
            >
              Sign up to start your own portfolio
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          {/* Scrollable Content Canvas */}
          <div className="flex-1 overflow-y-auto pb-24 md:pb-8 custom-scrollbar">
            <CommandCenter />
          </div>
        </div>

        {/* Bottom Nav (Mobile) */}
        <BottomNav />
      </div>
    </NotificationProvider>
  );
}
