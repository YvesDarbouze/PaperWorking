import React from 'react';
import { User, Users, Briefcase } from 'lucide-react';
import type { AccountType } from '@/types/user';

interface AccountTypeSelectorProps {
  value: AccountType;
  onChange: (value: AccountType) => void;
}

export const tierOptions = [
  {
    value: 'investor' as const,
    label: 'Investor',
    description: 'Solo investor. Create projects, track deals, generate tax reports.',
    icon: User,
  },
  {
    value: 'investment_team' as const,
    label: 'Investment Team',
    description: 'Multi-user team. Assign tasks, invite collaborators, manage deals together.',
    icon: Users,
  },
  {
    value: 'vendor' as const,
    label: 'Vendor',
    description: 'Service provider. Receive tasks, list services, get paid.',
    icon: Briefcase,
  },
];

export function AccountTypeSelector({ value, onChange }: AccountTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {tierOptions.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              selected
                ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-lg'
                : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">{opt.label}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{opt.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export default AccountTypeSelector;
