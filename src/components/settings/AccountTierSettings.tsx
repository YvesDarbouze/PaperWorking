'use client';

import React from 'react';
import { useUserStore } from '@/store/userStore';
import { User, Users, Crown, Mail, X, Shield, Plus } from 'lucide-react';
import type { OrgTeamMember } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   AccountTierSettings — Individual vs Team Toggle

   • Individual: single-user badge, no seat management
   • Team: invite grid for up to 10 users, seat counter
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
      assignedDealIds: [],
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-600" />
          Account Tier
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">Controls team size and collaboration features.</p>
      </div>

      {/* Tier Toggle */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Individual */}
          <button
            onClick={() => setAccountTier('Individual')}
            className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              accountTier === 'Individual'
                ? 'border-gray-900 bg-gray-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            {accountTier === 'Individual' && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Individual</p>
            <p className="text-sm text-gray-500 mt-1">Single operator. You manage all projects solo.</p>
          </button>

          {/* Team */}
          <button
            onClick={() => setAccountTier('Team')}
            className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              accountTier === 'Team'
                ? 'border-gray-900 bg-gray-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            {accountTier === 'Team' && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Team</p>
            <p className="text-sm text-gray-500 mt-1">Up to 10 members. Delegate projects and assign roles.</p>
          </button>
        </div>

        {/* Team Members Grid (Team tier only) */}
        {accountTier === 'Team' && (
          <div className="space-y-3">
            {/* Seat Progress */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Team Seats
              </span>
              <span className={`text-xs font-semibold ${seatsUsed >= maxSeats ? 'text-red-600' : 'text-gray-700'}`}>
                {seatsUsed} / {maxSeats}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  seatsUsed >= maxSeats ? 'bg-red-500' : 'bg-gray-900'
                }`}
                style={{ width: `${(seatsUsed / maxSeats) * 100}%` }}
              />
            </div>

            {/* Member List */}
            {activeMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{member.displayName}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    member.internalRole === 'Admin'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {member.internalRole === 'Admin' && <Crown className="w-2.5 h-2.5" />}
                    {member.internalRole}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    member.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {member.status}
                  </span>
                  <button
                    onClick={() => removeTeamMember(member.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Invite Form */}
            {showInvite ? (
              <div className="flex gap-2 items-end pt-2 border-t border-gray-100">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition"
                  />
                </div>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Invite
                </button>
                <button onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteName(''); }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowInvite(true)}
                disabled={seatsUsed >= maxSeats}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:border-gray-300 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Invite Team Member
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
