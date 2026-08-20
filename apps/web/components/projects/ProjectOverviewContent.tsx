'use client';

import {
  formatCurrency,
  reilPhaseOrderLabels,
} from '@/lib/projects/phase-utils';
import { useProjectWorkspace } from '@/components/projects/ProjectWorkspaceProvider';

export default function ProjectOverviewContent() {
  const { project } = useProjectWorkspace();
  if (!project) return null;

  const storageUsedMb = (project.storage_used_bytes / (1024 * 1024)).toFixed(2);
  const storageQuotaMb = (project.storageQuotaBytes / (1024 * 1024)).toFixed(0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reilPhaseOrderLabels().map((step) => {
          const active = step.legacy === project.currentPhase;
          return (
            <article
              key={step.phase}
              className="rounded-2xl border p-4"
              style={{
                borderColor: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                background: active ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.18)',
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{step.label}</p>
              <p className="mt-1 text-sm font-medium">{active ? 'Current phase' : 'Queued'}</p>
            </article>
          );
        })}
      </section>

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
          </dl>
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
    </div>
  );
}
