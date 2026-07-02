'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Search, Building2, History, Briefcase, ArrowRight, Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Phase A — Orient: Intent Selection
   
   "What brings you to PaperWorking today?"
   
   Stores onboardingIntent on the user record, then
   routes to the wizard with a pre-selected starting phase.
   ═══════════════════════════════════════════════════════ */

type Intent = 'first_investment' | 'own_properties' | 'past_deals' | 're_professional';

interface IntentOption {
  id: Intent;
  icon: React.ReactNode;
  title: string;
  description: string;
  phase: number | null; // null = external redirect
  route: string;
  accentColor: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'first_investment',
    icon: <Search className="w-6 h-6" />,
    title: 'Evaluating my first investment property',
    description: 'Find and evaluate deals with guided analysis tools.',
    phase: 1,
    route: '/onboarding/wizard',
    accentColor: '#D4A843', // gold — Acquisition
  },
  {
    id: 'own_properties',
    icon: <Building2 className="w-6 h-6" />,
    title: 'I already own properties',
    description: 'Track cash flow, NOI, and manage your active portfolio.',
    phase: 3,
    route: '/dashboard/projects?wizard=true&phase=3',
    accentColor: '#3f7d20', // green — Hold
  },
  {
    id: 'past_deals',
    icon: <History className="w-6 h-6" />,
    title: 'Entering past deals',
    description: 'Log completed investments and build your track record.',
    phase: 4,
    route: '/dashboard/projects?wizard=true&phase=4',
    accentColor: '#454955', // brand secondary — Exit
  },
  {
    id: 're_professional',
    icon: <Briefcase className="w-6 h-6" />,
    title: "I'm a real estate professional",
    description: 'Contractor, agent, or vendor? Manage bids and projects.',
    phase: null,
    route: '/for-pros/',
    accentColor: '#60A5FA', // blue
  },
];

export default function OnboardingIntentPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSelect = async (option: IntentOption) => {
    if (!user || isNavigating) return;

    setSelectedIntent(option.id);
    setIsNavigating(true);

    try {
      // Store intent on user profile
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        onboardingIntent: option.id,
        onboardingPhase: option.phase,
        onboardingIntentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Fire the event (best-effort)
      user.getIdToken().then((idToken: string) => {
        fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            event: 'onboarding_intent_selected',
            properties: { intent: option.id, phase: option.phase },
          }),
        }).catch(() => {});
      }).catch(() => {});

      // Navigate
      router.push(option.route);
    } catch (err) {
      console.error('[OnboardingIntent] Failed to store intent:', err);
      setIsNavigating(false);
      // Navigate anyway — intent can be captured later
      router.push(option.route);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setIsNavigating(true);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        onboardingIntent: 'first_investment',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Fire the event (best-effort)
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            event: 'onboarding_intent_selected',
            properties: { intent: 'first_investment', phase: 1 },
          }),
        });
      } catch (e) {
        // Non-fatal
      }
    } catch {
      // Non-fatal
    }

    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#454955] animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Header ── */}
      <div className="text-center space-y-4">
        <h1 className="text-[32px] leading-[40px] md:text-[40px] md:leading-[48px] font-bold text-white tracking-tight">
          What brings you to PaperWorking today?
        </h1>
        <p className="text-[16px] leading-[24px] text-[#9E9DA0] max-w-md mx-auto">
          We'll tailor your workspace to match your investing journey.
        </p>
      </div>

      {/* ── Intent Cards ── */}
      <div className="space-y-4">
        {INTENT_OPTIONS.map((option) => {
          const isSelected = selectedIntent === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isNavigating}
              onClick={() => handleSelect(option)}
              className={`
                w-full flex items-center gap-5 p-6 rounded-xl text-left
                focus:outline-none group transition-all duration-300
                border
                ${isSelected
                  ? 'border-white/20 bg-white/5'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                }
                ${isNavigating && !isSelected ? 'opacity-40 pointer-events-none' : ''}
              `}
              style={{
                background: isSelected
                  ? `rgba(${hexToRgb(option.accentColor)}, 0.06)`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                backdropFilter: 'blur(20px)',
                ...(isSelected ? {
                  borderColor: `${option.accentColor}66`,
                  boxShadow: `0 0 30px -10px ${option.accentColor}40`,
                } : {}),
              }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                style={{
                  backgroundColor: `rgba(${hexToRgb(option.accentColor)}, 0.12)`,
                  color: option.accentColor,
                }}
              >
                {isSelected && isNavigating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  option.icon
                )}
              </div>

              {/* Content */}
              <div className="flex-grow min-w-0">
                <h3
                  className="text-[16px] leading-[24px] font-semibold tracking-tight transition-colors"
                  style={{ color: isSelected ? option.accentColor : '#9E9DA0' }}
                >
                  {option.title}
                </h3>
                <p className="text-[14px] leading-[20px] text-[#9E9DA0] opacity-80 mt-1">
                  {option.description}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight
                className="w-5 h-5 shrink-0 transition-all duration-300 opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0"
                style={{ color: option.accentColor }}
              />
            </button>
          );
        })}
      </div>

      {/* ── Skip Link ── */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleSkip}
          disabled={isNavigating}
          className="text-[13px] text-[#9E9DA0]/60 hover:text-[#9E9DA0] transition-colors underline-offset-4 hover:underline disabled:opacity-40"
        >
          Skip for now — take me to the dashboard
        </button>
      </div>
    </div>
  );
}

/** Convert hex color to RGB string for rgba() usage */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
