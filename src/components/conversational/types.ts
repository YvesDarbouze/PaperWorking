/**
 * Conversational Form Engine — Type Definitions
 *
 * A schema-driven question definition system. Each QuestionDef describes
 * a single step in the sequential form. The engine renders them one at a
 * time with animated transitions.
 */

// ── Supported question input types ──────────────────────────────────────────

export type QuestionInputType =
  | 'currency'   // Dollar amount → emits cents (number)
  | 'percent'    // Percentage    → emits raw float (e.g. 8.5 = 8.5%)
  | 'integer'    // Whole number  → emits integer
  | 'select'     // Dropdown / pill selector
  | 'info';      // Read-only display step (derived KPI, no input)

// ── Select option ────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

// ── Union question definition ────────────────────────────────────────────────

interface QuestionBase {
  /** Unique key — maps to the FormAnswers record key */
  key: string;
  /** Displayed as the large heading */
  question: string;
  /** Smaller subtext beneath the heading */
  hint?: string;
  /** If true, the user may skip this step */
  optional?: boolean;
}

export interface CurrencyQuestion extends QuestionBase {
  type: 'currency';
  placeholder?: string;
}

export interface PercentQuestion extends QuestionBase {
  type: 'percent';
  placeholder?: string;
  /** Decimal precision to display (default 2) */
  precision?: number;
}

export interface IntegerQuestion extends QuestionBase {
  type: 'integer';
  unit?: string;          // e.g. "months", "points"
  placeholder?: string;
}

export interface SelectQuestion extends QuestionBase {
  type: 'select';
  options: SelectOption[];
}

export interface InfoQuestion extends QuestionBase {
  type: 'info';
  /** A render function that receives current answers and returns a display value */
  renderValue: (answers: Partial<FormAnswers>) => string;
  valueLabel?: string;
}

export type QuestionDef =
  | CurrencyQuestion
  | PercentQuestion
  | IntegerQuestion
  | SelectQuestion
  | InfoQuestion;

// ── Form answers record ───────────────────────────────────────────────────────
// Keys match QuestionDef.key values. Values are always number | string | undefined.

export type FormAnswers = Record<string, number | string | undefined>;

// ── Transition direction ──────────────────────────────────────────────────────

export type SlideDirection = 'forward' | 'backward' | 'idle';
