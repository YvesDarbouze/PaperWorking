'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types/schema';
import { FileUp, UserPlus, CheckCircle, Circle, MessageSquare, Users, Loader2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';
import { Todo, DEFAULT_TODOS } from '@/lib/constants/todos';
import { isSubscriptionActive } from '@/lib/stripe/subscription';


export default function ProjectTodoList({ deal, phase = 1 }: { deal: Project, phase?: number }) {

  const [todos, setTodos] = useState<Todo[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { isLead, canEdit } = usePermissions();
  const { user, profile, loading } = useAuth();

  const isVendor = profile?.role === 'Vendor' || profile?.accountType === 'vendor';
  const hasActiveSub = profile ? isSubscriptionActive(profile) : false;
  const plan = loading ? 'Loading' : (hasActiveSub ? (profile?.subscriptionPlan || 'None') : 'None');
  const isReadOnly = isVendor || plan === 'Vendor Network';

  const showUpgradeBanner = !loading && (profile?.subscriptionPlan === 'None' || !profile?.subscriptionPlan);
  const showInactiveBanner = !loading && (profile?.subscriptionPlan && profile.subscriptionPlan !== 'None') && !hasActiveSub;
  const canComplete = !loading && canEdit && plan !== 'None' && !isReadOnly;
  const canAssign = !loading && isLead && plan !== 'None' && !isReadOnly;

  useEffect(() => {
    const currentTodos = (DEFAULT_TODOS[phase] || []).map(defaultTodo => {
      const savedTodo = deal.actionItems?.find((t: any) => t.id === defaultTodo.id);
      return savedTodo ? { ...defaultTodo, ...savedTodo } : defaultTodo;
    });
    setTodos(currentTodos);
  }, [phase, deal.actionItems]);

  const saveTodosToBackend = async (newTodos: Todo[]) => {
    if (!user) return;
    try {
      setIsSaving(true);
      const idToken = await user.getIdToken();
      
      const existingOtherPhaseTodos = (deal.actionItems || []).filter(
         (item: any) => !newTodos.find(t => t.id === item.id)
      );
      const allTodos = [...existingOtherPhaseTodos, ...newTodos];

      const res = await fetch('/api/projects/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           idToken,
           projectId: deal.id,
           todos: allTodos
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save action items');
      }
    } catch (err) {
      console.error('Failed to save todos to backend:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (id: string) => {
    if (!canComplete) return;

    let updatedTodos: Todo[] = [];
    let completedAction = false;
    setTodos(prev => {
      updatedTodos = prev.map(t => {
        if (t.id === id) {
          if (!t.completed) {
            completedAction = true;
          }
          return { ...t, completed: !t.completed };
        }
        return t;
      });
      return updatedTodos;
    });

    await saveTodosToBackend(updatedTodos);

    if (completedAction) {
      try {
        const { useUIStore } = await import('@/store/uiStore');
        useUIStore.getState().triggerSuccessfulAction('task_completed');
      } catch (err) {
        console.error('Failed to trigger task_completed successful action:', err);
      }
    }
  };

  const handleAssign = async (id: string, email: string) => {
    if (!canAssign) return;

    if (plan === 'Individual') {
      const currentUserEmail = profile?.email || user?.email || '';
      if (email !== '' && email !== currentUserEmail) return;
    }

    setIsSaving(true);
    
    // Handle specific assignment business logic via server action
    if (email !== '') {
      const taskLabel = todos.find(t => t.id === id)?.label || 'A task';
      try {
        const { assignTask } = await import('@/actions/team');
        await assignTask(deal.id, id, email, taskLabel);
      } catch (err) {
        console.error('Failed to assign task via server action:', err);
      }
    }
    
    let updatedTodos: Todo[] = [];
    setTodos(prev => {
      updatedTodos = prev.map(t => t.id === id ? { ...t, assignee: email, needsReassignment: false } : t);
      return updatedTodos;
    });
    setAssigningId(null);

    await saveTodosToBackend(updatedTodos);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-medium tracking-tight text-text-primary">Action Items</h3>
        {isSaving && <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />}
      </div>

      {showUpgradeBanner && (
        <div className="p-4 border border-pw-border bg-bg-surface text-text-primary flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <p className="font-semibold text-sm">Upgrade Required</p>
            <p className="text-xs text-text-secondary mt-1">
              You are on the Free plan. Upgrade to assign tasks to team members and complete action items.
            </p>
          </div>
          <a
            href="/pricing"
            className="pw-btn pw-btn--sm pw-btn--primary whitespace-nowrap text-xs text-center font-bold"
          >
            Upgrade Now
          </a>
        </div>
      )}

      {showInactiveBanner && (
        <div className="p-4 border border-pw-border bg-bg-surface text-text-primary flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <p className="font-semibold text-sm">Subscription Inactive</p>
            <p className="text-xs text-text-secondary mt-1">
              Your subscription is currently inactive or expired. Please update your billing info or reactivate your subscription to manage action items.
            </p>
          </div>
          <a
            href="/pricing"
            className="pw-btn pw-btn--sm pw-btn--primary whitespace-nowrap text-xs text-center font-bold"
          >
            Reactivate Now
          </a>
        </div>
      )}

      <div className="space-y-3">
        {todos.map(todo => (
          <div 
            key={todo.id} 
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border transition-all ${todo.completed ? 'bg-bg-surface/40 border-pw-border' : (todo.needsReassignment ? 'bg-red-500/10 border-red-500' : 'bg-bg-surface border-pw-border')}`}
          >
            <div className="flex items-start gap-4 mb-3 sm:mb-0">
              <button 
                onClick={() => handleAction(todo.id)} 
                className="mt-1" 
                disabled={isSaving || !canComplete}
              >
                {todo.completed ? (
                  <CheckCircle className="w-5 h-5 text-text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-text-secondary opacity-50" />
                )}
              </button>
              <div>
                <p className={`font-semibold ${todo.completed ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{todo.label}</p>
                <p className="text-sm text-text-secondary mt-1 max-w-md">{todo.description}</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={() => handleAction(todo.id)}
                disabled={todo.completed || isSaving || !canComplete}
                className={`pw-btn pw-btn--sm ${todo.completed ? 'pw-btn--ghost text-text-secondary cursor-not-allowed' : 'pw-btn--primary'}`}
              >
                {todo.type === 'upload' && <FileUp className="w-3.5 h-3.5 mr-1.5" />}
                {todo.type === 'delegate' && <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
                {todo.type === 'question' && <MessageSquare className="w-3.5 h-3.5 mr-1.5" />}
                {todo.completed ? 'Completed' : todo.actionText}
              </button>
              
              {canAssign && !todo.completed && todo.type === 'delegate' && (() => {
                const isMeAllowed = !todo.allowedRoles || 
                  todo.allowedRoles.includes(profile?.role || 'Guest') || 
                  todo.allowedRoles.includes(profile?.orgRole || 'Guest');
                const allowedTeamMembers = deal.projectTeam?.filter(
                  (m) => m.status === 'active' && 
                         m.email !== (profile?.email || user?.email) &&
                         (!todo.allowedRoles || todo.allowedRoles.includes(m.projectRole))
                ) || [];

                return (
                  <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center gap-2">
                    {plan === 'Individual' ? (
                      isMeAllowed ? (
                        <div className="flex items-center gap-2">
                          {todo.assignee && todo.assignee !== (profile?.email || user?.email) && (
                            <span className="text-xs text-text-secondary mr-2 bg-bg-surface/50 px-2 py-1 border border-pw-border">
                              Assigned to: {todo.assignee}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const currentUserEmail = profile?.email || user?.email || '';
                              handleAssign(todo.id, todo.assignee === currentUserEmail ? '' : currentUserEmail);
                            }}
                            disabled={isSaving}
                            className="pw-btn pw-btn--sm pw-btn--secondary font-bold uppercase tracking-widest text-xs"
                          >
                            {todo.assignee === (profile?.email || user?.email) ? 'Unassign Me' : 'Assign to Me'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-text-secondary italic">Restricted by Role Matrix</span>
                      )
                    ) : plan === 'Team' ? (
                      assigningId === todo.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="email"
                            placeholder="Enter email..."
                            defaultValue={todo.assignee || ''}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAssign(todo.id, e.currentTarget.value);
                              }
                            }}
                            className="pw-input text-xs w-48"
                            disabled={isSaving}
                            list={`team-members-${todo.id}`}
                            id={`assign-input-${todo.id}`}
                          />
                          <datalist id={`team-members-${todo.id}`}>
                            {isMeAllowed && (
                              <option value={profile?.email || user?.email || ''}>Me ({profile?.email || user?.email})</option>
                            )}
                            {allowedTeamMembers.map((m) => (
                              <option key={m.email} value={m.email}>
                                {m.displayName} - {m.projectRole}
                              </option>
                            ))}
                          </datalist>
                          <button 
                            onClick={() => {
                              const input = document.getElementById(`assign-input-${todo.id}`) as HTMLInputElement;
                              if (input) handleAssign(todo.id, input.value);
                            }}
                            disabled={isSaving}
                            className="pw-btn pw-btn--sm pw-btn--primary text-xs font-bold"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setAssigningId(null)}
                            className="text-xs text-text-secondary hover:text-text-primary"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setAssigningId(todo.id)}
                          disabled={isSaving}
                          className="pw-btn pw-btn--sm pw-btn--secondary font-bold uppercase tracking-widest text-xs flex items-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {todo.assignee ? `Assigned: ${todo.assignee}` : 'Assign'}
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })()}
              
              {(!canAssign || todo.completed || todo.type !== 'delegate') && todo.assignee && (
                 <div className="mt-2 sm:mt-0 sm:ml-4">
                    <span className={`text-xs bg-bg-surface/50 px-2 py-1 border ${todo.needsReassignment ? 'border-red-500 text-red-500' : 'border-pw-border text-text-secondary'}`}>
                      Assigned to: {todo.assignee} {todo.needsReassignment ? '(Needs Reassignment)' : ''}
                    </span>
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
