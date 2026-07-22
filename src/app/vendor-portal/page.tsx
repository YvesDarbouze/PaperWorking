'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface VendorRequest {
  id: string;
  projectId: string;
  dealName: string;
  location: string;
  dealPhase: string;
  investor: string;
  status: 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED' | 'CANCELLED';
  type: string;
  message?: string;
  requestedAt: string;
  quotedFee?: number;
  sharedFolderId?: string;
  actionItems?: any[];
}

export default function VendorPortalDashboard() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [filter, setFilter] = useState<'All' | 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED'>('All');
  const [isDeclining, setIsDeclining] = useState<string | null>(null);
  
  // Modal state for submitting quote
  const [submittingRequest, setSubmittingRequest] = useState<VendorRequest | null>(null);
  const [quotedFee, setQuotedFee] = useState<string>('');
  const [quoteMessage, setQuoteMessage] = useState<string>('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    leadsReceived: 0,
    bidsSubmitted: 0,
    winRate: 0,
    pendingCount: 0,
    completedCount: 0,
  });

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/vendor-portal/requests', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (data.success) {
        const fetchedReqs = data.requests as VendorRequest[];
        setRequests(fetchedReqs);
        
        // Calculate stats
        const total = fetchedReqs.length;
        const submitted = fetchedReqs.filter(r => r.status === 'QUOTED' || r.status === 'ACCEPTED' || r.status === 'COMPLETED').length;
        const accepted = fetchedReqs.filter(r => r.status === 'ACCEPTED' || r.status === 'COMPLETED').length;
        const rate = submitted > 0 ? (accepted / submitted) * 100 : 0;
        const pendingCount = fetchedReqs.filter(r => r.status === 'PENDING').length;
        const completedCount = fetchedReqs.filter(r => r.status === 'COMPLETED').length;
        
        setStats({
          leadsReceived: total,
          bidsSubmitted: submitted,
          winRate: Number(rate.toFixed(1)),
          pendingCount,
          completedCount,
        });
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  // Handler for submitting quote
  const handleOpenBidModal = (req: VendorRequest) => {
    setSubmittingRequest(req);
    setQuotedFee(req.quotedFee ? String(req.quotedFee) : '');
    setQuoteMessage(req.message || '');
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !submittingRequest) return;
    
    const feeNum = Number(quotedFee);
    if (isNaN(feeNum) || feeNum <= 0) {
      toast.error('Please enter a valid proposed fee.');
      return;
    }

    try {
      setIsSubmittingQuote(true);
      const idToken = await user.getIdToken();
      const res = await fetch('/api/vendor-portal/requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          requestId: submittingRequest.id,
          projectId: submittingRequest.projectId,
          quotedFee: feeNum,
          message: quoteMessage,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Quote submitted successfully!');
        setSubmittingRequest(null);
        fetchRequests();
      } else {
        toast.error(data.error || 'Failed to submit quote.');
      }
    } catch (err) {
      console.error('Submit quote error:', err);
      toast.error('Failed to submit quote.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Handler for declining a request
  const handleDeclineRequest = async (req: VendorRequest) => {
    if (!user) return;
    try {
      setIsDeclining(req.id);
      const idToken = await user.getIdToken();
      const res = await fetch('/api/vendor-portal/requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          requestId: req.id,
          projectId: req.projectId,
          status: 'DECLINED',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Request declined.');
        fetchRequests();
      } else {
        toast.error(data.error || 'Failed to decline.');
      }
    } catch (err) {
      console.error('Decline error:', err);
      toast.error('Failed to decline request.');
    } finally {
      setIsDeclining(null);
    }
  };

  /** Format relative time from an ISO string */
  const formatTimeSince = (dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const hours = Math.floor(diffMs / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  // Handler for completing a task
  const handleCompleteTask = async (projectId: string, taskId: string) => {
    if (!user) return;
    try {
      const targetReq = requests.find(r => r.projectId === projectId);
      if (!targetReq) return;

      const updatedTodos = (targetReq.actionItems || []).map((t: any) => {
        if (t.id === taskId) {
          return { ...t, completed: true };
        }
        return t;
      });

      const idToken = await user.getIdToken();
      const res = await fetch('/api/projects/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          projectId,
          todos: updatedTodos,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update task');
      }

      toast.success('Task marked as completed!');
      await fetchRequests();
    } catch (err) {
      console.error('Failed to complete task:', err);
      toast.error('Failed to mark task as completed');
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(
    r => filter === 'All' || r.status === filter
  );

  // Extract accepted opportunities for sidebar
  const activeEngagements = requests.filter(r => r.status === 'ACCEPTED');

  // Extract unique tasks assigned to vendor's email across all projects
  const vendorEmail = profile?.email || user?.email || '';
  const assignedTasks: { id: string; projectId: string; dealName: string; label: string; description?: string }[] = [];
  
  requests.forEach(req => {
    if (req.actionItems) {
      req.actionItems.forEach((t: any) => {
        if (t.assignee === vendorEmail && !t.completed) {
          assignedTasks.push({
            id: t.id,
            projectId: req.projectId,
            dealName: req.dealName,
            label: t.label,
            description: t.description,
          });
        }
      });
    }
  });

  // Map project status to progress percentage
  const getPhaseProgress = (phase: string) => {
    switch (phase) {
      case 'Sourcing': return 10;
      case 'Under Contract': return 30;
      case 'Rehab': case 'Renovating': return 65;
      case 'Listed': return 80;
      case 'Sold': case 'Rented': return 100;
      default: return 50;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0a0b] text-[#9E9DA0] font-sans antialiased pb-24 relative overflow-hidden"
         style={{ backgroundImage: "radial-gradient(rgba(69, 73, 85, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
      {/* Top Header */}
      <header className="sticky top-0 w-full z-40 bg-[#0d0a0b]/80 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 md:px-12 h-16">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#454955] font-bold text-2xl select-none">terminal</span>
          <h1 className="text-xl font-bold tracking-tighter text-[#454955] uppercase">PaperWorking</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-[#9E9DA0] hover:text-[#454955] transition-colors select-none">
            notifications
          </button>
          <Link href="/vendor-portal/profile" title="Edit Profile" className="flex items-center gap-1 text-xs font-mono text-[#9E9DA0] hover:text-[#454955] transition-colors">
            <span className="material-symbols-outlined text-sm">manage_accounts</span>
            <span className="hidden sm:inline">EDIT PROFILE</span>
          </Link>
          <Link href="/vendor-portal/profile" title="Edit Profile" className="h-8 w-8 rounded-full border border-[#454955]/20 bg-[#1e1b20] overflow-hidden flex items-center justify-center font-bold text-xs text-[#454955] hover:border-[#454955] transition-all">
            {profile?.displayName?.slice(0, 2).toUpperCase() ?? 'VP'}
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-8">
        
        {/* Title / Status */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[#454955] text-xs font-semibold uppercase tracking-[0.2em]">Terminal // Vendor_Root</span>
            <h2 className="text-3xl md:text-4xl font-light text-white tracking-tight mt-1">
              Vendor Dashboard
            </h2>
          </div>
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#454955]/10 border border-[#454955]/20 text-[#454955] text-xs font-mono font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#454955] animate-pulse"></span>
              SYS_STATUS: ONLINE
            </span>
          </div>
        </div>

        {/* High-Density Metric Strip */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="glass-card p-6 rounded-xl relative overflow-hidden border-l-2 border-l-[#454955]/40">
            <p className="text-[#9E9DA0] text-xs font-semibold uppercase tracking-wider mb-2">Leads Received</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-bold text-white font-mono">{stats.leadsReceived}</h3>
              <span className="text-[#454955] text-xs font-semibold font-mono">TOTAL</span>
            </div>
            <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="bg-[#454955]/40 h-full w-[70%]"></div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-xl relative overflow-hidden border-l-2 border-l-[#454955]/40">
            <p className="text-[#9E9DA0] text-xs font-semibold uppercase tracking-wider mb-2">Bids Submitted</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-bold text-white font-mono">{stats.bidsSubmitted}</h3>
              <span className="text-[#454955] text-xs font-semibold font-mono">
                {stats.leadsReceived > 0 ? `${Math.round((stats.bidsSubmitted / stats.leadsReceived) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="bg-[#454955]/40 h-full w-[85%]"></div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-xl relative overflow-hidden border-l-2 border-l-[#454955]/40">
            <p className="text-[#9E9DA0] text-xs font-semibold uppercase tracking-wider mb-2">Win Rate</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-bold text-[#454955] font-mono">{stats.winRate}%</h3>
              <span className="text-[#454955]/60 text-xs font-semibold font-mono">CONVERTED</span>
            </div>
            <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="bg-[#454955] h-full" style={{ width: `${Math.min(100, stats.winRate || 10)}%` }}></div>
            </div>
          </div>

        </section>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Opportunities Column */}
          <section className="lg:col-span-8 space-y-6">
            
            {/* Header & Filter tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[#454955] text-xl select-none">inbox</span>
                New Leads Inbox
                {stats.pendingCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold font-mono animate-pulse">
                    {stats.pendingCount} NEW
                  </span>
                )}
              </h3>
              
              <div className="flex bg-[#161318] border border-white/10 p-0.5 rounded-lg text-xs overflow-x-auto">
                {(['All', 'PENDING', 'QUOTED', 'ACCEPTED', 'COMPLETED', 'DECLINED'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      filter === f ? 'bg-[#454955] text-[#0d0a0b]' : 'text-[#9E9DA0] hover:text-white'
                    }`}
                  >
                    {f === 'All' ? 'ALL' : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Leads list */}
            <div className="space-y-4">
              {loadingRequests ? (
                <div className="glass-card p-12 text-center text-sm text-[#9E9DA0] uppercase tracking-wider">
                  Loading Terminal Leads...
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="glass-card p-12 text-center text-sm text-[#9E9DA0] uppercase tracking-wider">
                  No requests found for filter: {filter}
                </div>
              ) : (
                filteredRequests.map(req => (
                  <div key={req.id} className="glass-card p-6 rounded-xl border border-white/10 transition-all hover:border-[#454955]/30 hover:bg-[#1e1b20]/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            req.status === 'ACCEPTED' ? 'bg-[#454955]/20 border-[#454955]/40 text-[#454955]' :
                            req.status === 'COMPLETED' ? 'bg-pw-success-container border-pw-success-border text-pw-success' :
                            req.status === 'QUOTED' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                            req.status === 'DECLINED' || req.status === 'CANCELLED' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                            {req.status}
                          </span>
                          <span className="text-xs text-[#9E9DA0] font-mono">{req.type || 'General Service'}</span>
                          {req.requestedAt && (
                            <span className="text-[10px] text-[#9E9DA0]/60 font-mono ml-auto">{formatTimeSince(req.requestedAt)}</span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-lg font-bold text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[#9E9DA0] text-lg select-none">location_on</span>
                            {req.location}
                          </h4>
                          <p className="text-xs text-[#9E9DA0] mt-1 font-mono uppercase tracking-wider">
                            Project: {req.dealName} · {req.investor}
                          </p>
                        </div>

                        {req.message && (
                          <p className="text-sm text-[#9E9DA0] bg-[#0d0a0b]/50 p-3 rounded-lg border border-white/5 italic">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3 sm:text-right">
                        <div>
                          <p className="text-[10px] text-[#9E9DA0] uppercase tracking-wider mb-1">Proposed Fee</p>
                          <p className="text-2xl font-bold text-white font-mono">
                            {req.quotedFee ? `$${req.quotedFee.toLocaleString()}` : '--'}
                          </p>
                        </div>

                        {req.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenBidModal(req)}
                              className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-[#454955] hover:bg-[#454955]/80 text-[#0d0a0b] font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(69, 73, 85,0.2)] active:scale-[0.98]"
                            >
                              Submit Bid
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req)}
                              disabled={isDeclining === req.id}
                              className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-[#9E9DA0] hover:text-red-400 font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                              {isDeclining === req.id ? '...' : 'Decline'}
                            </button>
                          </div>
                        )}
                        {req.status === 'QUOTED' && (
                          <button
                            onClick={() => handleOpenBidModal(req)}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest border border-white/10 transition-all active:scale-[0.98]"
                          >
                            Revise Quote
                          </button>
                        )}
                        {req.status === 'ACCEPTED' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#454955] font-bold uppercase tracking-wider py-1.5 px-3 border border-[#454955]/30 bg-[#454955]/5 rounded-lg">
                            <span className="material-symbols-outlined text-sm select-none">check_circle</span>
                            Bid Accepted
                          </span>
                        )}
                        {req.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-pw-success font-bold uppercase tracking-wider py-1.5 px-3 border border-pw-success-border bg-pw-success-container rounded-lg">
                            <span className="material-symbols-outlined text-sm select-none">verified</span>
                            Completed
                          </span>
                        )}
                        {(req.status === 'DECLINED' || req.status === 'CANCELLED') && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-red-400/70 font-bold uppercase tracking-wider py-1.5 px-3 border border-red-500/20 bg-red-500/5 rounded-lg">
                            {req.status === 'DECLINED' ? 'Declined' : 'Cancelled'}
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>

          </section>

          {/* Sidebar Column */}
          <aside className="lg:col-span-4 space-y-8">
            
            {/* Active Engagements */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[#454955] text-xl select-none">work</span>
                Active Engagements
              </h3>

              <div className="glass-card rounded-xl overflow-hidden divide-y divide-white/5 border border-white/10">
                {activeEngagements.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#9E9DA0] uppercase tracking-wider">
                    No active engagements
                  </div>
                ) : (
                  activeEngagements.map(eng => (
                    <div key={eng.id} className="p-4 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-semibold text-sm">{eng.dealName}</p>
                        <span className="text-xs text-[#454955] font-mono">{getPhaseProgress(eng.dealPhase)}%</span>
                      </div>
                      <p className="text-[11px] text-[#9E9DA0] mb-3">
                        {eng.type || 'Professional Service'} · {eng.dealPhase} Phase
                      </p>
                      
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#454955]/60 rounded-full transition-all duration-500"
                             style={{ width: `${getPhaseProgress(eng.dealPhase)}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Assigned Tasks */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[#454955] text-xl select-none">assignment</span>
                Assigned Tasks
              </h3>

              <div className="space-y-3">
                {assignedTasks.length === 0 ? (
                  <div className="glass-card p-6 text-center text-xs text-[#9E9DA0] uppercase tracking-wider">
                    No tasks assigned
                  </div>
                ) : (
                  assignedTasks.map(task => (
                    <div key={task.id} className="glass-card p-4 rounded-xl border border-white/10 relative overflow-hidden border-l-4 border-l-[#454955]/40 flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#454955] font-bold uppercase tracking-widest font-mono">Assigned Task</span>
                        <h5 className="text-white text-sm font-bold">{task.label}</h5>
                        <p className="text-xs text-[#9E9DA0]">Project: {task.dealName}</p>
                        {task.description && (
                          <p className="text-xs text-[#9E9DA0]/70 italic mt-1">{task.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleCompleteTask(task.projectId, task.id)}
                        className="p-1 text-[#9E9DA0] hover:text-[#454955] transition-colors material-symbols-outlined select-none"
                        title="Mark Completed"
                      >
                        check_box_outline_blank
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Partner Program Badge */}
            <div className="relative h-44 rounded-xl overflow-hidden group border border-white/10">
              <img className="w-full h-full object-cover grayscale opacity-30 transition-all duration-500 group-hover:grayscale-0 group-hover:opacity-40" 
                   src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop" 
                   alt="Partner Program Background" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a0b] via-[#0d0a0b]/50 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-5">
                <p className="text-[#454955] text-[10px] font-semibold uppercase tracking-[0.2em] mb-1">Partner Program</p>
                <h4 className="text-white text-lg font-bold tracking-tight">GOLD_TIER VENDOR</h4>
              </div>
            </div>

          </aside>

        </div>

      </main>

      {/* Floating Bottom Navigation Pill */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0d0a0b]/95 backdrop-blur-2xl border border-white/10 flex justify-around items-center h-16 w-[340px] px-2 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <button onClick={() => setFilter('PENDING')}
                className={`flex flex-col items-center justify-center flex-1 h-12 rounded-full transition-all ${
                  filter === 'PENDING' ? 'text-[#454955] bg-white/5' : 'text-[#9E9DA0] hover:text-white'
                }`}>
          <span className="material-symbols-outlined text-xl select-none">inbox</span>
          <span className="text-[9px] font-bold uppercase tracking-tight mt-0.5">Leads</span>
        </button>
        <button onClick={() => setFilter('ACCEPTED')}
                className={`flex flex-col items-center justify-center flex-1 h-12 rounded-full transition-all ${
                  filter === 'ACCEPTED' ? 'text-[#454955] bg-white/5' : 'text-[#9E9DA0] hover:text-white'
                }`}>
          <span className="material-symbols-outlined text-xl select-none">work</span>
          <span className="text-[9px] font-bold uppercase tracking-tight mt-0.5">Active</span>
        </button>
        <button onClick={() => setFilter('All')}
                className={`flex flex-col items-center justify-center flex-1 h-12 rounded-full transition-all ${
                  filter === 'All' ? 'text-[#454955] bg-white/5' : 'text-[#9E9DA0] hover:text-white'
                }`}>
          <span className="material-symbols-outlined text-xl select-none">dashboard</span>
          <span className="text-[9px] font-bold uppercase tracking-tight mt-0.5">All</span>
        </button>
      </nav>

      {/* Quote Submission Modal */}
      {submittingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0d0a0b]">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Propose Service Quote</h3>
                <p className="text-xs text-[#9E9DA0] mt-0.5">Project: {submittingRequest.dealName}</p>
              </div>
              <button 
                onClick={() => setSubmittingRequest(null)}
                className="material-symbols-outlined text-[#9E9DA0] hover:text-white select-none"
              >
                close
              </button>
            </div>

            <form onSubmit={handleSubmitQuote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Proposed Fee (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9E9DA0] font-mono text-sm">$</span>
                  <input
                    type="number"
                    value={quotedFee}
                    onChange={(e) => setQuotedFee(e.target.value)}
                    placeholder="e.g. 1500"
                    required
                    className="w-full pl-9 pr-4 py-3 bg-[#0d0a0b]/80 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#454955] transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Quote Details / Notes</label>
                <textarea
                  value={quoteMessage}
                  onChange={(e) => setQuoteMessage(e.target.value)}
                  placeholder="Describe your quote terms, estimated time to completion, and scope of work..."
                  rows={4}
                  className="w-full p-4 bg-[#0d0a0b]/80 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#454955] transition-all"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSubmittingRequest(null)}
                  className="flex-1 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="flex-1 py-3 rounded-lg bg-[#454955] hover:bg-[#454955]/85 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(69, 73, 85,0.2)]"
                >
                  {isSubmittingQuote ? 'Submitting...' : 'Submit Quote'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
