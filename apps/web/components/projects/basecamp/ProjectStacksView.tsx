'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Folders, Plus, CaretRight, Building, Trash } from '@phosphor-icons/react';
import type { ProjectSummary, ProjectStack } from '@/lib/projects/types';

export default function ProjectStacksView({
  projects,
}: {
  projects: ProjectSummary[];
}) {
  const [stacks, setStacks] = useState<ProjectStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [newStackDesc, setNewStackDesc] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadStacks() {
      try {
        const res = await fetch('/api/projects/stacks');
        if (res.ok) {
          const data = await res.json();
          setStacks(data.stacks || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStacks();
  }, []);

  async function handleDeleteStack(stackId: string) {
    setDeletingId(stackId);
    try {
      const res = await fetch(`/api/projects/stacks/${stackId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setStacks(data.stacks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateStack(e: React.FormEvent) {
    e.preventDefault();
    if (!newStackName.trim()) return;
    try {
      const res = await fetch('/api/projects/stacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStackName.trim(),
          description: newStackDesc.trim() || undefined,
          projectIds: selectedProjectIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStacks(data.stacks || []);
        setNewStackName('');
        setNewStackDesc('');
        setSelectedProjectIds([]);
        setIsAdding(false);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Folders size={20} className="text-foreground shrink-0" />
            <h3 className="text-base font-semibold text-foreground tracking-tight">Project Stacks</h3>
            <span className="text-xs font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
              {stacks.length} {stacks.length === 1 ? 'Stack' : 'Stacks'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Custom groupings to organize related projects, markets, and client accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition min-h-[44px]"
        >
          <Plus size={16} />
          <span>{isAdding ? 'Cancel' : 'New Project Stack'}</span>
        </button>
      </div>

      {/* Add Stack Form */}
      {isAdding && (
        <form onSubmit={handleCreateStack} className="rounded-none border border-border bg-card p-4 space-y-3 text-xs">
          <h4 className="text-sm font-semibold text-foreground">Create a Custom Project Stack</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-foreground font-medium mb-1">Stack Name</label>
              <input
                type="text"
                value={newStackName}
                onChange={(e) => setNewStackName(e.target.value)}
                placeholder="e.g. Austin SFR Renovations"
                className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-foreground font-medium mb-1">Description</label>
              <input
                type="text"
                value={newStackDesc}
                onChange={(e) => setNewStackDesc(e.target.value)}
                placeholder="e.g. Single family rehabs closing in Q4"
                className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-foreground font-medium mb-1.5">Include Projects</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 rounded-none border border-border bg-muted/20">
              {projects.map((p) => {
                const checked = selectedProjectIds.includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 text-foreground cursor-pointer min-h-[32px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjectIds([...selectedProjectIds, p.id]);
                        } else {
                          setSelectedProjectIds(selectedProjectIds.filter((id) => id !== p.id));
                        }
                      }}
                      className="rounded-none border-input text-primary focus:ring-ring"
                    />
                    <span className="truncate">{p.propertyName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-none bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px]"
            >
              Save Stack
            </button>
          </div>
        </form>
      )}

      {/* Stacks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stacks.map((stack) => {
          const stackProjects = projects.filter((p) => stack.projectIds.includes(p.id));

          return (
            <div
              key={stack.id}
              className="rounded-none border border-border bg-card p-5 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-none border border-border bg-foreground" />
                    <h4 className="text-sm font-semibold text-foreground tracking-tight">{stack.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
                      {stackProjects.length} {stackProjects.length === 1 ? 'Project' : 'Projects'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteStack(stack.id)}
                      disabled={deletingId === stack.id}
                      title="Delete stack"
                      className="p-1 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/40 transition disabled:opacity-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                {stack.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{stack.description}</p>
                )}

                {/* Projects inside this stack */}
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  {stackProjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">No projects assigned to this stack.</p>
                  ) : (
                    stackProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/project/${p.id}`}
                        className="flex items-center justify-between p-2 rounded-none border border-transparent hover:border-border hover:bg-muted/40 transition text-xs group min-h-[44px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building size={14} className="text-muted-foreground group-hover:text-foreground" />
                          <span className="text-foreground truncate font-medium">
                            {p.propertyName}
                          </span>
                        </div>
                        <CaretRight size={14} className="text-muted-foreground group-hover:text-foreground shrink-0" />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
