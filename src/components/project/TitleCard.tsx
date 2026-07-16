'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle, Clock, Plus, Trash2, ShieldAlert, AlertCircle, Info, Landmark } from 'lucide-react';
import type { Project, TitleLienException } from '@/types/schema';
import toast from 'react-hot-toast';

interface TitleCardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

export function TitleCard({
  project,
  onSaveFinancials,
  phaseColor = '#595959',
  readOnly = false,
}: TitleCardProps) {
  const financials = (project.financials as any) || {};

  // Local Form states
  const [titleCompany, setTitleCompany] = useState(financials.titleCompany || '');
  const [commitmentDate, setCommitmentDate] = useState(financials.titleCommitmentDate || '');
  const [commitmentReceived, setCommitmentReceived] = useState(!!financials.titleCommitmentReceived);
  const [vestingConfirmed, setVestingConfirmed] = useState(!!financials.titleVestingConfirmed);
  const [liensLog, setLiensLog] = useState<TitleLienException[]>(financials.titleLiensLog || []);
  const [titleStatus, setTitleStatus] = useState<'clear' | 'curative' | 'defective'>(financials.titleStatus || 'clear');
  const [ownersPolicyOrdered, setOwnersPolicyOrdered] = useState(!!financials.titleOwnersPolicyOrdered);

  // File Upload states
  const [uploadingCommitment, setUploadingCommitment] = useState(false);

  // Sync state with project updates
  useEffect(() => {
    setTitleCompany(financials.titleCompany || '');
    setCommitmentDate(financials.titleCommitmentDate || '');
    setCommitmentReceived(!!financials.titleCommitmentReceived);
    setVestingConfirmed(!!financials.titleVestingConfirmed);
    setLiensLog(financials.titleLiensLog || []);
    setTitleStatus(financials.titleStatus || 'clear');
    setOwnersPolicyOrdered(!!financials.titleOwnersPolicyOrdered);
  }, [project]);

  const handleSaveField = async (fieldName: string, value: any) => {
    try {
      await onSaveFinancials({ [fieldName]: value });
    } catch (err) {
      console.error(`Failed to save ${fieldName}:`, err);
      toast.error('Failed to save changes');
    }
  };

  const addException = () => {
    if (readOnly) return;
    const newException: TitleLienException = {
      id: crypto.randomUUID(),
      description: '',
      status: 'Outstanding',
    };
    const updated = [...liensLog, newException];
    setLiensLog(updated);
    handleSaveField('titleLiensLog', updated);
  };

  const updateException = (id: string, field: keyof TitleLienException, value: any) => {
    if (readOnly) return;
    const updated = liensLog.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setLiensLog(updated);
    handleSaveField('titleLiensLog', updated);
  };

  const removeException = (id: string) => {
    if (readOnly) return;
    const updated = liensLog.filter(item => item.id !== id);
    setLiensLog(updated);
    handleSaveField('titleLiensLog', updated);
  };

  const triggerCommitmentUpload = () => {
    if (readOnly) return;
    setUploadingCommitment(true);
    setTimeout(async () => {
      setUploadingCommitment(false);
      await onSaveFinancials({
        titleCommitmentUrl: '/mock/documents/Title_Commitment_Report.pdf',
        titleCommitmentName: 'Title_Commitment_Report.pdf',
        titleCommitmentReceived: true,
      });
      toast.success('Title commitment document uploaded successfully');
    }, 800);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5" style={{ color: phaseColor }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Title Search &amp; Escrow Tracker</h3>
        </div>
        <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider">Title Review Phase</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title Company */}
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Title Company (Vendor)</label>
          <input
            type="text"
            id="title-company"
            value={titleCompany}
            onChange={(e) => setTitleCompany(e.target.value)}
            onBlur={() => handleSaveField('titleCompany', titleCompany)}
            disabled={readOnly}
            placeholder="Enter title company name"
            className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
          />
        </div>

        {/* Commitment Date */}
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Commitment Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#454955]" />
            <input
              type="date"
              id="title-commitment-date"
              value={commitmentDate}
              onChange={(e) => {
                setCommitmentDate(e.target.value);
                handleSaveField('titleCommitmentDate', e.target.value);
              }}
              disabled={readOnly}
              className="pl-10 pr-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Commitment Received */}
        <div
          onClick={() => {
            if (readOnly) return;
            const updated = !commitmentReceived;
            setCommitmentReceived(updated);
            handleSaveField('titleCommitmentReceived', updated);
          }}
          className={`p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer select-none ${
            commitmentReceived
              ? 'border-white/10 bg-[#454955]/10 text-white font-medium'
              : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10'
          }`}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wider">Commitment Received</span>
            <span className="text-[10px] text-[#9E9DA0]/80">Title commitment report received</span>
          </div>
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
            commitmentReceived ? 'bg-[#454955] border-[#454955]' : 'border-white/20'
          }`} id="title-commitment-received">
            {commitmentReceived && <CheckCircle className="w-4 h-4 text-white" />}
          </div>
        </div>

        {/* Vesting Confirmed */}
        <div
          onClick={() => {
            if (readOnly) return;
            const updated = !vestingConfirmed;
            setVestingConfirmed(updated);
            handleSaveField('titleVestingConfirmed', updated);
          }}
          className={`p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer select-none ${
            vestingConfirmed
              ? 'border-white/10 bg-[#454955]/10 text-white font-medium'
              : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10'
          }`}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wider">Vesting Confirmed</span>
            <span className="text-[10px] text-[#9E9DA0]/80">Confirm vesting matches entity</span>
          </div>
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
            vestingConfirmed ? 'bg-[#454955] border-[#454955]' : 'border-white/20'
          }`} id="title-vesting-confirmed">
            {vestingConfirmed && <CheckCircle className="w-4 h-4 text-white" />}
          </div>
        </div>

        {/* Owner's Policy Ordered */}
        <div
          onClick={() => {
            if (readOnly) return;
            const updated = !ownersPolicyOrdered;
            setOwnersPolicyOrdered(updated);
            handleSaveField('titleOwnersPolicyOrdered', updated);
          }}
          className={`p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer select-none ${
            ownersPolicyOrdered
              ? 'border-white/10 bg-[#454955]/10 text-white font-medium'
              : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10'
          }`}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wider">Owner's Policy Ordered</span>
            <span className="text-[10px] text-[#9E9DA0]/80">Confirm title insurance ordered</span>
          </div>
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
            ownersPolicyOrdered ? 'bg-[#454955] border-[#454955]' : 'border-white/20'
          }`} id="title-owners-policy">
            {ownersPolicyOrdered && <CheckCircle className="w-4 h-4 text-white" />}
          </div>
        </div>
      </div>

      {/* Liens & Exceptions Log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Liens &amp; Exceptions Log</h4>
          {!readOnly && (
            <button
              onClick={addException}
              className="text-[10px] font-bold uppercase tracking-wider text-[#454955] hover:text-[#454955]/80 flex items-center gap-1"
              id="add-exception-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Add Exception
            </button>
          )}
        </div>

        {liensLog.length === 0 ? (
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center text-xs text-[#9E9DA0]/60">
            No exceptions or liens logged on title search.
          </div>
        ) : (
          <div className="space-y-3">
            {liensLog.map((item) => (
              <div key={item.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Description */}
                  <div className="md:col-span-7">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9E9DA0] mb-1 font-bold">Exception Description</label>
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateException(item.id, 'description', e.target.value)}
                      disabled={readOnly}
                      placeholder="e.g. outstanding utility lien of $250"
                      className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955]"
                    />
                  </div>

                  {/* Status */}
                  <div className="md:col-span-4">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9E9DA0] mb-1 font-bold">Status</label>
                    <select
                      value={item.status}
                      onChange={(e) => updateException(item.id, 'status', e.target.value)}
                      disabled={readOnly}
                      className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955]"
                    >
                      <option value="Outstanding" className="bg-pw-night-bg text-amber-500">Outstanding</option>
                      <option value="Resolved" className="bg-pw-night-bg text-green-400">Resolved</option>
                      <option value="Escrow Hold" className="bg-pw-night-bg text-blue-400">Escrow Hold</option>
                    </select>
                  </div>

                  {/* Delete Button */}
                  <div className="md:col-span-1 flex justify-end">
                    {!readOnly && (
                      <button
                        onClick={() => removeException(item.id)}
                        className="p-1.5 text-[#F06543] hover:bg-[#F06543]/10 rounded-lg transition-all mt-4 md:mt-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Title Status Dropdown */}
      <div>
        <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Title Status</label>
        <select
          id="title-status"
          value={titleStatus}
          onChange={(e) => {
            setTitleStatus(e.target.value as any);
            handleSaveField('titleStatus', e.target.value);
          }}
          disabled={readOnly}
          className={`px-4 py-2.5 w-full border rounded-lg text-xs uppercase font-bold tracking-wider focus:outline-none transition-all ${
            titleStatus === 'clear'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : titleStatus === 'curative'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          <option value="clear" className="bg-pw-night-bg text-green-400">Clear</option>
          <option value="curative" className="bg-pw-night-bg text-amber-400">Curative</option>
          <option value="defective" className="bg-pw-night-bg text-red-400">Defective</option>
        </select>
      </div>

      {/* Title Commitment Document Upload */}
      <div className="space-y-2 border-t border-white/5 pt-4">
        <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">Title Commitment Document</label>
        {financials.titleCommitmentUrl ? (
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#454955]" />
              <span className="text-xs text-white font-bold">{financials.titleCommitmentName || 'Title_Commitment_Report.pdf'}</span>
            </div>
            {!readOnly && (
              <button
                onClick={async () => {
                  await onSaveFinancials({ titleCommitmentUrl: null, titleCommitmentName: null });
                  toast.success('Title commitment removed');
                }}
                className="text-xs text-[#F06543] hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={triggerCommitmentUpload}
            disabled={readOnly || uploadingCommitment}
            className="w-full p-4 border border-dashed border-white/10 hover:border-white/20 rounded-xl flex items-center justify-center gap-2 text-xs text-[#9E9DA0] hover:text-white transition-all bg-white/5"
          >
            {uploadingCommitment ? (
              <span>Uploading...</span>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Upload Title Commitment PDF
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
