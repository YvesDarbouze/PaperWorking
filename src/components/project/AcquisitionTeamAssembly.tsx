'use client';

import React from 'react';
import { ProjectTeamMember, ProjectRole } from '@/types/schema';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

const contactSchema = z.object({
  displayName: z.string().min(1, 'Name is required'),
  firm: z.string().optional(),
  email: z.string().email('Valid email is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface AcquisitionTeamAssemblyProps {
  teamMembers: ProjectTeamMember[];
  onTeamMembersChange: (members: ProjectTeamMember[]) => void;
}

const REQUIRED_ROLES: ProjectRole[] = ['Real Estate Attorney', 'Title Company/Escrow Officer'];

export function AcquisitionTeamAssembly({ teamMembers, onTeamMembersChange }: AcquisitionTeamAssemblyProps) {

  const getMemberByRole = (role: ProjectRole) => teamMembers.find(m => m.projectRole === role);

  const handleSaveMember = (role: ProjectRole, data: ContactFormData) => {
    const existingIndex = teamMembers.findIndex(m => m.projectRole === role);
    const updatedMembers = [...teamMembers];

    const updatedMember: ProjectTeamMember = {
      ...(existingIndex >= 0 ? updatedMembers[existingIndex] : {
        id: crypto.randomUUID(),
        projectRole: role,
        permissions: { canView: true, canUpload: false, canComment: false },
        assignedAt: new Date(),
        status: 'active',
      }),
      displayName: data.displayName,
      firm: data.firm,
      email: data.email,
      phoneNumber: data.phoneNumber,
    };

    if (existingIndex >= 0) {
      updatedMembers[existingIndex] = updatedMember;
    } else {
      updatedMembers.push(updatedMember);
    }

    onTeamMembersChange(updatedMembers);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm" style={{ borderColor: 'var(--border-ui)' }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Acquisition Team Assembly</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Assign required team members to proceed with the transaction.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {REQUIRED_ROLES.map((role) => (
          <TeamMemberCard 
            key={role} 
            role={role} 
            member={getMemberByRole(role)} 
            onSave={(data) => handleSaveMember(role, data)} 
          />
        ))}
      </div>
    </div>
  );
}

function TeamMemberCard({ 
  role, 
  member, 
  onSave 
}: { 
  role: ProjectRole; 
  member?: ProjectTeamMember; 
  onSave: (data: ContactFormData) => void;
}) {
  const [isEditing, setIsEditing] = React.useState(!member);

  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      displayName: member?.displayName || '',
      firm: member?.firm || '',
      email: member?.email || '',
      phoneNumber: member?.phoneNumber || '',
    }
  });

  const onSubmit = (data: ContactFormData) => {
    onSave(data);
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-100 rounded-xl p-5 shadow-md bg-white transition-shadow hover:shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {role}
          {member && !isEditing ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          )}
        </h3>
        {member && !isEditing && (
          <button 
            type="button" 
            onClick={() => setIsEditing(true)}
            className="text-sm underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Full Name *</label>
              <input 
                {...register('displayName')}
                className="w-full px-3 py-2 border rounded-md text-sm"
                style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="Jane Doe"
              />
              {errors.displayName && <p className="text-xs text-red-500">{errors.displayName.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Firm / Company</label>
              <input 
                {...register('firm')}
                className="w-full px-3 py-2 border rounded-md text-sm"
                style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="ABC Law Firm"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Email Address *</label>
              <input 
                {...register('email')}
                className="w-full px-3 py-2 border rounded-md text-sm"
                style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="jane@example.com"
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Phone Number</label>
              <input 
                {...register('phoneNumber')}
                className="w-full px-3 py-2 border rounded-md text-sm"
                style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
                placeholder="(555) 123-4567"
              />
              {errors.phoneNumber && <p className="text-xs text-red-500">{errors.phoneNumber.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            {member && (
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
            )}
            <button 
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--text-primary)' }}
            >
              Save Contact
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-medium text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Name & Firm</p>
            <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{member?.displayName}</p>
            {member?.firm && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{member.firm}</p>}
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-medium text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Email</p>
              <div className="flex items-center gap-2">
                <p style={{ color: 'var(--text-primary)' }}>{member?.email}</p>
                <CopyButton textToCopy={member?.email || ''} />
              </div>
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Phone</p>
              <div className="flex items-center gap-2">
                <p style={{ color: 'var(--text-primary)' }}>{member?.phoneNumber || '—'}</p>
                {member?.phoneNumber && <CopyButton textToCopy={member.phoneNumber} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
      )}
    </button>
  );
}
