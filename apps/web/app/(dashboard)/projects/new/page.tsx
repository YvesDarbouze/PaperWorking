'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AddressSearch from '@/components/deals/AddressSearch';
import type { CollisionDeal } from '@/components/deals/CollisionModal';
import { createProjectFromBff, patchProjectFromBff } from '@/lib/projects/project-api';
import { createDealFromBff } from '@/lib/deals/deal-api';
import { loadTeamDirectory, mockProvider, useMockData } from '@/lib/data';
import type { ProjectWorkspace } from '@/lib/projects/types';

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step state driven by URL query parameter ?step=1|2|3 with local reactive state
  const stepParam = searchParams.get('step');
  const [stepState, setStepState] = useState<number>(() => {
    return stepParam === '2' ? 2 : stepParam === '3' ? 3 : 1;
  });

  useEffect(() => {
    if (stepParam === '2') setStepState(2);
    else if (stepParam === '3') setStepState(3);
    else if (stepParam === '1' || !stepParam) setStepState(1);
  }, [stepParam]);

  const currentStep = stepState;

  // Form State
  const [projectId] = useState(() => `proj-${Date.now().toString().slice(-6)}`);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string; role: string }>>(
    [],
  );
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [dealId, setDealId] = useState<string | null>(null);
  const [dealSlug, setDealSlug] = useState<string | null>(null);
  const [dealAddress, setDealAddress] = useState<string | null>(null);
  const [dealName, setDealName] = useState<string | null>(null);
  const [draftDealCreated, setDraftDealCreated] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAssignees() {
      if (useMockData()) {
        const options = mockProvider.projectAssigneeOptions();
        if (cancelled) return;
        setAssignees(options);
        setSelectedTeam(options.slice(0, 2).map((m) => m.name));
        return;
      }
      try {
        const data = await loadTeamDirectory();
        if (cancelled) return;
        const options = (data.members as Array<{ id: string; name: string; role: string }>).map(
          (m) => ({ id: m.id, name: m.name, role: m.role }),
        );
        setAssignees(options);
        setSelectedTeam(options.slice(0, 2).map((m) => m.name));
      } catch {
        if (!cancelled) setAssignees([]);
      }
    }
    loadAssignees();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync step query changes
  function setStep(stepNumber: number) {
    setStepState(stepNumber);
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', String(stepNumber));
    router.push(`/projects/new?${params.toString()}`);
  }

  function handleNextToProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) {
      setValidationError('Project Name is required.');
      return;
    }
    setValidationError(null);
    setStep(2);
  }

  function handleToggleTeam(memberName: string) {
    setSelectedTeam((prev) =>
      prev.includes(memberName)
        ? prev.filter((name) => name !== memberName)
        : [...prev, memberName],
    );
  }

  // Step 2: Handle Linking Existing Deal
  function handleLinkExistingDeal(deal: CollisionDeal) {
    setDealId(deal.id);
    setDealSlug(deal.slug);
    setDealAddress(deal.address);
    setDealName(deal.name || deal.propertyName || deal.address);
    setStep(3);
  }

  // Step 2: Handle Create New Deal for This Project (Collision alternative)
  async function handleCreateNewDealAnyway(deal: CollisionDeal) {
    const slug = deal.slug || deal.address.toLowerCase().replace(/[^a-z0-9]/g, '');
    const payload = {
      slug,
      address: deal.address,
      status: 'draft' as const,
      visibility: 'private' as const,
      purchasePrice: deal.purchasePrice || deal.price || 485000,
      rehabCost: 50000,
      arv: 620000,
      holdingCosts: 15000,
      projectedRoi: 15.5,
    };

    if (useMockData()) {
      const newDealId = `deal-draft-${Date.now().toString().slice(-6)}`;
      mockProvider.addDeal({
        ...payload,
        id: newDealId,
        projectId,
        creatorId: 'dev-user-1',
        createdAt: new Date().toISOString(),
      });
      setDealId(newDealId);
    } else {
      try {
        const created = await createDealFromBff(payload);
        setDealId(created.id);
      } catch {
        return;
      }
    }

    setDealSlug(slug);
    setDealAddress(deal.address);

    router.push(`/deals/${slug}?fromProject=${projectId}`);
  }

  // Step 2: Handle No Deal Exists (New Address Search)
  async function handleNoDealFound(address: string, slug: string) {
    const payload = {
      slug,
      address,
      status: 'draft' as const,
      visibility: 'private' as const,
      purchasePrice: 450000,
      rehabCost: 50000,
      arv: 580000,
      holdingCosts: 15000,
      projectedRoi: 16.0,
    };

    if (useMockData()) {
      const newDealId = `deal-draft-${Date.now().toString().slice(-6)}`;
      mockProvider.addDeal({
        ...payload,
        id: newDealId,
        projectId,
        creatorId: 'dev-user-1',
        createdAt: new Date().toISOString(),
      });
      setDealId(newDealId);
    } else {
      try {
        const created = await createDealFromBff(payload);
        setDealId(created.id);
      } catch {
        return;
      }
    }

    setDealSlug(slug);
    setDealAddress(address);
    setDraftDealCreated(true);
  }

  // Step 3: Launch Project
  async function handleLaunchProject() {
    setIsLaunching(true);

    try {
      const projectPayload = {
        id: projectId,
        project_id: projectId,
        propertyName: projectName || 'New Project',
        address: dealAddress || '1247 Elm Street, Austin, TX 78702',
        property_address: dealAddress || '1247 Elm Street, Austin, TX 78702',
        dealId: dealId || 'deal-mp-1',
        dealSlug: dealSlug || '1247elmst',
        dealAddress: dealAddress || '1247 Elm Street, Austin, TX 78702',
        status: 'Active',
        currentPhase: 'acquisition' as const,
        phase: 'acquisition' as const,
      };

      if (useMockData()) {
        mockProvider.addProject(projectPayload as ProjectWorkspace);
      } else {
        const created = await createProjectFromBff({
          propertyName: projectName || 'New Project',
          address: dealAddress || undefined,
        });
        if (!created?.id) {
          throw new Error('Project created without server id');
        }
        if (dealId) {
          await patchProjectFromBff(created.id, { dealId });
        }
      }

      setTimeout(() => {
        router.push('/projects?created=1');
      }, 600);
    } catch {
      setIsLaunching(false);
      setValidationError('Unable to create project. Please try again.');
    }
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 md:px-8">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Dashboard
        </Link>
      </div>

      {/* Step Indicator — 3 Glass Pills */}
      <div className="mb-8 flex items-center justify-between gap-2 sm:gap-4">
        {[
          { number: 1, label: '1 Basics' },
          { number: 2, label: '2 Property' },
          { number: 3, label: '3 Confirm' },
        ].map(({ number, label }) => {
          const isActive = currentStep === number;
          const isCompleted = currentStep > number;

          return (
            <button
              key={number}
              type="button"
              onClick={() => {
                if (number === 1 || (number === 2 && projectName.trim()) || (number === 3 && dealAddress)) {
                  setStep(number);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-semibold transition-all ${
                isActive
                  ? 'border-[#00DD94]/60 bg-[#00DD94]/15 text-[#00DD94] shadow-[0_0_16px_rgba(0,221,148,0.2)]'
                  : isCompleted
                    ? 'border-white/20 bg-white/[0.06] text-white/90'
                    : 'border-white/8 bg-white/[0.02] text-white/40'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-[#00DD94] text-[#0a0a0f]'
                    : isCompleted
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-white/40'
                }`}
              >
                {isCompleted ? '✓' : number}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Glass Form Card */}
      <div className="rounded-2xl border border-white/10 bg-[#121014]/90 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        {/* Step 1: Project Basics */}
        {currentStep === 1 && (
          <div>
            <div className="mb-6 border-b border-white/8 pb-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#00DD94]">
                STEP 1 OF 3
              </span>
              <h1 className="mt-1 text-2xl font-bold text-white">Project Basics</h1>
              <p className="mt-1 text-xs text-white/60">
                Define the workspace identity, description, and assign initial team members.
              </p>
            </div>

            {validationError && (
              <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                {validationError}
              </div>
            )}

            <form onSubmit={handleNextToProperty} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-white/80">
                  Project Name <span className="text-[#00DD94]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Elm Street Flip & Expansion"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00DD94] focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Single-family residential acquisition with light value-add rehab and hold plan."
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00DD94] focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-2">
                  Assigned Team Members
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {assignees.map((member) => {
                    const isSelected = selectedTeam.includes(member.name);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleToggleTeam(member.name)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-[#00DD94]/40 bg-[#00DD94]/10 text-white'
                            : 'border-white/8 bg-white/[0.02] text-white/60 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold">{member.name}</p>
                          <p className="text-[10px] text-white/40">{member.role}</p>
                        </div>
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            isSelected ? 'text-[#00DD94]' : 'text-white/20'
                          }`}
                        >
                          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-white/8">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00DD94] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#0a0a0f] hover:brightness-110 transition shadow-[0_4px_16px_rgba(0,221,148,0.25)]"
                >
                  Next: Identify property
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Identify Property */}
        {currentStep === 2 && (
          <div>
            <div className="mb-6 border-b border-white/8 pb-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#00DD94]">
                STEP 2 OF 3
              </span>
              <h1 className="mt-1 text-2xl font-bold text-white">
                Link this project to a property deal.
              </h1>
              <p className="mt-1 text-xs text-white/60">
                Search any address to discover existing deals or initialize a new draft deal for{' '}
                <strong className="text-white">{projectName || 'your project'}</strong>.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-2">
                  Property Address Search
                </label>
                <AddressSearch
                  placeholder="Search any street address or deal name…"
                  collisionVariant="project-link"
                  onLinkDeal={handleLinkExistingDeal}
                  onCreateNewDeal={handleCreateNewDealAnyway}
                  onNoDealFound={handleNoDealFound}
                />
              </div>

              {/* Draft Deal Created Feedback Card */}
              {draftDealCreated && dealAddress && (
                <div className="rounded-xl border border-[#00DD94]/30 bg-[#00DD94]/10 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[#00DD94]">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <h3 className="text-sm font-semibold">New Deal Draft Initialized</h3>
                  </div>
                  <p className="text-xs text-white/80">
                    Draft deal created for <strong className="text-white">{dealAddress}</strong> and linked to project{' '}
                    <code className="text-[#00DD94]">{projectId}</code>.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link
                      href={`/deals/${dealSlug}?fromProject=${projectId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#00DD94] px-4 py-2 text-xs font-semibold text-[#0a0a0f] hover:brightness-110 transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_note</span>
                      Create deal details
                    </Link>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/5 transition"
                    >
                      Proceed to confirmation →
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-medium text-white/70 hover:bg-white/5 transition"
                >
                  ← Back to Basics
                </button>

                {dealAddress && !draftDealCreated && (
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00DD94] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#0a0a0f] hover:brightness-110 transition"
                  >
                    Next: Confirm &amp; Launch
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm & Launch */}
        {currentStep === 3 && (
          <div>
            <div className="mb-6 border-b border-white/8 pb-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#00DD94]">
                STEP 3 OF 3
              </span>
              <h1 className="mt-1 text-2xl font-bold text-white">Confirm &amp; Launch</h1>
              <p className="mt-1 text-xs text-white/60">
                Review your project setup and linked deal before creating the workspace.
              </p>
            </div>

            {/* Summary Card */}
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Project Name</p>
                <p className="mt-0.5 text-base font-semibold text-white">
                  {projectName || 'Elm Street Flip & Expansion'}
                </p>
                {description && <p className="mt-1 text-xs text-white/60">{description}</p>}
              </div>

              <div className="border-t border-white/6 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Linked Deal Address</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#00DD94]">location_on</span>
                  <p className="text-sm font-medium text-white">
                    {dealAddress || '1247 Elm Street, Austin, TX 78702'}
                  </p>
                </div>
                {dealName && (
                  <p className="mt-0.5 text-xs text-white/50 ml-6">
                    Deal: {dealName}
                  </p>
                )}
              </div>

              <div className="border-t border-white/6 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Assigned Team</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTeam.map((member) => (
                    <span
                      key={member}
                      className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/80"
                    >
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/8">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-medium text-white/70 hover:bg-white/5 transition"
              >
                ← Back to Property
              </button>

              <button
                type="button"
                onClick={handleLaunchProject}
                disabled={isLaunching}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00DD94] px-7 py-3 text-xs font-bold uppercase tracking-wider text-[#0a0a0f] hover:brightness-110 transition shadow-[0_4px_16px_rgba(0,221,148,0.3)] disabled:opacity-50"
              >
                {isLaunching ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">
                      progress_activity
                    </span>
                    Launching…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                    Launch project
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
