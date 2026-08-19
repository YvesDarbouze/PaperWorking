import React, { useState } from 'react';
import { User, Users, Briefcase } from 'lucide-react';
import type { UserTier } from '@/types/user';

interface RoleSelectionProps {
  onSelect?: (role: UserTier) => void;
  defaultRole?: UserTier;
}

export function RoleSelection({ onSelect, defaultRole = 'investor' }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<UserTier>(defaultRole);

  const handleSelect = (role: UserTier) => {
    setSelectedRole(role);
    if (onSelect) onSelect(role);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">How do you want to use PaperWorking?</h2>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSelect('investor')}
          className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
            selectedRole === 'investor' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
          }`}
        >
          <User className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-white">I&apos;m an Investor</h3>
            <p className="text-xs text-slate-400 mt-0.5">I want to find, fund, and manage real estate deals solo.</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('investment_team')}
          className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
            selectedRole === 'investment_team' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
          }`}
        >
          <Users className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-white">I&apos;m Part of an Investment Team</h3>
            <p className="text-xs text-slate-400 mt-0.5">I work with others to find, assign tasks, and manage real estate deals together.</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('vendor')}
          className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
            selectedRole === 'vendor' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
          }`}
        >
          <Briefcase className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-white">I&apos;m a Service Provider</h3>
            <p className="text-xs text-slate-400 mt-0.5">I offer services to real estate investors (attorney, contractor, property manager, etc.).</p>
          </div>
        </button>
      </div>

      <div className="text-xs text-slate-400">
        Already invited to a Deal? <a href="/login" className="text-emerald-400 hover:underline font-semibold">Sign in</a> or{' '}
        <a href="/register" className="text-emerald-400 hover:underline font-semibold">create an account</a> and join your Investment Team.
      </div>
    </div>
  );
}

export default RoleSelection;
