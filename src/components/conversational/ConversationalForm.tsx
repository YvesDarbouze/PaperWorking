'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useId,
} from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, ChevronDown } from 'lucide-react';
import ConvCurrencyInput from './ConvCurrencyInput';
import type {
  QuestionDef,
  FormAnswers,
  SlideDirection,
  SelectOption,
} from './types';

/* ═══════════════════════════════════════════════════════════════
   ConversationalForm — Sequential Question Engine

   Renders one question at a time with horizontal slide transitions.
   Schema-driven: accepts any array of QuestionDef objects.

   Data flow:
     • Each answer is stored in `answers` state (key → value map)
     • On Next: validates → calls onStepSave(partialAnswers) → advances
     • On final step Next: calls onComplete(allAnswers)
     • Enter key = Next, Escape = Back (when not on step 0)

   Used in Phase 1 (and future phases) to replace static form grids.
   ═══════════════════════════════════════════════════════════════ */

// ── Animation duration (ms) ──────────────────────────────────────────────────
const TRANSITION_MS = 220;

// ── Slide keyframe helpers (inline style approach — no Tailwind needed) ───────
function getSlideStyle(
  direction: SlideDirection,
  phase: 'enter' | 'active' | 'exit',
): React.CSSProperties {
  // "enter" = the incoming slide starting position
  // "active" = the resting, fully-visible position
  // "exit"  = the outgoing slide ending position

  if (direction === 'idle') {
    return { opacity: 1, transform: 'translateX(0)' };
  }

  const exitX  = direction === 'forward' ? '-64px' : '64px';
  const enterX = direction === 'forward' ? '64px'  : '-64px';

  if (phase === 'enter')  return { opacity: 0, transform: `translateX(${enterX})` };
  if (phase === 'active') return { opacity: 1, transform: 'translateX(0)' };
  if (phase === 'exit')   return { opacity: 0, transform: `translateX(${exitX})` };
  return {};
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface ConversationalFormProps {
  questions:       QuestionDef[];
  initialAnswers?: Partial<FormAnswers>;
  phaseColor:      string;
  readOnly?:       boolean;
  /** Called on each Next step — persist partial state to Firestore */
  onStepSave?:     (answers: Partial<FormAnswers>) => Promise<void>;
  /** Called when the user completes the final step */
  onComplete?:     (answers: FormAnswers) => void;
}

// ── Select Input component (inline) ──────────────────────────────────────────
function ConvSelectInput({
  options,
  value,
  onChange,
  phaseColor,
  readOnly,
}: {
  options:    SelectOption[];
  value:      string | undefined;
  onChange:   (v: string) => void;
  phaseColor: string;
  readOnly?:  boolean;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '8px' }}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(opt.value)}
            style={{
              padding:       '14px 28px',
              borderRadius:  '100px',
              border:        `2px solid ${selected ? phaseColor : 'var(--border-ui)'}`,
              background:    selected ? phaseColor : 'var(--bg-surface)',
              color:         selected ? '#FFFFFF' : 'var(--text-primary)',
              fontSize:      '15px',
              fontWeight:    700,
              letterSpacing: '0.02em',
              cursor:        readOnly ? 'not-allowed' : 'pointer',
              transition:    `all ${TRANSITION_MS}ms ease`,
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           '4px',
            }}
          >
            {opt.label}
            {opt.description && (
              <span
                style={{
                  fontSize:   '11px',
                  fontWeight: 400,
                  opacity:    0.7,
                }}
              >
                {opt.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Number/Percent input component (inline) ────────────────────────────────
function ConvNumberInput({
  value,
  onChange,
  phaseColor,
  unit,
  placeholder,
  readOnly,
  precision = 0,
}: {
  value:       number | undefined;
  onChange:    (v: number) => void;
  phaseColor:  string;
  unit?:       string;
  placeholder?: string;
  readOnly?:   boolean;
  precision?:  number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId  = useId();

  const [display, setDisplay] = useState(
    value !== undefined && value !== 0 ? String(value) : '',
  );

  useEffect(() => {
    setDisplay(value !== undefined && value !== 0 ? String(value) : '');
  }, [value]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 180);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setDisplay(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) onChange(parsed);
    else if (raw === '' || raw === '.') onChange(0);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', maxWidth: '420px' }}>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={placeholder ?? '0'}
        autoComplete="off"
        style={{
          flex:            1,
          fontSize:        '52px',
          fontWeight:      800,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing:   '-0.02em',
          lineHeight:      1,
          color:           readOnly ? phaseColor : 'var(--text-primary)',
          background:      'transparent',
          border:          'none',
          borderBottom:    `2px solid ${phaseColor}`,
          outline:         'none',
          padding:         '0 0 8px 0',
          caretColor:      phaseColor,
          cursor:          readOnly ? 'not-allowed' : 'text',
        }}
        aria-label={unit}
      />
      {unit && (
        <span
          style={{
            fontSize:   '22px',
            fontWeight: 600,
            color:      'var(--text-secondary)',
            opacity:    0.5,
            whiteSpace: 'nowrap',
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

// ── Main ConversationalForm component ─────────────────────────────────────────
export default function ConversationalForm({
  questions,
  initialAnswers = {},
  phaseColor,
  readOnly = false,
  onStepSave,
  onComplete,
}: ConversationalFormProps) {
  const [step, setStep]         = useState(0);
  const [answers, setAnswers]   = useState<Partial<FormAnswers>>(initialAnswers);
  const [direction, setDirection] = useState<SlideDirection>('idle');
  const [visible, setVisible]   = useState(true); // drives enter/exit phase
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [completed, setCompleted] = useState(false);

  const total   = questions.length;
  const current = questions[step];
  const isLast  = step === total - 1;
  const isFirst = step === 0;

  // ── Get/set answer for the current question ────────────────────────────────
  const currentValue = answers[current.key];

  const setCurrentValue = useCallback(
    (val: number | string | undefined) => {
      setAnswers((prev) => ({ ...prev, [current.key]: val }));
      setError('');
    },
    [current.key],
  );

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (current.optional) return true;
    if (current.type === 'info') return true;
    const val = currentValue;
    if (val === undefined || val === '' || val === 0) {
      if (!current.optional) {
        // Only warn — don't hard-block (optional path still open via "Skip")
        return true; // soft pass for now
      }
    }
    return true;
  };

  // ── Animated transition helper ─────────────────────────────────────────────
  const animateTo = useCallback(
    async (targetStep: number, dir: SlideDirection) => {
      setDirection(dir);
      setVisible(false);                          // exit current
      await new Promise((r) => setTimeout(r, TRANSITION_MS));
      setStep(targetStep);
      setVisible(true);                           // enter next
      await new Promise((r) => setTimeout(r, TRANSITION_MS));
      setDirection('idle');
    },
    [],
  );

  // ── Next ───────────────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (saving || readOnly) return;
    if (!validate()) return;

    // Persist the current partial state on each step
    if (onStepSave) {
      setSaving(true);
      try {
        await onStepSave({ ...answers });
      } catch {
        setError('Auto-save failed — please try again.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (isLast) {
      setCompleted(true);
      onComplete?.({ ...answers } as FormAnswers);
      return;
    }

    await animateTo(step + 1, 'forward');
  }, [saving, readOnly, validate, onStepSave, answers, isLast, animateTo, step, onComplete]);

  // ── Back ───────────────────────────────────────────────────────────────────
  const handleBack = useCallback(async () => {
    if (isFirst || saving) return;
    await animateTo(step - 1, 'backward');
  }, [isFirst, saving, animateTo, step]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Enter advances — but only if the target is not a textarea
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handleNext();
      }
      // Escape goes back
      if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, handleBack]);

  // ── Completed state ────────────────────────────────────────────────────────
  if (completed) {
    return (
      <div
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      '420px',
          gap:            '20px',
          padding:        '48px 32px',
          textAlign:      'center',
          animation:      `conv-fadein ${TRANSITION_MS * 2}ms ease`,
        }}
      >
        <div
          style={{
            width:          '64px',
            height:         '64px',
            borderRadius:   '50%',
            background:     `${phaseColor}18`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle2 size={28} color={phaseColor} strokeWidth={2} />
        </div>
        <div>
          <p
            style={{
              fontSize:   '22px',
              fontWeight: 800,
              color:      'var(--text-primary)',
              margin:     0,
            }}
          >
            Phase inputs complete
          </p>
          <p
            style={{
              fontSize:  '13px',
              color:     'var(--text-secondary)',
              marginTop: '8px',
            }}
          >
            Your deal data has been saved. Review below or advance to Phase 2.
          </p>
        </div>
      </div>
    );
  }

  // ── Slide style (current card) ─────────────────────────────────────────────
  const slideStyle: React.CSSProperties = {
    transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
    ...(visible
      ? getSlideStyle('idle', 'active')
      : getSlideStyle(direction, 'exit')),
  };

  // ── Dot progress indicators (max 10 dots, then collapse to counter) ────────
  const showDots = total <= 10;

  return (
    <>
      {/* ── Global keyframe for completed state fade-in ── */}
      <style>{`
        @keyframes conv-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          minHeight:     '520px',
          background:    'var(--bg-surface)',
          borderRadius:  '12px',
          border:        '1px solid var(--border-ui)',
          overflow:      'hidden',
          position:      'relative',
        }}
      >
        {/* ── Top accent bar ───────────────────────────────────────────── */}
        <div style={{ height: '3px', background: phaseColor, width: '100%' }} />

        {/* ── Phase label ──────────────────────────────────────────────── */}
        <div
          style={{
            padding:      '16px 32px 0',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize:      '10px',
              fontWeight:    700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         phaseColor,
              opacity:       0.7,
            }}
          >
            Deal Inputs
          </span>
          {saving && (
            <span
              style={{
                fontSize:  '10px',
                fontWeight: 600,
                color:     'var(--text-secondary)',
                opacity:   0.5,
              }}
            >
              Saving…
            </span>
          )}
        </div>

        {/* ── Animated question card ───────────────────────────────────── */}
        <div
          style={{
            flex:    1,
            padding: '32px 32px 24px',
            ...slideStyle,
          }}
        >
          {/* Question heading */}
          <p
            style={{
              fontSize:    '28px',
              fontWeight:  800,
              lineHeight:  1.25,
              color:       'var(--text-primary)',
              margin:      '0 0 8px 0',
              maxWidth:    '540px',
            }}
          >
            {current.question}
          </p>

          {/* Hint text */}
          {current.hint && (
            <p
              style={{
                fontSize:  '14px',
                color:     'var(--text-secondary)',
                margin:    '0 0 32px 0',
                lineHeight: 1.6,
                maxWidth:  '480px',
              }}
            >
              {current.hint}
            </p>
          )}
          {!current.hint && <div style={{ marginBottom: '32px' }} />}

          {/* ── Input switcher ── */}
          {current.type === 'currency' && (
            <ConvCurrencyInput
              label={current.question}
              value={(currentValue as number) ?? 0}
              onChange={(cents) => setCurrentValue(cents)}
              phaseColor={phaseColor}
              placeholder={current.placeholder}
              readOnly={readOnly}
            />
          )}

          {current.type === 'percent' && (
            <ConvNumberInput
              value={(currentValue as number) ?? undefined}
              onChange={(v) => setCurrentValue(v)}
              phaseColor={phaseColor}
              unit="%"
              placeholder={current.placeholder}
              readOnly={readOnly}
              precision={current.precision ?? 2}
            />
          )}

          {current.type === 'integer' && (
            <ConvNumberInput
              value={(currentValue as number) ?? undefined}
              onChange={(v) => setCurrentValue(Math.round(v))}
              phaseColor={phaseColor}
              unit={current.unit}
              placeholder={current.placeholder}
              readOnly={readOnly}
            />
          )}

          {current.type === 'select' && (
            <ConvSelectInput
              options={current.options}
              value={(currentValue as string) ?? undefined}
              onChange={(v) => setCurrentValue(v)}
              phaseColor={phaseColor}
              readOnly={readOnly}
            />
          )}

          {current.type === 'info' && (
            <p
              style={{
                fontSize:   '52px',
                fontWeight: 800,
                color:      phaseColor,
                lineHeight: 1,
                margin:     0,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {current.renderValue(answers)}
            </p>
          )}

          {/* Inline error */}
          {error && (
            <p
              style={{
                marginTop:  '12px',
                fontSize:   '12px',
                fontWeight: 600,
                color:      '#DC2626',
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* ── Footer bar: Back | Progress | Next ───────────────────────── */}
        <div
          style={{
            display:       'flex',
            alignItems:    'center',
            justifyContent: 'space-between',
            padding:       '16px 32px 24px',
            borderTop:     '1px solid var(--border-ui)',
            gap:           '16px',
          }}
        >
          {/* Back button */}
          <button
            type="button"
            onClick={handleBack}
            disabled={isFirst || saving}
            style={{
              display:     'flex',
              alignItems:  'center',
              gap:         '6px',
              padding:     '10px 20px',
              borderRadius: '8px',
              border:      '1px solid var(--border-ui)',
              background:  'transparent',
              color:       isFirst ? 'transparent' : 'var(--text-secondary)',
              fontSize:    '12px',
              fontWeight:  700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor:      isFirst ? 'default' : 'pointer',
              transition:  'all 150ms ease',
              pointerEvents: isFirst ? 'none' : 'auto',
            }}
            aria-label="Previous question"
          >
            <ArrowLeft size={13} strokeWidth={2.5} />
            Back
          </button>

          {/* Progress indicator */}
          <div
            style={{
              display:    'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap:        '8px',
              flex:       1,
            }}
          >
            {/* Dot indicators */}
            {showDots && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {questions.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width:        i === step ? '20px' : '7px',
                      height:       '7px',
                      borderRadius: '100px',
                      background:   i <= step ? phaseColor : 'var(--border-ui)',
                      transition:   `all ${TRANSITION_MS}ms ease`,
                      opacity:      i < step ? 0.4 : 1,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Counter label */}
            <span
              style={{
                fontSize:      '10px',
                fontWeight:    700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color:         'var(--text-secondary)',
                opacity:       0.5,
              }}
            >
              Question {step + 1} of {total}
            </span>
          </div>

          {/* Next / Finish button */}
          <button
            type="button"
            id={`conv-next-step-${step}`}
            onClick={handleNext}
            disabled={saving}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '8px',
              padding:      '10px 24px',
              borderRadius: '8px',
              border:       'none',
              background:   saving ? `${phaseColor}80` : phaseColor,
              color:        '#FFFFFF',
              fontSize:     '12px',
              fontWeight:   700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor:       saving ? 'not-allowed' : 'pointer',
              transition:   'all 150ms ease',
              whiteSpace:   'nowrap',
            }}
            aria-label={isLast ? 'Complete phase inputs' : 'Next question'}
          >
            {isLast ? 'Complete' : 'Next'}
            {!isLast && <ArrowRight size={13} strokeWidth={2.5} />}
            {isLast  && <CheckCircle2 size={13} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </>
  );
}
