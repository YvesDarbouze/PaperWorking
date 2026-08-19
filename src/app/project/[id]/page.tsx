'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  CheckCircle2,
  Clock,
  Upload,
  UserPlus,
  FileText,
  Building,
  HardDrive,
  Layers,
} from 'lucide-react';
import { TodoItem, calculatePhaseCompletion } from '@/lib/todo-engine';
import { REIPhase } from '@/lib/wizard-engine';
import { advanceProjectPhase } from '@/lib/phase-engine';
import { AccountType } from '@/lib/permissions';
import REILifecycleKanban from '@/components/rei-kanban/REILifecycleKanban';
import PhasePanelsContainer from '@/components/phase-panels/PhasePanelsContainer';
import TaskAssignmentModal from '@/components/task-assignment/TaskAssignmentModal';

const PHASE_BG_COLORS: Record<string, string> = {
  acquisition: 'bg-[#1a3a5c]',
  purchase: 'bg-[#2d5a3d]',
  hold: 'bg-[#8b6914]',
  exit: 'bg-[#5c1a1a]',
  default: 'bg-[#0f172a]',
};

interface ProjectData {
  project_id: string;
  propertyName: string;
  property_address: string;
  phase: REIPhase;
  phase_completion_pct: number;
  date_of_sale?: string;
  purchase_price?: number;
  rehab_costs?: number;
  exit_strategy?: string;
  entity_type?: string;
  storage_used_bytes: number;
  storageQuotaBytes: number;
  todos: TodoItem[];
  documents: Array<{ doc_id: string; type: string; url: string; name?: string; generated_at: string }>;
  team_assignments: Array<{ task_id: string; user_id: string; role: string }>;
}

export default function ProjectWorkdeskPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [completionPct, setCompletionPct] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<REIPhase>('acquisition');
  const [userAccountType, setUserAccountType] = useState<AccountType>('investor');

  // Task assignment modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssignTodo, setSelectedAssignTodo] = useState<TodoItem | null>(null);

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.project) {
            setProject(data.project);
            setTodos(data.project.todos || []);
            setCompletionPct(data.project.phase_completion_pct || 0);
            setCurrentPhase(data.project.phase || 'acquisition');
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback mock
      }

      const mockProject: ProjectData = {
        project_id: projectId,
        propertyName: '742 Evergreen Terrace',
        property_address: '742 Evergreen Terrace, Springfield, OR',
        phase: 'acquisition',
        phase_completion_pct: 40,
        date_of_sale: '2026-06-15',
        purchase_price: 350000,
        rehab_costs: 45000,
        exit_strategy: 'Flip',
        entity_type: 'LLC (single)',
        storage_used_bytes: 1240000,
        storageQuotaBytes: 536870912,
        documents: [
          {
            doc_id: 'doc_1',
            type: 'Proof of Funds',
            url: '#',
            name: 'Bank_Statement_POF.pdf',
            generated_at: new Date().toISOString(),
          },
        ],
        team_assignments: [
          { task_id: 'task_1', user_id: 'usr_attorney_1', role: 'Real Estate Attorney' },
        ],
        todos: [
          {
            id: 'todo_acq_1',
            type: 'file',
            content: 'Upload your proof of funds letter',
            status: 'completed',
            phase: 'acquisition',
            action_label: 'Upload Letter',
          },
          {
            id: 'todo_acq_2',
            type: 'question',
            content: 'What is your maximum offer price?',
            status: 'pending',
            phase: 'acquisition',
            action_label: 'Set Offer Cap',
          },
          {
            id: 'todo_acq_3',
            type: 'task',
            content: 'Find a Real Estate Attorney for closing',
            status: 'pending',
            phase: 'acquisition',
            action_label: 'Assign Legal Counsel',
          },
        ],
      };

      setProject(mockProject);
      setTodos(mockProject.todos);
      setCompletionPct(mockProject.phase_completion_pct);
      setCurrentPhase(mockProject.phase);
      setLoading(false);
    }

    loadProject();
  }, [projectId]);

  const toggleTodoStatus = (todo: TodoItem) => {
    if (todo.action_label && todo.action_label.toLowerCase().includes('assign')) {
      setSelectedAssignTodo(todo);
      setIsAssignModalOpen(true);
      return;
    }

    const updatedTodos = todos.map(t => {
      if (t.id === todo.id) {
        const nextStatus: TodoItem['status'] =
          t.status === 'completed' ? 'pending' : 'completed';
        return { ...t, status: nextStatus };
      }
      return t;
    });

    setTodos(updatedTodos);
    const newPct = calculatePhaseCompletion(updatedTodos, 3, 5);
    setCompletionPct(newPct);
  };

  const handleForceAdvance = (targetPhase: REIPhase, reason: string) => {
    if (!project) return;
    const res = advanceProjectPhase(project, 'user_e2e_123', true, reason);
    if (res.success && res.project) {
      setProject(res.project);
      setCurrentPhase(res.project.phase);
      setTodos(res.project.todos || []);
      setCompletionPct(0);
    }
  };

  const bgColorClass = PHASE_BG_COLORS[currentPhase] || PHASE_BG_COLORS.default;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">Loading Project Workdesk...</p>
        </div>
      </div>
    );
  }

  const storageUsedMB = ((project?.storage_used_bytes || 0) / (1024 * 1024)).toFixed(2);
  const storageQuotaMB = ((project?.storageQuotaBytes || 536870912) / (1024 * 1024)).toFixed(0);

  return (
    <div
      data-testid="project-workdesk"
      className={`min-h-screen flex flex-col text-white transition-colors duration-500 ${bgColorClass}`}
    >
      {/* Top Bar Header */}
      <header
        data-testid="workdesk-top-bar"
        className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-black/30 backdrop-blur-md sticky top-0 z-40"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/command-center')}
            data-testid="close-workdesk-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold tracking-wide transition text-slate-200"
          >
            <X className="w-4 h-4" />
            <span>Close Workdesk</span>
          </button>

          <div className="h-4 w-px bg-white/20" />

          <div className="flex items-center gap-3">
            <h1 data-testid="workdesk-project-title" className="text-lg font-bold truncate max-w-md">
              {project?.propertyName || project?.property_address}
            </h1>
            <span
              data-testid="workdesk-phase-badge"
              className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white"
            >
              {currentPhase} Phase
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">Phase Completion:</span>
            <span data-testid="workdesk-completion-pct" className="text-sm font-extrabold text-emerald-400">
              {completionPct}%
            </span>
          </div>
          <div className="w-24 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Workdesk Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        {/* REI Lifecycle Kanban Bar */}
        <REILifecycleKanban
          currentPhase={currentPhase}
          phaseCompletionPct={completionPct}
          onSelectPhase={(ph) => setCurrentPhase(ph)}
          onForceAdvance={handleForceAdvance}
        />

        {/* 3-Column Operations Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar (3 cols): Specs & Storage */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4 backdrop-blur-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-400" />
                Project Specs
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Address</span>
                  <span className="font-medium text-white block truncate">{project?.property_address}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <div>
                    <span className="text-xs text-slate-400 block">Purchase Price</span>
                    <span className="font-semibold text-white">
                      {project?.purchase_price ? `$${project.purchase_price.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Rehab Budget</span>
                    <span className="font-semibold text-white">
                      {project?.rehab_costs ? `$${project.rehab_costs.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Quota */}
            <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-3 backdrop-blur-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                Storage Quota (0.5 GB Total)
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{storageUsedMB} MB used</span>
                  <span>{storageQuotaMB} MB limit</span>
                </div>
                <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${Math.min(100, (Number(storageUsedMB) / Number(storageQuotaMB)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Center Column (6 cols): Active Phase Todos */}
          <main className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-2xl bg-black/30 border border-white/10 space-y-4 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  {currentPhase.toUpperCase()} Phase Todos
                </h2>
                <span className="text-xs text-slate-300">
                  {todos.filter(t => t.status === 'completed').length} of {todos.length} Done
                </span>
              </div>

              <div className="space-y-3" data-testid="todo-list">
                {todos.map(todo => {
                  const isDone = todo.status === 'completed';
                  return (
                    <div
                      key={todo.id}
                      data-testid={`todo-card-${todo.id}`}
                      className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300 opacity-80'
                          : 'bg-black/40 border-white/15 text-white hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => toggleTodoStatus(todo)}
                          data-testid={`todo-check-${todo.id}`}
                          className={`mt-0.5 p-1 rounded-md transition ${
                            isDone
                              ? 'text-emerald-400 bg-emerald-400/10'
                              : 'text-slate-400 hover:text-white border border-white/20'
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>

                        <div className="space-y-1">
                          <p className={`text-sm font-medium ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                            {todo.content}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="capitalize px-2 py-0.5 rounded bg-white/10 text-[10px]">
                              {todo.type}
                            </span>
                            {todo.due_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Due {todo.due_date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {todo.action_label && (
                        <button
                          onClick={() => toggleTodoStatus(todo)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isDone
                              ? 'bg-white/10 text-slate-300'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          {isDone ? 'Reopen' : todo.action_label}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </main>

          {/* Right Column (3 cols): Document Vault */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4 backdrop-blur-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Document Vault
              </h3>

              <div className="space-y-2">
                {project?.documents && project.documents.length > 0 ? (
                  project.documents.map((doc, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                      <span className="truncate max-w-[140px]">{doc.name || doc.type}</span>
                      <a href={doc.url} download className="text-emerald-400 hover:underline">
                        View
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No documents uploaded yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Full Phase Activity Panels Container */}
        <PhasePanelsContainer />
      </div>

      {/* Task Assignment Modal */}
      {selectedAssignTodo && (
        <TaskAssignmentModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedAssignTodo(null);
          }}
          todoContent={selectedAssignTodo.content}
          projectName={project?.propertyName || project?.property_address || 'Project'}
          currentUserAccountType={userAccountType}
          onAssignSuccess={() => {
            setIsAssignModalOpen(false);
            setSelectedAssignTodo(null);
          }}
        />
      )}
    </div>
  );
}
