'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types/schema';
import { FileUp, UserPlus, CheckCircle, Circle, MessageSquare, Users, Loader2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';

interface Todo {
  id: string;
  type: 'question' | 'upload' | 'delegate';
  label: string;
  description: string;
  completed: boolean;
  actionText: string;
  assignee?: string | null;
}

export default function ProjectTodoList({ deal, phase = 1 }: { deal: Project, phase?: number }) {
  const DEFAULT_TODOS: Record<number, Todo[]> = {
    1: [
      {
        id: 't1_1',
        type: 'question',
        label: 'Identify Target Neighborhood',
        description: 'Have you identified the primary neighborhood for this investment?',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't1_2',
        type: 'delegate',
        label: 'Loan Officer',
        description: 'Do you need to find a loan officer for financing this acquisition?',
        completed: false,
        actionText: 'Find Loan Officer',
      }
    ],
    2: [
      {
        id: 't2_1',
        type: 'delegate',
        label: 'Real Estate Attorney',
        description: 'Do you need to find a real estate attorney to handle closing and title work?',
        completed: false,
        actionText: 'Find Attorney',
      },
      {
        id: 't2_2',
        type: 'upload',
        label: 'Inspection Report',
        description: 'Please upload the inspection report for evaluation.',
        completed: false,
        actionText: 'Upload File',
      }
    ],
    3: [
      {
        id: 't3_1',
        type: 'delegate',
        label: 'General Contractor',
        description: 'Do you need to find a GC for the renovation work?',
        completed: false,
        actionText: 'Find GC',
      },
      {
        id: 't3_2',
        type: 'upload',
        label: 'Permits',
        description: 'Upload approved city permits for the renovation.',
        completed: false,
        actionText: 'Upload Permits',
      }
    ],
    4: [
      {
        id: 't4_1',
        type: 'delegate',
        label: 'Listing Agent',
        description: 'Do you need to find a listing agent to sell the property?',
        completed: false,
        actionText: 'Find Agent',
      }
    ]
  };

  const [todos, setTodos] = useState<Todo[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { isLead, canEdit } = usePermissions();
  const { user } = useAuth();

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
    if (!canEdit) return;

    let updatedTodos: Todo[] = [];
    setTodos(prev => {
      updatedTodos = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      return updatedTodos;
    });

    await saveTodosToBackend(updatedTodos);
  };

  const handleAssign = async (id: string, email: string) => {
    if (!isLead) return;
    
    let updatedTodos: Todo[] = [];
    setTodos(prev => {
      updatedTodos = prev.map(t => t.id === id ? { ...t, assignee: email } : t);
      return updatedTodos;
    });
    setAssigningId(null);

    await saveTodosToBackend(updatedTodos);

    if (user) {
       try {
          const idToken = await user.getIdToken();
          const taskLabel = updatedTodos.find(t => t.id === id)?.label || 'A task';
          
          await fetch('/api/emails/send', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                idToken,
                projectId: deal.id,
                to: [email],
                subject: `Task Assigned: ${taskLabel}`,
                html: `<div style="font-family:sans-serif;color:#333;">
                        <h2 style="margin-top:0;">You've been assigned a task</h2>
                        <p>You have been assigned to the task <strong>${taskLabel}</strong> for the project <strong>${deal.propertyName || 'Untitled Project'}</strong>.</p>
                        <p>Please log in to the PaperWorking portal to complete this action.</p>
                       </div>`
             })
          });
       } catch (err) {
          console.error('Failed to send assignment notification:', err);
       }
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-medium tracking-tight text-text-primary">Action Items</h3>
        {isSaving && <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />}
      </div>
      <div className="space-y-3">
        {todos.map(todo => (
          <div 
            key={todo.id} 
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all ${todo.completed ? 'bg-bg-surface/40 border-border-accent/40' : 'bg-bg-surface border-border-accent shadow-sm'}`}
          >
            <div className="flex items-start gap-4 mb-3 sm:mb-0">
              <button onClick={() => handleAction(todo.id)} className="mt-1" disabled={isSaving}>
                {todo.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-text-secondary opacity-50" />
                )}
              </button>
              <div>
                <p className={`font-semibold ${todo.completed ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{todo.label}</p>
                <p className="text-sm text-text-secondary mt-1 max-w-md">{todo.description}</p>
              </div>
            </div>
            
            <button
              onClick={() => handleAction(todo.id)}
              disabled={todo.completed || isSaving}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors whitespace-nowrap ${todo.completed ? 'bg-transparent text-text-secondary cursor-not-allowed' : 'bg-pw-black text-pw-white hover:bg-black/80'}`}
            >
              {todo.type === 'upload' && <FileUp className="w-3.5 h-3.5" />}
              {todo.type === 'delegate' && <UserPlus className="w-3.5 h-3.5" />}
              {todo.type === 'question' && <MessageSquare className="w-3.5 h-3.5" />}
              {todo.completed ? 'Completed' : todo.actionText}
            </button>
            
            {isLead && !todo.completed && todo.type === 'delegate' && (
              <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center gap-2">
                {assigningId === todo.id ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="email" 
                      placeholder="Vendor/Team Email"
                      className="px-3 py-1.5 text-xs bg-bg-surface/50 border border-border-accent rounded-md focus:outline-none focus:border-black transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAssign(todo.id, e.currentTarget.value);
                        }
                      }}
                      disabled={isSaving}
                    />
                    <button 
                      onClick={() => setAssigningId(null)}
                      className="text-[10px] text-text-secondary hover:text-text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setAssigningId(todo.id)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-border-accent rounded-md text-text-secondary hover:bg-bg-surface/80 hover:text-text-primary transition-colors"
                  >
                    <Users className="w-3 h-3" />
                    {todo.assignee ? `Assigned: ${todo.assignee}` : 'Assign'}
                  </button>
                )}
              </div>
            )}
            
            {!isLead && todo.assignee && (
               <div className="mt-2 sm:mt-0 sm:ml-4">
                  <span className="text-[10px] bg-bg-surface/50 px-2 py-1 rounded border border-border-accent/50 text-text-secondary">Assigned to: {todo.assignee}</span>
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
