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
      // ── Due Diligence Questions ──
      {
        id: 't1_1',
        type: 'question',
        label: 'Neighborhood Confirmed',
        description: 'Have you identified and researched the target neighborhood for this project?',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't1_2',
        type: 'question',
        label: 'Property Condition Assessment',
        description: 'On a scale of 1–10, what condition is this property in? Note any structural, roof, foundation, or systems issues.',
        completed: false,
        actionText: 'Assess',
      },
      {
        id: 't1_3',
        type: 'question',
        label: 'Title Status',
        description: 'Is the title clear, or are there clouds, liens, or encumbrances that need resolution before closing?',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't1_4',
        type: 'question',
        label: 'Comparable Sales Reviewed',
        description: 'Have you pulled and reviewed comparable sales to validate your ARV assumption? Bad comps = bad ARV = bad everything.',
        completed: false,
        actionText: 'Confirm',
      },
      // ── Document Uploads ──
      {
        id: 't1_5',
        type: 'upload',
        label: 'Inspection Report',
        description: 'Upload the property inspection report. This is the foundation of your rehab budget.',
        completed: false,
        actionText: 'Upload Report',
      },
      {
        id: 't1_6',
        type: 'upload',
        label: 'Title Search / Title Report',
        description: 'Upload the title search results. Confirms ownership and reveals any liens or encumbrances.',
        completed: false,
        actionText: 'Upload Title',
      },
      {
        id: 't1_7',
        type: 'upload',
        label: 'Appraisal or BPO',
        description: 'Upload the appraisal or Broker Price Opinion to support your ARV estimate.',
        completed: false,
        actionText: 'Upload Appraisal',
      },
      {
        id: 't1_8',
        type: 'upload',
        label: 'Survey / Plat Map',
        description: 'Upload the property survey or plat map showing boundaries and easements.',
        completed: false,
        actionText: 'Upload Survey',
      },
      // ── People / Delegation ──
      {
        id: 't1_9',
        type: 'delegate',
        label: 'Loan Officer',
        description: 'Do you need to find a loan officer for financing this acquisition?',
        completed: false,
        actionText: 'Find Loan Officer',
      },
      {
        id: 't1_10',
        type: 'delegate',
        label: 'Home Inspector',
        description: 'Do you need to find a licensed home inspector to evaluate the property?',
        completed: false,
        actionText: 'Find Inspector',
      },
      {
        id: 't1_11',
        type: 'delegate',
        label: 'Appraiser',
        description: 'Do you need to find an appraiser to confirm property value before closing?',
        completed: false,
        actionText: 'Find Appraiser',
      },
      {
        id: 't1_12',
        type: 'delegate',
        label: 'Insurance Agent',
        description: 'Do you need to get insurance quotes (hazard, liability, builder\'s risk) before closing?',
        completed: false,
        actionText: 'Find Agent',
      },
    ],
    2: [
      // ── Financing: Secure Capital ──
      {
        id: 't2_1',
        type: 'question',
        label: 'Pre-Approval Secured',
        description: 'Have you secured pre-approval from your lender? Pre-approval before making offers demonstrates you\'re a serious buyer and lets you close quickly — a powerful negotiating tool.',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't2_2',
        type: 'delegate',
        label: 'Hard Money / Private Lender',
        description: 'Don\'t rely on a single funding source. Build relationships with multiple hard money lenders and private investors to compare terms and have backup options.',
        completed: false,
        actionText: 'Find Lender',
      },
      {
        id: 't2_3',
        type: 'upload',
        label: 'Loan Commitment Letter',
        description: 'Upload the lender\'s commitment letter confirming loan approval, rate, LTV, and draw schedule terms.',
        completed: false,
        actionText: 'Upload Letter',
      },
      // ── Budget Planning: Assign Every Dollar ──
      {
        id: 't2_4',
        type: 'question',
        label: 'Line-Item Budget Created',
        description: 'Have you built a line-item budget covering every cost? Include dumpster fees, portable toilets, utility bills, insurance premiums, and final cleaning — not just kitchens and baths.',
        completed: false,
        actionText: 'Review Budget',
      },
      {
        id: 't2_5',
        type: 'question',
        label: '15% Contingency Funded',
        description: 'Have you set aside 10-20% of your repair costs as a contingency fund? This covers hidden foundation cracks, rotted subfloors, and unexpected plumbing — not upgrades.',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't2_6',
        type: 'question',
        label: 'Daily Burn Rate Calculated',
        description: 'Do you know your daily holding cost? Once the loan closes, every day has a dollar amount. If holding costs are $3,000/mo, your burn rate is $100/day. This creates urgency.',
        completed: false,
        actionText: 'View Burn Rate',
      },
      // ── Closing Documents ──
      {
        id: 't2_7',
        type: 'upload',
        label: 'Purchase Agreement',
        description: 'Upload the executed purchase & sale agreement. This is your binding contract.',
        completed: false,
        actionText: 'Upload Contract',
      },
      {
        id: 't2_8',
        type: 'upload',
        label: 'Closing Disclosures',
        description: 'Upload the lender\'s closing disclosure (CD) and HUD-1 settlement statement.',
        completed: false,
        actionText: 'Upload CD',
      },
      {
        id: 't2_9',
        type: 'upload',
        label: 'Proof of Insurance',
        description: 'Upload your hazard insurance binder. Required before closing and draw disbursement.',
        completed: false,
        actionText: 'Upload Binder',
      },
      // ── Verification ──
      {
        id: 't2_10',
        type: 'question',
        label: 'EMD Delivered',
        description: 'Has the earnest money deposit been delivered to escrow and confirmed received?',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't2_11',
        type: 'question',
        label: 'Title Clear to Close',
        description: 'Has the title company confirmed clear title with no unresolved liens or encumbrances?',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't2_12',
        type: 'delegate',
        label: 'Real Estate Attorney',
        description: 'Do you need to find a real estate attorney to handle closing and title work?',
        completed: false,
        actionText: 'Find Attorney',
      },
    ],
    3: [
      // ── Renovation Scope & Design ──
      {
        id: 't3_1',
        type: 'upload',
        label: 'Design Scope Document',
        description: 'Upload your renovation scope document with room-by-room design specifications. A detailed plan is non-negotiable — every dollar must map to a specific task that increases resale value.',
        completed: false,
        actionText: 'Upload Design Scope',
      },
      {
        id: 't3_2',
        type: 'question',
        label: '"Money Rooms" Budget Allocated',
        description: 'Have you allocated 50-60% of your rehab budget to kitchen and bathroom renovations? These are the rooms that sell houses. Skimping here and splurging elsewhere destroys ROI.',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't3_3',
        type: 'question',
        label: 'Curb Appeal Scope Defined',
        description: 'Front door, exterior paint, landscaping, house numbers, clean porch — have you defined and budgeted your curb appeal upgrades? First impression costs little but dramatically increases buyer interest.',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't3_4',
        type: 'question',
        label: 'Neutral Palette Confirmed',
        description: 'Are you using neutral colors (greys, beiges, off-whites) for walls and permanent fixtures? Bold colors narrow your buyer pool. Introduce trendy color only through staging items.',
        completed: false,
        actionText: 'Confirm',
      },
      // ── Rehab Management ──
      {
        id: 't3_5',
        type: 'delegate',
        label: 'General Contractor',
        description: 'Do you need to find a GC for the renovation work? Get at least 3 bids before selecting.',
        completed: false,
        actionText: 'Find GC',
      },
      {
        id: 't3_6',
        type: 'upload',
        label: 'Contractor Bid Comparison',
        description: 'Upload at least 3 contractor bids to compare pricing, timelines, and scope before selecting your GC. Never hire the first bid.',
        completed: false,
        actionText: 'Upload Bids',
      },
      {
        id: 't3_7',
        type: 'upload',
        label: 'Building Permits',
        description: 'Upload approved city/county permits for the renovation scope. Unpermitted work kills deals at resale.',
        completed: false,
        actionText: 'Upload Permits',
      },
      {
        id: 't3_8',
        type: 'upload',
        label: 'Scope of Work (SOW)',
        description: 'Upload the signed scope of work with your GC — line-item breakdown of all rehab tasks with dollar amounts and completion dates.',
        completed: false,
        actionText: 'Upload SOW',
      },
      // ── Budget Discipline ──
      {
        id: 't3_9',
        type: 'question',
        label: 'Over-Improvement Check',
        description: 'Is your total renovation spend under 30% of your ARV? If every home in the neighborhood has laminate countertops, installing high-end marble won\'t provide a return. Match the standard of the area.',
        completed: false,
        actionText: 'Review',
      },
      {
        id: 't3_10',
        type: 'question',
        label: 'Rehab Budget vs. Actual',
        description: 'Is actual spending tracking within 10% of your projected rehab budget? Review the cost ledger. Overruns compound with holding costs.',
        completed: false,
        actionText: 'Review',
      },
      {
        id: 't3_11',
        type: 'question',
        label: 'Timeline Check',
        description: 'Is the rehab on schedule? Every extra day increases holding costs (insurance, taxes, loan interest). Check your daily burn rate.',
        completed: false,
        actionText: 'Review',
      },
      {
        id: 't3_12',
        type: 'question',
        label: 'Holding Costs Current',
        description: 'Are all holding costs (utilities, insurance, taxes, loan payments) being tracked? These are the costs most REIs miss — and they\'re bleeding money every day.',
        completed: false,
        actionText: 'Confirm',
      },
      // ── Completion & Transition ──
      {
        id: 't3_13',
        type: 'upload',
        label: 'Final Inspection Report',
        description: 'Upload the final city inspection or certificate of occupancy once rehab is complete.',
        completed: false,
        actionText: 'Upload Report',
      },
      {
        id: 't3_14',
        type: 'delegate',
        label: 'Property Manager',
        description: 'If holding as a rental, do you need to find a property manager before tenants move in?',
        completed: false,
        actionText: 'Find PM',
      },
    ],
    4: [
      // ── Exit Preparation ──
      {
        id: 't4_1',
        type: 'delegate',
        label: 'Listing Agent',
        description: 'Do you need to find a listing agent to market and sell the property?',
        completed: false,
        actionText: 'Find Agent',
      },
      {
        id: 't4_2',
        type: 'upload',
        label: 'Professional Photos & Media',
        description: 'Upload professional listing photos and video walkthrough for MLS and marketing.',
        completed: false,
        actionText: 'Upload Media',
      },
      {
        id: 't4_3',
        type: 'question',
        label: 'Listing Price Set',
        description: 'Have you set the listing price based on updated comps and your target ROI? Compare against your original ARV.',
        completed: false,
        actionText: 'Confirm',
      },
      {
        id: 't4_4',
        type: 'question',
        label: 'Final P&L Reviewed',
        description: 'Have you reviewed the final Profit & Loss including all acquisition, rehab, holding, and selling costs?',
        completed: false,
        actionText: 'Review',
      },
      {
        id: 't4_5',
        type: 'upload',
        label: 'Settlement Statement (HUD-1)',
        description: 'Upload the final closing settlement statement from the sale.',
        completed: false,
        actionText: 'Upload HUD-1',
      },
      {
        id: 't4_6',
        type: 'question',
        label: 'Tax Documents Generated',
        description: 'Have your quarterly and/or yearly tax documents been generated from this project\'s earnings?',
        completed: false,
        actionText: 'Generate',
      },
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
