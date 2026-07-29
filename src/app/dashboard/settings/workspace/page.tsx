'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { getUserRoleTier } from '@/lib/auth/roleTiers';
import { useSettingsStore } from '@/store/settingsStore';
import { SettingsErrorBoundary } from '@/components/settings/ErrorBoundary';
import { FormSkeleton } from '@/components/settings/SettingsSkeletons';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Upload, X, Shield, Clock, Building } from 'lucide-react';

const IANA_TIMEZONES = typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone').map((tz) => ({ value: tz, label: tz }))
  : [
      { value: 'America/New_York', label: 'Eastern Time (ET) - America/New_York' },
      { value: 'America/Chicago', label: 'Central Time (CT) - America/Chicago' },
      { value: 'America/Denver', label: 'Mountain Time (MT) - America/Denver' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - America/Los_Angeles' },
      { value: 'America/Anchorage', label: 'Alaska Time (AKT) - America/Anchorage' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT) - Pacific/Honolulu' },
      { value: 'Europe/London', label: 'Greenwich Mean Time (GMT) - Europe/London' },
      { value: 'Europe/Paris', label: 'Central European Time (CET) - Europe/Paris' },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) - Asia/Tokyo' },
      { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT) - Asia/Singapore' },
      { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET) - Australia/Sydney' },
    ];

const workspaceSchema = z.object({
  name: z.string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(100, 'Workspace name must be 100 characters or less'),
  logo: z.string().optional(),
  timezone: z.string().min(1, 'Please select a timezone'),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

declare global {
  interface Window {
    __settingsFormDirty?: boolean;
  }
}

function WorkspaceSettingsForm() {
  const { profile } = useAuth();
  const userTier = getUserRoleTier(profile?.role);
  const { workspace, fetchWorkspace, updateWorkspace } = useSettingsStore();

  const [dragActive, setDragActive] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting }
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: '',
      logo: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    }
  });

  const companyNameValue = watch('name') || '';

  // Sync database values
  useEffect(() => {
    if (workspace.data) {
      reset({
        name: workspace.data.name || '',
        logo: workspace.data.logo || '',
        timezone: workspace.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
      });
      if (workspace.data.logo) {
        setLogoPreview(workspace.data.logo);
      }
    }
  }, [workspace.data, reset]);

  // Alert on navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Leave anyway?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Expose dirty state globally for link interception
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__settingsFormDirty = isDirty;
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.__settingsFormDirty = false;
      }
    };
  }, [isDirty]);

  // Intercept back button popstate navigation
  useEffect(() => {
    const handlePopState = () => {
      if (isDirty) {
        const confirmed = window.confirm("You have unsaved changes. Leave anyway?");
        if (!confirmed) {
          // Push state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        } else {
          if (typeof window !== 'undefined') {
            window.__settingsFormDirty = false;
          }
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty]);

  const processFile = (file: File) => {
    // Validate file formats: PNG, JPG, SVG
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error("Unsupported format. Please upload PNG, JPG, or SVG.");
      return;
    }
    // Validate file size: max 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File exceeds 2MB limit. Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64 = e.target.result as string;
        setLogoPreview(base64);
        setValue('logo', base64, { shouldDirty: true });
        toast.success('Logo uploaded and previewed.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setValue('logo', '', { shouldDirty: true });
    toast.success('Logo removed.');
  };

  const onSubmit = async (values: WorkspaceFormValues) => {
    try {
      await updateWorkspace(values);
      toast.success('Workspace settings updated successfully.');
      reset(values); // reset dirty state
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update workspace settings.';
      toast.error(message);
    }
  };

  if (workspace.loading && !workspace.data) {
    return (
      <div className="max-w-[720px] mx-auto space-y-8 animate-pulse">
        <FormSkeleton rows={3} />
        <FormSkeleton rows={2} />
      </div>
    );
  }

  if (workspace.error) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="p-6 text-center space-y-4 bg-red-50/50 border border-dashed border-red-200 rounded-xl">
            <p className="text-sm text-red-650 font-medium">Failed to load workspace settings.</p>
            <button
              onClick={() => fetchWorkspace()}
              className="h-9 px-4 rounded-lg bg-red-650 hover:bg-red-750 text-white text-xs font-semibold transition-all cursor-pointer border-0"
            >
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Gate Workspace Identity to Admin role
  if (userTier !== 'admin') {
    return (
      <div className="max-w-[720px] mx-auto flex items-center justify-center py-20 px-4">
        <div className="bg-white border border-slate-100 p-6 max-w-sm text-center space-y-4 rounded-xl shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#6B8E6B]/10 border border-[#6B8E6B]/20 flex items-center justify-center mx-auto text-[#557255]">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Admin Access Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You don't have permission to view this section. Contact your workspace admin.
          </p>
          <Link
            href="/dashboard/settings/profile"
            className="h-10 px-4 py-2 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold flex items-center justify-center gap-2 w-full transition-colors duration-200"
          >
            Back to Account Settings
          </Link>
        </div>
      </div>
    );
  }

  // Filter timezones based on query
  const filteredTimezones = IANA_TIMEZONES.filter((tz) =>
    tz.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Core fields card */}
        <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Company Name */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</label>
              <span className="text-[10px] text-slate-400 font-mono">{companyNameValue.length}/100</span>
            </div>
            <div className="relative">
              <input
                type="text"
                {...register('name')}
                maxLength={100}
                placeholder="e.g. Apex Capital Partners"
                className="w-full text-sm px-4 h-10 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#6B8E6B] focus:border-[#6B8E6B] focus:outline-none transition-all"
                required
              />
              <Building className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            {errors.name && (
              <p className="text-[11px] text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Logo Upload Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Workspace Logo</label>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              
              {/* Logo Preview box */}
              <div className="w-32 h-32 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center relative overflow-hidden group shrink-0 shadow-inner">
                {logoPreview ? (
                  <>
                    <img 
                      src={logoPreview} 
                      alt="Workspace Logo Preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer duration-200"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </>
                ) : (
                  <Building className="w-8 h-8 text-slate-350" />
                )}
              </div>

              {/* Drag/drop input area */}
              <div 
                className={`flex-1 h-32 rounded-xl border border-dashed flex flex-col items-center justify-center px-4 transition-colors relative w-full ${
                  dragActive 
                    ? 'border-[#6B8E6B] bg-[#6B8E6B]/5' 
                    : 'border-slate-200 hover:border-slate-350 bg-slate-50/50'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="logo-file-input"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleFileInput}
                />
                <Upload className="w-5 h-5 text-slate-400 mb-1 pointer-events-none" />
                <p className="text-xs text-slate-700 pointer-events-none">
                  Drag and drop your logo file, or <span className="text-[#6B8E6B] hover:underline font-semibold">browse</span>
                </p>
                <p className="text-[10px] text-slate-400 pointer-events-none mt-1">
                  Supports PNG, JPG, SVG. Max 2MB. Recommended 256x256px.
                </p>
              </div>

            </div>
          </div>

          {/* Time Zone Search and Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Global Time Zone</label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search IANA time zone (e.g. Chicago, Europe)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 h-8 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6B8E6B]"
              />
              
              <div className="relative">
                <select
                  {...register('timezone')}
                  className="w-full text-sm pl-4 pr-10 h-10 rounded-lg border border-slate-200 text-slate-905 bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-[#6B8E6B] focus:outline-none transition-all"
                >
                  {filteredTimezones.length === 0 ? (
                    <option value="" disabled>No matches found</option>
                  ) : (
                    filteredTimezones.map((tz) => (
                      <option key={tz.value} value={tz.value} className="bg-white text-slate-900">
                        {tz.label}
                      </option>
                    ))
                  )}
                </select>
                <Clock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {errors.timezone && (
              <p className="text-[11px] text-red-600 mt-1">{errors.timezone.message}</p>
            )}
          </div>

        </section>

        {/* Action buttons */}
        <div className="flex justify-end gap-4 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty || isSubmitting}
            className="h-10 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="h-10 px-4 py-2 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            Save Changes
          </button>
        </div>

      </form>
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  return (
    <SettingsErrorBoundary>
      <WorkspaceSettingsForm />
    </SettingsErrorBoundary>
  );
}
