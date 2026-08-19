import React from 'react';
import { useRouter } from 'next/navigation';
import { Users, Briefcase } from 'lucide-react';

export interface VendorProfileProps {
  vendorId: string;
  name: string;
  category: string;
  teamMemberships?: Array<{ id: string; name: string }>;
}

export function VendorProfile({ vendorId: _vendorId, name, category, teamMemberships = [] }: VendorProfileProps) {
  const router = useRouter();

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{name}</h2>
          <p className="text-xs text-slate-400">{category}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" />
          Vendor
        </span>
      </div>

      {teamMemberships.length > 0 ? (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Also member of Investment Teams (Dual Role):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamMemberships.map((team) => (
              <span key={team.id} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {team.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Not part of an Investment Team yet</span>
          <button
            type="button"
            onClick={() => router.push('/dashboard/team')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Join an Investment Team
          </button>
        </div>
      )}
    </div>
  );
}

export default VendorProfile;
