'use client';

import { useState } from 'react';
import { Question, Plus, PaperPlaneRight } from '@phosphor-icons/react';
import type { ProjectCheckInQuestion } from '@/lib/projects/types';

export default function ProjectCheckInsView({
  projectId,
  checkIns,
  onRefresh,
}: {
  projectId: string;
  checkIns: ProjectCheckInQuestion[];
  onRefresh: () => void;
}) {
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(
    checkIns[0]?.id || null,
  );
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newFreq, setNewFreq] = useState<'daily' | 'weekly' | 'biweekly'>('weekly');

  const selectedQuestion = checkIns.find((q) => q.id === activeQuestionId);

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!activeQuestionId || !answerText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: activeQuestionId,
          answer: answerText,
        }),
      });
      if (res.ok) {
        setAnswerText('');
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newPrompt.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPrompt,
          frequency: newFreq,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewPrompt('');
        setIsAddingQuestion(false);
        if (data.question) {
          setActiveQuestionId(data.question.id);
        }
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Question size={20} className="text-foreground shrink-0" />
            <h3 className="text-base font-semibold text-foreground tracking-tight">Automatic Check-ins</h3>
            <span className="text-xs font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
              {checkIns.length} {checkIns.length === 1 ? 'Prompt' : 'Prompts'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated recurring questions sent to keep the team and contractor accountable.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingQuestion(!isAddingQuestion)}
          className="inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition min-h-[44px]"
        >
          <Plus size={16} />
          <span>{isAddingQuestion ? 'Cancel' : 'New Check-in'}</span>
        </button>
      </div>

      {/* Add New Check-in Prompt Form */}
      {isAddingQuestion && (
        <form onSubmit={handleCreateQuestion} className="rounded-none border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Add a Recurring Check-in Question</h4>
          <div>
            <label className="block text-xs text-foreground font-medium mb-1">Question Prompt</label>
            <input
              type="text"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="e.g. What permits or inspections cleared this week?"
              className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              required
            />
          </div>
          <div className="w-full sm:w-1/3">
            <label className="block text-xs text-foreground font-medium mb-1">Frequency</label>
            <select
              value={newFreq}
              onChange={(e) => setNewFreq(e.target.value as any)}
              className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
            >
              <option value="daily">Every Business Day</option>
              <option value="weekly">Weekly on Friday</option>
              <option value="biweekly">Bi-weekly</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingQuestion(false)}
              className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-none bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px]"
            >
              {submitting ? 'Saving...' : 'Create Question'}
            </button>
          </div>
        </form>
      )}

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {checkIns.map((q) => {
          const isSelected = q.id === activeQuestionId;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setActiveQuestionId(q.id)}
              className={`rounded-none px-3.5 py-2 text-xs font-medium border whitespace-nowrap transition min-h-[44px] ${
                isSelected
                  ? 'border-foreground bg-muted text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>{q.prompt.length > 35 ? `${q.prompt.slice(0, 35)}…` : q.prompt}</span>
              <span className="ml-2 font-mono text-[10px] text-muted-foreground">({q.responses?.length || 0})</span>
            </button>
          );
        })}
      </div>

      {/* Active Question Responses Feed */}
      {selectedQuestion ? (
        <div className="rounded-none border border-border bg-card p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase rounded-none border border-border px-2 py-0.5 bg-muted/40 text-foreground">
                {selectedQuestion.frequency}
              </span>
              <h4 className="text-sm font-semibold text-foreground tracking-tight">{selectedQuestion.prompt}</h4>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assigned to: {selectedQuestion.assignedRoles.join(', ')}
            </p>
          </div>

          {/* Submission Input Box */}
          <form onSubmit={handleSubmitAnswer} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Submit your answer to this check-in..."
              className="flex-1 rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
            />
            <button
              type="submit"
              disabled={submitting || !answerText.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-none bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px] disabled:opacity-40"
            >
              <PaperPlaneRight size={14} />
              <span>Submit Answer</span>
            </button>
          </form>

          {/* Past Responses Log */}
          <div className="space-y-2.5 pt-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Answers & Status History ({selectedQuestion.responses?.length || 0})
            </h5>
            {selectedQuestion.responses && selectedQuestion.responses.length > 0 ? (
              selectedQuestion.responses.map((resp) => (
                <div key={resp.id} className="rounded-none border border-border/70 bg-muted/20 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="font-medium text-foreground">
                      {resp.responderName} <span className="font-normal font-mono text-muted-foreground">({resp.responderRole})</span>
                    </span>
                    <span className="font-mono text-[10px]">{new Date(resp.submittedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{resp.answer}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">No responses logged yet for this question.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-muted-foreground rounded-none border border-border bg-card">Select or create a check-in question above.</div>
      )}
    </div>
  );
}
