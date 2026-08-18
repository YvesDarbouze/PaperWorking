'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  INITIAL_QUESTION_TREE,
  WizardNode,
  getNextQuestionId,
  validateAnswer,
  calculateWizardProgress,
  REIPhase,
} from '@/lib/wizard-engine';
import { ArrowLeft, ArrowRight, CheckCircle, Upload, X, AlertCircle, Loader2 } from 'lucide-react';

interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

const PHASE_BG_COLORS: Record<string, string> = {
  acquisition: 'bg-[#1a3a5c]',
  purchase: 'bg-[#2d5a3d]',
  hold: 'bg-[#8b6914]',
  exit: 'bg-[#5c1a1a]',
  default: 'bg-[#0f172a]',
};

export default function ProjectWizardModal({ isOpen, onClose, onSuccess }: ProjectWizardModalProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, any>>({
    phase: 'acquisition',
  });
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('Q1');
  const [history, setHistory] = useState<string[]>(['Q1']);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; url: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync background color with selected phase
  const currentPhase: REIPhase = (answers.phase as REIPhase) || 'acquisition';
  const bgColorClass = PHASE_BG_COLORS[currentPhase] || PHASE_BG_COLORS.default;

  const currentNode = INITIAL_QUESTION_TREE.find(n => n.question_id === currentQuestionId) || INITIAL_QUESTION_TREE[0];
  const progress = calculateWizardProgress(currentQuestionId, answers);

  const handleInputChange = (value: any) => {
    setValidationError(null);
    setAnswers(prev => ({
      ...prev,
      [currentNode.question_id]: value,
      // Map Q1 phase to answers.phase for condition evaluator
      ...(currentNode.question_id === 'Q1' ? { phase: value } : {}),
      ...(currentNode.question_id === 'Q2' ? { property_address: value, propertyName: value } : {}),
      ...(currentNode.question_id === 'Q3' ? { date_of_sale: value } : {}),
      ...(currentNode.question_id === 'Q4' ? { entity_type: value } : {}),
      ...(currentNode.question_id === 'Q5' ? { purchase_price: Number(value) } : {}),
      ...(currentNode.question_id === 'Q6' ? { rehab_budget: Number(value) } : {}),
      ...(currentNode.question_id === 'Q7' ? { exit_strategy: value } : {}),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // Check 0.5GB (500MB) single file limit check
    if (file.size > 536870912) {
      setValidationError('File exceeds account storage limit (0.5 GB max).');
      return;
    }

    const fileObj = {
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    };

    setUploadedFiles(prev => [...prev, fileObj]);
    handleInputChange(file.name);
  };

  const handleNext = () => {
    const currentVal = answers[currentNode.question_id];
    const validation = validateAnswer(currentNode, currentVal);

    if (!validation.valid) {
      setValidationError(validation.error || 'Please answer this question to proceed.');
      return;
    }

    const nextId = getNextQuestionId(currentQuestionId, answers);

    if (!nextId) {
      // Reached end of wizard flow -> Submit
      handleSubmit();
    } else {
      setHistory(prev => [...prev, nextId]);
      setCurrentQuestionId(nextId);
      setValidationError(null);
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // remove current
      const prevId = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentQuestionId(prevId);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setValidationError(null);

    try {
      const payload = {
        property_address: answers.property_address || answers.Q2 || '100 Main St, Austin, TX',
        propertyName: answers.property_address || answers.Q2 || '100 Main St, Austin, TX',
        phase: answers.phase || 'acquisition',
        date_of_sale: answers.date_of_sale || answers.Q3 || null,
        entity_type: answers.entity_type || answers.Q4 || 'Sole Proprietor',
        purchase_price: answers.purchase_price ? Number(answers.purchase_price) : null,
        rehab_budget: answers.rehab_budget ? Number(answers.rehab_budget) : null,
        exit_strategy: answers.exit_strategy || answers.Q7 || 'Flip',
        answers,
        documents: uploadedFiles.map(f => ({
          doc_id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'Uploaded Document',
          url: f.url,
          name: f.name,
          size_bytes: f.size,
          generated_at: new Date().toISOString(),
        })),
      };

      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      const projectId = data.projectId || data.project_id;
      if (onSuccess) onSuccess(projectId);
      onClose();
      router.push(`/project/${projectId}`);
    } catch (err: any) {
      setValidationError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="project-wizard-overlay"
      className={`fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-12 transition-colors duration-700 ease-in-out text-white ${bgColorClass}`}
    >
      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-white">PaperWorking</span>
          <span className="text-xs uppercase tracking-wider px-2.5 py-1 rounded bg-white/10 font-semibold border border-white/20">
            {currentPhase} Phase
          </span>
        </div>

        <button
          onClick={onClose}
          data-testid="close-wizard-btn"
          className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
          aria-label="Close Wizard"
        >
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* Progress Bar Component */}
      <div className="max-w-3xl mx-auto w-full my-4">
        <div className="flex justify-between items-center text-xs font-semibold uppercase text-slate-300 mb-2">
          <span>Step {progress.step} of {progress.totalSteps}</span>
          <span>{progress.percent}% Complete</span>
        </div>
        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full bg-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Conversational TurboTax-Style Content Area */}
      <main className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center py-6 space-y-6">
        <div className="space-y-2">
          <h2 data-testid="wizard-question-text" className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
            {currentNode.question_text}
          </h2>
          {currentNode.description && (
            <p className="text-sm sm:text-base text-slate-300">{currentNode.description}</p>
          )}
        </div>

        {/* Dynamic Inputs */}
        <div className="space-y-4">
          {currentNode.input_type === 'select' && currentNode.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="select-input-group">
              {currentNode.options.map(opt => {
                const isSelected = answers[currentNode.question_id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleInputChange(opt.value)}
                    data-testid={`option-${opt.value}`}
                    className={`p-4 text-left rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-white text-slate-900 border-white font-semibold shadow-lg'
                        : 'bg-black/30 text-white border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          )}

          {currentNode.input_type === 'text' && (
            <input
              type="text"
              data-testid="text-input"
              value={answers[currentNode.question_id] || ''}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 rounded-xl bg-black/40 border border-white/20 text-white text-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            />
          )}

          {currentNode.input_type === 'number' && (
            <div className="relative">
              <span className="absolute left-4 top-4 text-slate-400 text-lg">$</span>
              <input
                type="number"
                data-testid="number-input"
                value={answers[currentNode.question_id] ?? ''}
                onChange={e => handleInputChange(e.target.value)}
                placeholder="0"
                className="w-full p-4 pl-10 rounded-xl bg-black/40 border border-white/20 text-white text-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
            </div>
          )}

          {currentNode.input_type === 'date' && (
            <input
              type="date"
              data-testid="date-input"
              value={answers[currentNode.question_id] || ''}
              onChange={e => handleInputChange(e.target.value)}
              className="w-full p-4 rounded-xl bg-black/40 border border-white/20 text-white text-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            />
          )}

          {currentNode.input_type === 'file' && (
            <div className="space-y-4">
              <label
                htmlFor="file-upload-input"
                data-testid="file-upload-dropzone"
                className="cursor-pointer border-2 border-dashed border-white/30 hover:border-emerald-400 rounded-xl p-8 flex flex-col items-center justify-center bg-black/20 transition text-center"
              >
                <Upload className="w-10 h-10 text-emerald-400 mb-2" />
                <span className="font-semibold text-white">Click to upload documents</span>
                <span className="text-xs text-slate-300 mt-1">PDF, DOCX, PNG (Max account storage quota: 0.5 GB)</span>
                <input
                  id="file-upload-input"
                  data-testid="file-input"
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Attached Files:</span>
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/10 border border-white/10 text-sm">
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-slate-300">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Validation Error Message */}
          {validationError && (
            <div data-testid="wizard-error-banner" className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="max-w-3xl mx-auto w-full pt-4 border-t border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={history.length <= 1 || isSubmitting}
          data-testid="wizard-back-btn"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          data-testid="wizard-next-btn"
          className="flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Project...</span>
            </>
          ) : progress.step === progress.totalSteps ? (
            <>
              <span>Complete & Create Project</span>
              <CheckCircle className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Save & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
