'use client';

import React, { useState } from 'react';
import { AccountType } from '@/lib/permissions';
import { UserPlus, Sparkles, Send, CheckCircle2, ShieldAlert, X, Search, Clock } from 'lucide-react';

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  todoContent: string;
  projectName: string;
  currentUserAccountType: AccountType;
  onAssignSuccess?: (assignee: { email: string; name: string; status: 'active' | 'pending' }) => void;
}

export default function TaskAssignmentModal({
  isOpen,
  onClose,
  todoContent,
  projectName,
  currentUserAccountType = 'standard',
  onAssignSuccess,
}: TaskAssignmentModalProps) {
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [selectedRole, setSelectedRole] = useState('Real Estate Attorney');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const isStandardUser = currentUserAccountType === 'standard';

  const handleInviteOrAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeEmail) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: assigneeEmail,
          name: assigneeName || assigneeEmail,
          role: 'team_member',
          professionalRole: selectedRole,
          projectName,
          customMessage: `Collaborate on "${todoContent}" in ${projectName}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      setStatusMessage({
        type: 'success',
        text: `Invite sent to ${assigneeEmail}! Task assigned with "Pending Acceptance" status.`,
      });

      if (onAssignSuccess) {
        onAssignSuccess({
          email: assigneeEmail,
          name: assigneeName || assigneeEmail,
          status: 'pending',
        });
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error assigning task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="task-assignment-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm text-white"
    >
      <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold">Assign Task to Team Member</h3>
          </div>
          <button
            onClick={onClose}
            data-testid="close-task-assign-modal-btn"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Details Summary */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
          <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Target Task</span>
          <p className="font-medium text-white">{todoContent}</p>
          <span className="text-emerald-400 text-[11px] block pt-1 font-mono">Project: {projectName}</span>
        </div>

        {/* STANDARD USER UPGRADE / INVITE PROMPT */}
        {isStandardUser ? (
          <div data-testid="standard-tier-upgrade-prompt" className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Team Task Assignment</span>
              </div>
              <p>
                To assign tasks directly to team members, upgrade to a <strong>Team</strong> account or invite collaborators to create their own Standard or Vendor account.
              </p>
            </div>

            {/* Clever Collaboration Prompt */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Collaborate Faster</span>
              </div>
              <p className="text-slate-200 font-medium">
                "Get this done faster. Invite team members to join PaperWorking and collaborate on {projectName}."
              </p>
            </div>

            <form onSubmit={handleInviteOrAssign} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Invite Collaborator Email</label>
                <input
                  type="email"
                  required
                  data-testid="collaborator-email-input"
                  value={assigneeEmail}
                  onChange={e => setAssigneeEmail(e.target.value)}
                  placeholder="colleague@firm.com"
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              {statusMessage && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    statusMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {statusMessage.text}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="send-collaborator-invite-btn"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Collaboration Invite</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* TEAM USER FULL ASSIGNMENT UI */
          <form data-testid="team-assignment-form" onSubmit={handleInviteOrAssign} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select or Search Team Member / Vendor</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    data-testid="team-assignee-email-input"
                    value={assigneeEmail}
                    onChange={e => setAssigneeEmail(e.target.value)}
                    placeholder="Enter team member or vendor email..."
                    className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 pl-9"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Assignee Professional Role</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
                >
                  <option value="Real Estate Attorney">Real Estate Attorney</option>
                  <option value="Loan Processor">Loan Processor</option>
                  <option value="General Contractor">General Contractor</option>
                  <option value="Property Manager">Property Manager</option>
                  <option value="Accountant/CPA">Accountant / CPA</option>
                  <option value="CEO/President">CEO / President</option>
                  <option value="Other">Other Custom Specialist</option>
                </select>
              </div>
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  statusMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                New users set to "Pending Acceptance"
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="assign-task-submit-btn"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Assign & Notify</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
