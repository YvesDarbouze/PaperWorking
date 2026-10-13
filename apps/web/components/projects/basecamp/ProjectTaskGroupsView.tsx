'use client';

import { useState } from 'react';
import {
  CheckSquareOffset,
  Plus,
  CalendarBlank,
  Eye,
  EyeSlash,
  Check,
  Paperclip,
} from '@phosphor-icons/react';
import type { ProjectTaskGroup, ProjectDocument } from '@/lib/projects/types';

export default function ProjectTaskGroupsView({
  projectId,
  taskGroups,
  onRefresh,
  vendorMode,
  teamMembers = [],
  documents = [],
}: {
  projectId: string;
  taskGroups: ProjectTaskGroup[];
  onRefresh: () => void;
  vendorMode: boolean;
  teamMembers?: Array<{ uid?: string; id?: string; name: string; role?: string }>;
  documents?: ProjectDocument[];
}) {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskVendorVisible, setNewTaskVendorVisible] = useState(false);
  const [newTaskDocumentId, setNewTaskDocumentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter groups and tasks for vendorMode
  const visibleGroups = taskGroups
    .map((g) => ({
      ...g,
      tasks: vendorMode ? g.tasks.filter((t) => t.vendorVisible) : g.tasks,
    }))
    .filter((g) => !vendorMode || g.tasks.length > 0);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/task-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_list',
          title: newGroupTitle.trim(),
        }),
      });
      if (res.ok) {
        setNewGroupTitle('');
        setIsAddingGroup(false);
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddTask(listId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/task-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_task',
          listId,
          title: newTaskTitle.trim(),
          dueDate: newTaskDueDate || undefined,
          assigneeId: newTaskAssigneeId || undefined,
          vendorVisible: newTaskVendorVisible,
          linkedDocumentId: newTaskDocumentId || undefined,
        }),
      });
      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDueDate('');
        setNewTaskAssigneeId('');
        setNewTaskDocumentId('');
        setActiveGroupId(null);
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleTask(taskId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/task-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_task', taskId }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggleSubtask(taskId: string, subtaskId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/task-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_subtask', taskId, subtaskId }),
      });
      if (res.ok) {
        onRefresh();
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
            <CheckSquareOffset size={20} className="text-foreground shrink-0" />
            <h3 className="text-base font-semibold text-foreground tracking-tight">To-do Lists</h3>
            <span className="text-xs font-mono rounded-none border border-border bg-muted/50 px-2 py-0.5 text-foreground">
              {visibleGroups.reduce((acc, g) => acc + g.tasks.length, 0)} Tasks
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organized lists with subtasks, assignees, and completion check-offs.
          </p>
        </div>

        {!vendorMode && (
          <button
            type="button"
            onClick={() => setIsAddingGroup(!isAddingGroup)}
            className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition min-h-[44px]"
          >
            <Plus size={16} />
            <span>{isAddingGroup ? 'Cancel' : 'New To-do List'}</span>
          </button>
        )}
      </div>

      {/* Add New Group Form */}
      {isAddingGroup && !vendorMode && (
        <form onSubmit={handleCreateGroup} className="rounded-none border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Add a New To-do List</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newGroupTitle}
              onChange={(e) => setNewGroupTitle(e.target.value)}
              placeholder="e.g. Environmental Review & Soil Boring Tasks"
              className="flex-1 rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-none bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px]"
            >
              Add List
            </button>
          </div>
        </form>
      )}

      {/* Task Groups List */}
      <div className="space-y-4">
        {visibleGroups.length === 0 ? (
          <div className="rounded-none border border-border bg-card p-8 text-center text-muted-foreground">
            <p className="text-sm">No to-dos found.</p>
            <p className="text-xs mt-1 text-muted-foreground">Create a to-do list to start tracking project tasks.</p>
          </div>
        ) : (
          visibleGroups.map((group) => {
            const completedCount = group.tasks.filter((t) => t.status === 'complete').length;
            const isAddingToThis = activeGroupId === group.id;

            return (
              <div
                key={group.id}
                className="rounded-none border border-border bg-card p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground tracking-tight">{group.title}</h4>
                    <span className="text-[11px] font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
                      {completedCount} / {group.tasks.length} done
                    </span>
                  </div>

                  {!vendorMode && (
                    <button
                      type="button"
                      onClick={() => setActiveGroupId(isAddingToThis ? null : group.id)}
                      className="text-xs font-medium text-foreground hover:text-foreground/80 transition flex items-center gap-1 min-h-[44px] px-2"
                    >
                      <Plus size={14} />
                      <span>{isAddingToThis ? 'Close' : 'Add to-do'}</span>
                    </button>
                  )}
                </div>

                {/* Add Task Sub-form */}
                {isAddingToThis && !vendorMode && (
                  <form
                    onSubmit={(e) => handleAddTask(group.id, e)}
                    className="rounded-none border border-border bg-muted/30 p-3 space-y-2.5"
                  >
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Describe the task..."
                      className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                      required
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-muted-foreground shrink-0">Assign to:</label>
                        <select
                          value={newTaskAssigneeId}
                          onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                          className="w-full rounded-none border border-input bg-background px-2 py-1 text-base sm:text-xs text-foreground focus:outline-none min-h-[44px]"
                        >
                          <option value="">Unassigned</option>
                          {teamMembers.map((m) => (
                            <option key={m.uid || m.id} value={m.uid || m.id}>
                              {m.name} {m.role ? `(${m.role})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-muted-foreground shrink-0">Due:</label>
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="rounded-none border border-input bg-background px-2 py-1 text-base sm:text-xs text-foreground focus:outline-none min-h-[44px]"
                          />
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer min-h-[44px] shrink-0">
                          <input
                            type="checkbox"
                            checked={newTaskVendorVisible}
                            onChange={(e) => setNewTaskVendorVisible(e.target.checked)}
                            className="rounded-none border-input text-primary focus:ring-ring"
                          />
                          <span className="text-[11px] text-foreground">Vendor</span>
                        </label>
                      </div>
                    </div>
                    {documents.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-foreground">
                        <label className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Paperclip size={12} />
                          <span>Attach File:</span>
                        </label>
                        <select
                          value={newTaskDocumentId}
                          onChange={(e) => setNewTaskDocumentId(e.target.value)}
                          className="w-full rounded-none border border-input bg-background px-2 py-1 text-base sm:text-xs text-foreground focus:outline-none min-h-[44px]"
                        >
                          <option value="">No file attached</option>
                          {documents.map((d) => (
                            <option key={d.doc_id} value={d.doc_id}>
                              {d.name} {d.type ? `(${d.type})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveGroupId(null)}
                        className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground min-h-[44px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-none bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 min-h-[44px]"
                      >
                        Add to list
                      </button>
                    </div>
                  </form>
                )}

                {/* Tasks List */}
                <div className="space-y-2">
                  {group.tasks.map((task) => {
                    const isCompleted = task.status === 'complete';

                    return (
                      <div
                        key={task.id}
                        className="rounded-none border border-border/60 bg-muted/20 p-3 text-xs space-y-2"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task.id)}
                            aria-label={`Mark task ${task.title} as ${isCompleted ? 'incomplete' : 'complete'}`}
                            className={`mt-0.5 h-5 w-5 rounded-none border flex items-center justify-center transition shrink-0 ${
                              isCompleted
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card hover:border-foreground'
                            }`}
                          >
                            {isCompleted && <Check size={12} weight="bold" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium ${
                                isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.notes && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                {task.notes}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                              {task.assigneeName && (
                                <span>Assignee: <strong className="text-foreground">{task.assigneeName}</strong></span>
                              )}
                              {task.dueDate && (
                                <span className="flex items-center gap-1 font-mono">
                                  <CalendarBlank size={12} /> Due: {task.dueDate}
                                </span>
                              )}
                              {task.vendorVisible ? (
                                <span className="text-foreground flex items-center gap-0.5 font-mono text-[10px]">
                                  <Eye size={11} /> Vendor
                                </span>
                              ) : (
                                <span className="text-muted-foreground flex items-center gap-0.5 font-mono text-[10px]">
                                  <EyeSlash size={11} /> Internal
                                </span>
                              )}
                              {task.linkedDocumentId && (() => {
                                const matchedDoc = documents.find((d) => d.doc_id === task.linkedDocumentId);
                                return (
                                  <a
                                    href={matchedDoc?.url || `/api/projects/${projectId}/documents/${task.linkedDocumentId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-foreground hover:underline inline-flex items-center gap-1 font-mono text-[10px]"
                                  >
                                    <Paperclip size={11} />
                                    <span>{matchedDoc?.name || 'Attached File'}</span>
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Subtasks */}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="pl-8 pt-1 space-y-1.5 border-t border-border/40 mt-2">
                            {task.subtasks.map((sub) => {
                              const isSubCompleted = Boolean(sub.completed);

                              return (
                                <div key={sub.id} className="flex items-center gap-2 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSubtask(task.id, sub.id)}
                                    aria-label={`Mark subtask ${sub.title} as ${isSubCompleted ? 'incomplete' : 'complete'}`}
                                    className={`h-4 w-4 rounded-none border flex items-center justify-center transition shrink-0 ${
                                      isSubCompleted
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-card hover:border-foreground'
                                    }`}
                                  >
                                    {isSubCompleted && <Check size={10} weight="bold" />}
                                  </button>
                                  <span className={isSubCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}>
                                    {sub.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
