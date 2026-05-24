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
        className="fixed bottom-6 right-6 z-50 w-full max-w-sm border border-pw-black bg-[#0d0d0d] text-white p-5 shadow-2xl rounded-none font-sans"
      >
        <button
          onClick={dismissOnboardingPrompt}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/10 rounded-none shrink-0 text-white">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Complete Your Profile
            </h4>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              Nice work on {actionExplanation}! Complete your profile setup to unlock full features, team assignments, and automated notifications.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            onClick={dismissOnboardingPrompt}
            className="px-3 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
          >
            Remind Me Later
          </button>
          <Link
            href="/dashboard/settings/profile"
            onClick={dismissOnboardingPrompt}
            className="px-4 py-2 text-xs font-bold bg-white text-black hover:bg-gray-100 transition-colors uppercase tracking-widest text-center"
          >
            Complete Setup
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
