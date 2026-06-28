'use client';

import React from 'react';
import { User as UserIcon, Users, CheckCircle2, RotateCw, Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface ProfileWidgetProps {
  user: any;
  profile: any;
  teamMembersCount: number;
  completedDeals: number;
  onInviteTeam?: () => void;
}

export default function ProfileWidget({
  user,
  profile,
  teamMembersCount,
  completedDeals,
  onInviteTeam
}: ProfileWidgetProps) {
  
  const { isLead, role } = usePermissions();
  const displayRole = role || 'Team Member';
  const orgName = profile?.organizationName || 'Peachtree RE inc Team';

  return (
    <div className="bg-[#FFFFFF] border border-[#A5A5A5] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center relative h-full">
      <div className="absolute top-6 right-6">
        <button className="text-[#7F7F7F] hover:text-[#1A1A1A] transition-colors">
          <RotateCw className="w-5 h-5" />
        </button>
      </div>
      
      <div className="absolute top-6 left-6 text-left w-full px-6">
        <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight">Profile</h2>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full border-4 border-[#CCCCCC] overflow-hidden flex items-center justify-center bg-[#F2F2F2]">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-[#A5A5A5]" />
            )}
          </div>
          {/* Circular progress representation (simplified with border for wireframe parity) */}
          <svg className="absolute top-0 left-0 w-24 h-24 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="48" fill="none" stroke="#595959" strokeWidth="4" strokeDasharray="150 300" strokeLinecap="round" />
          </svg>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#1A1A1A] rounded-full flex items-center justify-center border-2 border-[#FFFFFF]">
            <span className="text-[#FFFFFF] text-[10px] leading-none text-center">★</span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight text-center">
          {profile?.displayName || 'Kristin Watson'}
        </h3>
        <p className="text-sm text-[#7F7F7F] font-medium text-center">{displayRole}</p>
        <p className="text-xs text-[#A5A5A5] mt-1 text-center">{orgName}</p>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8 w-full">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F2] rounded-full border border-[#CCCCCC]" title="Team members">
          <Users className="w-3.5 h-3.5 text-[#595959]" />
          <span className="text-xs font-bold text-[#1A1A1A]">{teamMembersCount}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F2] rounded-full border border-[#CCCCCC]" title="Deals closed">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#595959]" />
          <span className="text-xs font-bold text-[#1A1A1A]">{completedDeals}</span>
        </div>
      </div>

      {isLead && onInviteTeam && (
        <button 
          onClick={onInviteTeam}
          className="mt-6 w-full py-2.5 border border-[#1A1A1A] text-[#1A1A1A] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#F2F2F2] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Invite Team Member
        </button>
      )}
    </div>
  );
}
