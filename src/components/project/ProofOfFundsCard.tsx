'use client';

import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  Shield,
  FileCheck,
  Upload,
  RefreshCw,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Project, ProofOfFundsStatus } from '@/types/schema';
import { IS_DEMO_MODE } from '@/lib/config/demo';

interface ProofOfFundsCardProps {
  projectId: string;
  refresh?: () => void;
}

export default function ProofOfFundsCard({ projectId, refresh }: ProofOfFundsCardProps) {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingSourceId, setUploadingSourceId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [syncingPlaid, setSyncingPlaid] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // ── 1. Listen to Project Updates ──────────────────────────
  useEffect(() => {
    if (!projectId) return;
    const projectRef = doc(db, 'projects', projectId);
    const unsub = onSnapshot(
      projectRef,
      (snap) => {
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() } as Project);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to project:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#9E9DA0] text-xs gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading Proof of Funds status...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-red-500 text-xs">
        Project not found.
      </div>
    );
  }

  // Determine if the current user is the Lead Investor / Owner
  const isLead =
    project.ownerUid === user?.uid ||
    project.members?.[user?.uid || '']?.role === 'Lead Investor';

  // Get proofOfFunds list
  const proofOfFunds: ProofOfFundsStatus[] = project.proofOfFunds || [];

  // Fallback to determine if equity sources exist
  const capitalStack = project.financials?.capitalStack || [];
  const equitySources = capitalStack.filter((s: any) =>
    s.category === 'Borrower Injection' ||
    s.category === 'Co-buying Equity' ||
    s.category === 'Syndication Equity'
  );

  // Match current list or display default if empty
  const activeList: Partial<ProofOfFundsStatus>[] = proofOfFunds.length > 0 
    ? proofOfFunds 
    : equitySources.length > 0 
      ? equitySources.map(s => ({
          id: s.id,
          sourceName: s.category,
          amount: s.amount,
          status: 'requested',
          history: []
        }))
      : [{
          id: 'default_solo_equity',
          sourceName: 'Borrower Injection (Solo Cash)',
          amount: project.financials?.purchasePrice || 0,
          status: 'requested',
          history: []
        }];

  // ── 2. Actions Handlers ───────────────────────────────────
  const handleUpdateStatus = async (
    sourceId: string,
    action: 'request' | 'upload' | 'verify',
    docPayload?: { documentId: string; documentName: string; documentUrl: string }
  ) => {
    if (!user) {
      toast.error('You must be signed in.');
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/proof-of-funds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceId,
          action,
          ...docPayload,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update status');

      toast.success(
        action === 'verify'
          ? 'Proof of Funds verified!'
          : action === 'request'
          ? 'Verification reset/requested.'
          : 'Document uploaded successfully!'
      );
      if (refresh) refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, sourceId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSourceId(sourceId);
    setUploadProgress(0);

    const uploadId = crypto.randomUUID();
    const fileRef = ref(storage, `projects/${projectId}/documents/${uploadId}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload failed', error);
        toast.error(`Failed to upload ${file.name}`);
        setUploadingSourceId(null);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          await handleUpdateStatus(sourceId, 'upload', {
            documentId: uploadId,
            documentName: file.name,
            documentUrl: downloadUrl,
          });
        } catch (err: any) {
          console.error(err);
          toast.error('Failed to link document.');
        } finally {
          setUploadingSourceId(null);
        }
      }
    );
  };

  const handleSyncPlaid = async (sourceId: string) => {
    setSyncingPlaid(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`/api/projects/${projectId}/proof-of-funds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceId,
          action: 'plaid_sync',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Plaid context balance synced!');
      if (refresh) refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to sync Plaid balance');
    } finally {
      setSyncingPlaid(false);
    }
  };

  const handleConnectPlaid = async () => {
    setSyncingPlaid(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.link_token.startsWith('mock_link_token_')) {
        // Mock mode: perform direct mock sync
        await handleSyncPlaid(activeList[0]?.id || 'default_solo_equity');
      } else {
        setLinkToken(data.link_token);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to initiate Plaid link');
      setSyncingPlaid(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      try {
        const token = await user?.getIdToken();
        const exchangeRes = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ public_token: publicToken }),
        });

        const exchangeData = await exchangeRes.json();
        if (!exchangeData.success) throw new Error(exchangeData.error);

        // Now trigger sync to pull real balance
        await handleSyncPlaid(activeList[0]?.id || 'default_solo_equity');
        toast.success('Bank account linked successfully!');
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to link bank account');
      } finally {
        setLinkToken(null);
        setSyncingPlaid(false);
      }
    },
    onExit: () => {
      setLinkToken(null);
      setSyncingPlaid(false);
    },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val / 100);
  };

  return (
    <div className="space-y-6">
      {/* ── Info Banner ── */}
      <div className="bg-[#7A9EAA]/10 border border-[#7A9EAA]/25 rounded-xl p-3 text-xs text-white/90 space-y-1">
        <div className="flex items-center gap-2 font-bold text-[#7A9EAA]">
          <Shield className="w-4 h-4" />
          <span>Solvency Verification Protocol</span>
        </div>
        <p className="text-[10px] text-[#9E9DA0] leading-normal">
          In-scope equity sources must upload official Proof of Funds (PDF or statements) to the Project Files. 
          Only the designated Lead Investor can mark these files as verified to clear buyer solvency audits.
        </p>
      </div>

      {/* ── Equity Source Cards ── */}
      <div className="space-y-4">
        {activeList.map((item) => {
          const status = item.status || 'requested';
          const isVerified = status === 'verified';
          const isReceived = status === 'received';
          const hasDoc = !!item.documentUrl;

          return (
            <div
              key={item.id}
              className="bg-[#1C181E] border border-white/5 rounded-xl p-5 space-y-4 shadow-md"
            >
              {/* Header block */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#7A9EAA] uppercase tracking-wider">Equity Source</span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isVerified
                          ? 'bg-[var(--pw-success)]/10 text-[var(--pw-success)]'
                          : isReceived
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-tight">{item.sourceName}</h4>
                  <p className="text-[10px] text-[#9E9DA0]/70">
                    Required commitment basis: <span className="font-bold text-white">{fmtCurrency(item.amount || 0)}</span>
                  </p>
                </div>

                {/* Status Badges or Indicators */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {isVerified && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--pw-success)] font-medium bg-[var(--pw-success)]/5 px-2.5 py-1 rounded-lg border border-[var(--pw-success)]/20">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Verified by {item.verifiedByName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Area */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
                {/* Upload File Control */}
                {status !== 'verified' && (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e, item.id!)}
                      disabled={uploadingSourceId === item.id}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <button
                      disabled={uploadingSourceId === item.id}
                      className="bg-white/5 border border-white/10 hover:border-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {uploadingSourceId === item.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading ({uploadProgress}%)</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{hasDoc ? 'Re-upload PoF Document' : 'Upload Proof of Funds'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Lead Investor Verify / Reset Action */}
                {isLead && isReceived && (
                  <button
                    onClick={() => handleUpdateStatus(item.id!, 'verify')}
                    className="bg-[var(--pw-success)]/20 border border-[var(--pw-success)]/40 hover:bg-[var(--pw-success)]/30 text-[var(--pw-success)] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Verify Proof of Funds</span>
                  </button>
                )}

                {isLead && isVerified && (
                  <button
                    onClick={() => handleUpdateStatus(item.id!, 'request')}
                    className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Revoke Verification</span>
                  </button>
                )}

                {/* View Document Link */}
                {hasDoc && (
                  <a
                    href={item.documentUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#7A9EAA] hover:text-[#9bc2d0] text-xs font-semibold flex items-center gap-1 py-1.5 px-2 hover:bg-white/5 rounded-lg transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px]">{item.documentName}</span>
                  </a>
                )}
              </div>

              {/* Status History Timeline (Audit Logs) */}
              <div className="pt-2">
                <button
                  onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id!)}
                  className="flex items-center gap-1 text-[10px] text-[#9E9DA0]/60 hover:text-white transition-all font-bold uppercase tracking-wider"
                >
                  <span>Audit History Logs</span>
                  {expandedHistoryId === item.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {expandedHistoryId === item.id && (
                  <div className="mt-3 space-y-2 border-l border-white/5 pl-3 ml-1.5 animate-in fade-in duration-200">
                    {item.history && item.history.length > 0 ? (
                      item.history.map((log, index) => (
                        <div key={index} className="text-[10px] text-[#9E9DA0]/80 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                            <span className="font-bold text-white/90">Status changed to {log.status}</span>
                            <span className="text-[#9E9DA0]/50">•</span>
                            <span className="text-[#9E9DA0]/60">{new Date(log.updatedAt).toLocaleString()}</span>
                          </div>
                          <p className="pl-3 text-[#9E9DA0]/60">Updated by: {log.updatedByName}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-[#9E9DA0]/50 italic">No audit records found.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Plaid Context Balance Display (Visually Separate) ── */}
      {IS_DEMO_MODE && (
        <div className="bg-[#121014] border border-white/5 rounded-2xl p-6 space-y-4 relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Building className="w-24 h-24 text-white" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-white/40 tracking-wider bg-white/5 px-2 py-0.5 rounded-md uppercase">
                Plaid Bank Feed (Demo) (Context Reference Only)
              </span>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Business Account Liquidity Context (Demo)</span>
              </h4>
              <p className="text-[10px] text-[#9E9DA0]/60 max-w-md leading-normal">
                Continuous live balance check to display liquidity context. This dashboard element does NOT constitute official escrow verification.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              {activeList[0]?.plaidAccountName ? (
                <>
                  <button
                    onClick={() => handleSyncPlaid(activeList[0]?.id || 'default_solo_equity')}
                    disabled={syncingPlaid}
                    className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border border-white/5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingPlaid ? 'animate-spin' : ''}`} />
                    <span>Sync Balance</span>
                  </button>
                  <button
                    onClick={() => handleConnectPlaid()}
                    disabled={syncingPlaid}
                    className="bg-white/5 hover:bg-white/10 text-white/40 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border border-white/5 disabled:opacity-50"
                  >
                    <span>Reconnect Bank</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnectPlaid()}
                  disabled={syncingPlaid}
                  className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border border-white/5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingPlaid ? 'animate-spin' : ''}`} />
                  <span>Connect Plaid Feed</span>
                </button>
              )}
            </div>
          </div>

          {/* Balance metrics layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-4">
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#9E9DA0]/50 font-bold uppercase tracking-wider">Account Label</span>
              <p className="text-xs font-bold text-white">
                {activeList[0]?.plaidAccountName ||
                  (process.env.NEXT_PUBLIC_BANKING_PROVIDER === 'plaid'
                    ? 'No bank connected'
                    : 'Business Premier Savings (*8892)')}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-[#9E9DA0]/50 font-bold uppercase tracking-wider">Current Account Balance</span>
              <p className="text-lg font-black text-[#7A9EAA] tracking-tight tabular-nums">
                {fmtCurrency(
                  activeList[0]?.plaidBalance !== undefined && activeList[0]?.plaidBalance !== null
                    ? activeList[0].plaidBalance
                    : (process.env.NEXT_PUBLIC_BANKING_PROVIDER === 'plaid' ? 0 : 75000_00)
                )}
              </p>
              {activeList[0]?.plaidLastSync && (
                <p className="text-[9px] text-[#9E9DA0]/40 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Last checked: {new Date(activeList[0].plaidLastSync).toLocaleString()}</span>
                </p>
              )}
            </div>
          </div>

          {/* Strict Caution notice to user regarding Plaid balance */}
          <div className="bg-[#1C181E] border border-white/5 p-3 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#9E9DA0]/80 leading-normal">
              <strong className="text-white">Plaid Disclaimer (Demo):</strong> Balance checks only reflect liquid account balance history. In accordance with broker closing protocols, escrow clearance requires formal Proof of Funds uploads verified by the Lead Investor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
