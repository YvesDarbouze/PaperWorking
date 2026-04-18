'use client';

import React from 'react';
import { Eye, Upload, Lock, Unlock } from 'lucide-react';
import type { ExternalAccessPermission } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   AccessGateToggle — Per-Stakeholder Permission Control

   Renders toggle switches for:
   • Can View Deal  — Read access to deal details
   • Can Upload     — Write access to upload documents
   Visual lock/unlock icon with immediate state callback
   ═══════════════════════════════════════════════════════ */

interface Props {
  permissions: ExternalAccessPermission;
  onChange: (updated: ExternalAccessPermission) => void;
  compact?: boolean;
}

export default function AccessGateToggle({ permissions, onChange, compact }: Props) {
  const gates = [
    {
      key: 'canView' as const,
      label: 'View',
      icon: <Eye className="w-3 h-3" />,
      desc: 'Can view deal details',
    },
    {
      key: 'canUpload' as const,
      label: 'Upload',
      icon: <Upload className="w-3 h-3" />,
      desc: 'Can upload documents',
    },
  ];

  return (
    <div className={`flex ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {gates.map(({ key, label, icon }) => {
        const enabled = permissions[key];
        return (
          <button
            key={key}
            onClick={() => onChange({ ...permissions, [key]: !enabled })}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
              enabled
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
            }`}
            title={`${enabled ? 'Revoke' : 'Grant'} ${label} access`}
          >
            {enabled ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
            {icon}
            {!compact && label}
          </button>
        );
      })}
    </div>
  );
}
