'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export function OnboardingPromptBanner() {
  const { lastSuccessfulAction, showOnboardingPrompt, dismissOnboardingPrompt } = useUIStore();
  const { profile } = useAuth();

  // Check if profile is incomplete
  const isProfileIncomplete = profile && (!profile.onboardingCompleted || !profile.phone || !profile.companyName);

  if (!showOnboardingPrompt || !isProfileIncomplete || !lastSuccessfulAction) {
    return null;
  }

  // Map the action to human-readable explanation
  let actionExplanation = '';
  switch (lastSuccessfulAction) {
    case 'project_created':
      actionExplanation = 'successfully creating your project';
      break;
    case 'task_completed':
      actionExplanation = 'completing your task';
      break;
    case 'document_uploaded':
      actionExplanation = 'uploading your document';
      break;
    case 'bid_approved':
      actionExplanation = 'approving a contractor bid';
      break;
    default:
      actionExplanation = 'your recent action';
  }

  return (
    <AnimatePresence key="onboarding-prompt">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-6 right-6 z-50 w-full max-w-sm border border-[var(--pw-border)] bg-[var(--pw-glass-bg)] backdrop-blur-xl text-[var(--color-on-surface)] p-5 shadow-2xl rounded-[var(--radius-lg)] font-sans"
      >
        <button
          onClick={dismissOnboardingPrompt}
          className="absolute top-4 right-4 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
          aria-label="Dismiss prompt"
        >
          <X className="w-4 h-4" />
        </button>
 
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[var(--color-surface-container-high)] rounded-md shrink-0">
            <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface)]">
              Complete Your Profile
            </h4>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-2 leading-relaxed">
              Nice work on {actionExplanation}! Complete your profile setup to unlock full features, team assignments, and automated notifications.
            </p>
          </div>
        </div>
 
        <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-[var(--pw-border)]">
          <button
            onClick={dismissOnboardingPrompt}
            className="px-3 py-2 text-xs font-bold text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors uppercase tracking-widest"
          >
            Remind Me Later
          </button>
          <Link
            href="/dashboard/settings/profile"
            onClick={dismissOnboardingPrompt}
            className="px-4 py-2 text-xs font-bold bg-[var(--pw-btn-primary-bg)] text-[var(--pw-btn-primary-text)] hover:opacity-90 transition-opacity rounded-full uppercase tracking-widest text-center"
          >
            Complete Setup
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
