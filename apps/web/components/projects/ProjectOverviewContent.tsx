'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import {
  formatCurrency,
  reilPhaseOrderLabels,
} from '@/lib/projects/phase-utils';
import { useProjectWorkspace } from '@/components/projects/ProjectWorkspaceProvider';
import AcquisitionWorkspaceView from '@/components/projects/AcquisitionWorkspaceView';
import FundWorkspaceView from '@/components/projects/FundWorkspaceView';

export default function ProjectOverviewContent() {
  const { project, updateProject } = useProjectWorkspace();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const phaseParam = searchParams?.get('phase')?.toLowerCase();
  const isFundPath = pathname?.endsWith('/fund') || pathname?.includes('/fund/');

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isFundPath || phaseParam === 'fund' || phaseParam === 'purchase') return 'purchase';
    if (phaseParam === 'acquisition') return 'acquisition';
    return project?.currentPhase || project?.phase || 'acquisition';
  });

  useEffect(() => {
    if (isFundPath || phaseParam === 'fund' || phaseParam === 'purchase') {
      setActiveTab('purchase');
    } else if (phaseParam === 'acquisition') {
      setActiveTab('acquisition');
    } else if (project) {
      setActiveTab(project.currentPhase || project.phase || 'acquisition');
    }
  }, [isFundPath, phaseParam, project?.currentPhase, project?.phase]);

  if (!project) return null;

  const storageUsedMb = (project.storage_used_bytes / (1024 * 1024)).toFixed(2);
  const storageQuotaMb = (project.storageQuotaBytes / (1024 * 1024)).toFixed(0);

  const isFundActive =
    activeTab === 'purchase' ||
    activeTab === 'fund' ||
    ((project.currentPhase === 'purchase' || (project.currentPhase as string) === 'fund' || (project.currentPhase as any) === 2) && activeTab !== 'acquisition');

  const isAcqActive = !isFundActive;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reilPhaseOrderLabels().map((step) => {
          const isCurrentProjectPhase =
            step.legacy === project.currentPhase ||
            (step.legacy === 'acquisition' && (project.phase === 'acquisition' || (project.currentPhase as any) === 1)) ||
            (step.legacy === 'purchase' && (project.phase === 'purchase' || (project.currentPhase as any) === 2));
          const isSelected = (step.legacy === 'purchase' && isFundActive) || (step.legacy === 'acquisition' && isAcqActive);

          return (
            <button
              type="button"
              key={step.phase}
              onClick={() => setActiveTab(step.legacy)}
              className="rounded-2xl border p-4 text-left transition hover:border-white/30 focus:outline-none"
              style={{
                borderColor: isSelected ? 'rgba(59,130,246,0.5)' : isCurrentProjectPhase ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                background: isSelected ? 'rgba(59,130,246,0.12)' : isCurrentProjectPhase ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.18)',
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{step.label}</p>
                {isCurrentProjectPhase && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-white/80">
                    Active Phase
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium">
                {isSelected ? 'Viewing workspace' : isCurrentProjectPhase ? 'Current phase' : 'Queued'}
              </p>
            </button>
          );
        })}
      </section>

      {isFundActive ? (
        <FundWorkspaceView project={project} onUpdateProject={updateProject} />
      ) : isAcqActive ? (
        <AcquisitionWorkspaceView project={project} onUpdateProject={updateProject} />
      ) : (
        <section className="grid gap-6 lg:grid-cols-12">
        <article className="rounded-2xl border border-white/10 bg-black/25 p-5 lg:col-span-4">
          <h2 className="mb-4 text-lg font-semibold">Project specs</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-white/45">Exit strategy</dt>
              <dd className="font-medium">{project.exit_strategy}</dd>
            </div>
            <div>
              <dt className="text-white/45">Entity</dt>
              <dd className="font-medium">{project.entity_type}</dd>
            </div>
            <div>
              <dt className="text-white/45">Purchase price</dt>
              <dd className="font-medium">{formatCurrency(project.purchase_price)}</dd>
            </div>
            <div>
              <dt className="text-white/45">Rehab budget</dt>
              <dd className="font-medium">{formatCurrency(project.rehab_costs)}</dd>
            </div>
            {project.underwriting ? (
              <>
                <div>
                  <dt className="text-white/45">Gross scheduled rent</dt>
                  <dd className="font-medium">
                    ${project.underwriting.rentRoll.grossScheduledRent.toLocaleString()}/mo
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Financing terms</dt>
                  <dd className="font-medium">
                    {project.underwriting.debt.targetLTV}% LTV · {project.underwriting.debt.interestRate}%
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Exit cap rate</dt>
                  <dd className="font-medium">{project.underwriting.exit.exitCapRate}%</dd>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                Underwriting: Not yet collected
              </div>
            )}
          </dl>
          <div className="mt-4 border-t border-white/10 pt-3">
            <a
              href={`/project/${project.id}/underwriting`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00DD94] hover:underline"
            >
              {project.underwriting ? 'Edit Underwriting Inputs →' : 'Add Underwriting Inputs →'}
            </a>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/25 p-5 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Phase todos</h2>
            <span className="text-xs text-white/55">
              {project.todos.filter((todo) => todo.status === 'completed').length} / {project.todos.length} done
            </span>
          </div>
          <div className="space-y-3">
            {project.todos.map((todo) => (
              <div
                key={todo.id}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
              >
                <p className="font-medium">{todo.content}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.06em] text-white/45">
                  {todo.type} · {todo.status}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/25 p-5 lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">Document vault</h2>
          <div className="space-y-2">
            {project.documents.map((doc) => (
              <div
                key={doc.doc_id}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
              >
                <p className="font-medium">{doc.name}</p>
                <p className="text-white/45">{doc.type}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/45">
            Storage: {storageUsedMb} MB / {storageQuotaMb} MB
          </p>
        </article>
      </section>
      )}
    </div>
  );
}
