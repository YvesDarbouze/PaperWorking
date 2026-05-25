'use client';

import React from 'react';
import { useUserStore } from '@/store/userStore';
import type { OrgTeamMember } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   AccountTierSettings — Individual vs Team Toggle (Glass)
   ═══════════════════════════════════════════════════════ */

export default function AccountTierSettings() {
  const accountTier = useUserStore(s => s.accountTier);
  const setAccountTier = useUserStore(s => s.setAccountTier);
  const teamMembers = useUserStore(s => s.teamMembers);
  const addTeamMember = useUserStore(s => s.addTeamMember);
  const removeTeamMember = useUserStore(s => s.removeTeamMember);
  const maxSeats = useUserStore(s => s.maxSeats);

  const [showInvite, setShowInvite] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteName, setInviteName] = React.useState('');

  const activeMembers = teamMembers.filter(m => m.status !== 'removed');
  const seatsUsed = activeMembers.length;

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;

    const member: OrgTeamMember = {
      id: `org_${Date.now()}`,
      email: inviteEmail.trim(),
      displayName: inviteName.trim() || inviteEmail.split('@')[0],
      internalRole: 'Deal Lead',
      assignedProjectIds: [],
      invitedAt: new Date(),
      status: 'invited',
    };

    addTeamMember(member);
    toast.success(`Invited ${member.displayName} to your organization.`);
    setInviteEmail('');
    setInviteName('');
    setShowInvite(false);
  };

  return (
    <div className="glass-card rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden relative">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-[#57f1db] select-none">shield</span>
          Account Tier
        </h3>
        <p className="text-xs text-[#8a9b9b] mt-0.5">Controls team size and collaboration features.</p>
      </div>

      {/* Tier Toggle */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Individual */}
          <button
            onClick={() => setAccountTier('Individual')}
            className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
              accountTier === 'Individual'
                ? 'border-[#57f1db]/40 bg-[#57f1db]/10 text-white shadow-[0_0_15px_rgba(87,241,219,0.15)]'
                : 'border-white/10 hover:border-white/20 bg-black/20 text-[#8a9b9b]'
            }`}
          >
            {accountTier === 'Individual' && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-[#57f1db]/20 border border-[#57f1db]/40 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[12px] text-[#57f1db] font-bold select-none">check</span>
              </div>
            )}
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-3 text-[#57f1db]">
              <span className="material-symbols-outlined text-xl select-none">person</span>
            </div>
            <p className="text-sm font-semibold text-white">Individual</p>
            <p className="text-xs text-[#8a9b9b] mt-1.5 leading-relaxed">Single operator. You manage all projects solo.</p>
          </button>

          {/* Team */}
          <button
            onClick={() => setAccountTier('Team')}
            className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
              accountTier === 'Team'
                ? 'border-[#57f1db]/40 bg-[#57f1db]/10 text-white shadow-[0_0_15px_rgba(87,241,219,0.15)]'
                : 'border-white/10 hover:border-white/20 bg-black/20 text-[#8a9b9b]'
            }`}
          >
            {accountTier === 'Team' && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-[#57f1db]/20 border border-[#57f1db]/40 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[12px] text-[#57f1db] font-bold select-none">check</span>
              </div>
            )}
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-3 text-[#57f1db]">
              <span className="material-symbols-outlined text-xl select-none">group</span>
            </div>
            <p className="text-sm font-semibold text-white">Team</p>
            <p className="text-xs text-[#8a9b9b] mt-1.5 leading-relaxed">Up to 10 members. Delegate projects and assign roles.</p>
          </button>
        </div>

        {/* Team Members Grid (Team tier only) */}
        {accountTier === 'Team' && (
          <div className="space-y-4">
            {/* Seat Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#8a9b9b] uppercase tracking-widest">
                  Team Seats
                </span>
                <span className={`text-xs font-semibold ${seatsUsed >= maxSeats ? 'text-red-400' : 'text-[#57f1db]'}`}>
                  {seatsUsed} / {maxSeats}
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    seatsUsed >= maxSeats ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-[#57f1db] shadow-[0_0_10px_rgba(87,241,219,0.3)]'
                  }`}
                  style={{ width: `${(seatsUsed / maxSeats) * 100}%` }}
                />
              </div>
            </div>

            {/* Member List */}
            <div className="space-y-2">
              {activeMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-[#57f1db] flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(87,241,219,0.05)]">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{member.displayName}</p>
                      <p className="text-[10px] text-[#8a9b9b]">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      member.internalRole === 'Admin'
                        ? 'bg-[#adc6ff]/10 text-[#adc6ff] border-[#adc6ff]/20'
                        : 'bg-[#57f1db]/10 text-[#57f1db] border-[#57f1db]/20'
                    }`}>
                      {member.internalRole === 'Admin' && (
                        <span className="material-symbols-outlined text-[10px] select-none">workspace_premium</span>
                      )}
                      {member.internalRole}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      member.status === 'active' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : 'bg-white/5 text-[#8a9b9b] border-white/10'
                    }`}>
                      {member.status}
                    </span>
                    <button
                      onClick={() => removeTeamMember(member.id)}
                      className="p-1 text-[#8a9b9b] hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove member"
                    >
                      <span className="material-symbols-outlined text-sm select-none">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Invite Form */}
            {showInvite ? (
              <div className="p-4 bg-black/20 border border-white/10 rounded-xl space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8a9b9b] uppercase tracking-widest mb-1.5">Name</label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      placeholder="Jane Smith"
                      className="glass-input w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#57f1db]/50 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8a9b9b] uppercase tracking-widest mb-1.5">Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="glass-input w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#57f1db]/50 transition"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteName(''); }}
                    className="px-4 py-2 border border-white/10 text-[#8a9b9b] hover:text-white text-xs font-semibold rounded-lg hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim()}
                    className="luminous-button px-5 py-2 bg-[#57f1db]/20 border border-[#57f1db]/30 text-[#57f1db] text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#57f1db]/30 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Send Invite
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowInvite(true)}
                disabled={seatsUsed >= maxSeats}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/10 text-[#8a9b9b] hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:border-[#57f1db]/30 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-base select-none">person_add</span>
                Invite Team Member
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

