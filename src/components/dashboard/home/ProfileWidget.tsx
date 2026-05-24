'use client';

import React from 'react';
import { User as UserIcon, Users, CheckCircle2, Trophy, RotateCw, Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface ProfileWidgetProps {
  user: any;
  profile: any;
  teamMembersCount: number;
  completedDeals: number;
  winsCount: number;
  onInviteTeam?: () => void;
}

export default function ProfileWidget({ 
  user, 
  profile, 
  teamMembersCount, 
  completedDeals, 
  winsCount,
  onInviteTeam 
}: ProfileWidgetProps) {
  
  const { isLead, role } = usePermissions();
  const displayRole = role || 'Team Member';
  const orgName = profile?.organizationName || 'Peachtree RE inc Team';

  return (
    <div className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center relative h-full">
      <div className="absolute top-6 right-6">
        <button className="text-on-surface-variant hover:text-on-surface transition-colors">
          <RotateCw className="w-5 h-5" />
        </button>
      </div>
      
      <div className="absolute top-6 left-6 text-left w-full px-6">
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Profile</h2>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full border border-white/20 overflow-hidden flex items-center justify-center bg-surface-variant">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-on-surface-variant" />
            )}
          </div>
          {/* Circular progress representation (simplified with border for wireframe parity) */}
          <svg className="absolute top-0 left-0 w-24 h-24 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="48" fill="none" stroke="#57f1db" strokeWidth="4" strokeDasharray="150 300" strokeLinecap="round" />
          </svg>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-surface">
            <span className="text-on-primary text-[10px] leading-none text-center">★</span>
          </div>
        </div>

        <h3 className="font-headline-md text-headline-md text-on-surface tracking-tight text-center mt-2">
          {profile?.displayName || 'Kristin Watson'}
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-1">{displayRole}</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60 mt-1 text-center">{orgName}</p>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8 w-full">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-label-md text-label-md text-on-surface">{teamMembersCount}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-secondary-container" />
          <span className="font-label-md text-label-md text-on-surface">{completedDeals}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
          <Trophy className="w-4 h-4 text-tertiary-container" />
          <span className="font-label-md text-label-md text-on-surface">{winsCount}</span>
        </div>
      </div>

      {isLead && onInviteTeam && (
        <button 
          onClick={onInviteTeam}
          className="mt-6 w-full py-2.5 bg-white/5 text-on-surface rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Invite Team Member
        </button>
      )}
    </div>
  );
}
