import { INITIAL_QUESTION_TREE, WizardNode, ValidationRules } from './questionTree';

export * from './questionTree';

/**
 * Safely evaluates simple condition strings against accumulated answers.
 * Supported syntax:
 *   - `key === 'value'` or `key === "value"`
 *   - `key !== 'value'` or `key !== "value"`
 *   - `key > number` or `key < number`
 *   - `key === true` or `key === false`
 */
export function evaluateCondition(condition: string, answers: Record<string, any>): boolean {
  if (!condition || !condition.trim()) return true;

  const trimmed = condition.trim();

  // Handle || (OR) conditions
  if (trimmed.includes('||')) {
    const parts = trimmed.split('||');
    return parts.some(part => evaluateCondition(part, answers));
  }

  // Handle && (AND) conditions
  if (trimmed.includes('&&')) {
    const parts = trimmed.split('&&');
    return parts.every(part => evaluateCondition(part, answers));
  }

  // Equality: key === 'val' or key === "val"
  const eqMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*===\s*['"]?([^'"]+)['"]?$/);
  if (eqMatch) {
    const [, key, expectedRaw] = eqMatch;
    const actual = answers[key];
    const expected = expectedRaw.trim();

    if (expected === 'true') return actual === true || actual === 'true';
    if (expected === 'false') return actual === false || actual === 'false';
    return String(actual ?? '').toLowerCase() === expected.toLowerCase();
  }

  // Inequality: key !== 'val'
  const neqMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*!==\s*['"]?([^'"]+)['"]?$/);
  if (neqMatch) {
    const [, key, expectedRaw] = neqMatch;
    const actual = answers[key];
    const expected = expectedRaw.trim();

    if (expected === 'true') return actual !== true && actual !== 'true';
    if (expected === 'false') return actual !== false && actual !== 'false';
    return String(actual ?? '').toLowerCase() !== expected.toLowerCase();
  }

  // Greater than: key > val
  const gtMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*>\s*([0-9.]+)/);
  if (gtMatch) {
    const [, key, valStr] = gtMatch;
    const actualNum = Number(answers[key] ?? 0);
    return actualNum > Number(valStr);
  }

  // Less than: key < val
  const ltMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*<\s*([0-9.]+)/);
  if (ltMatch) {
    const [, key, valStr] = ltMatch;
    const actualNum = Number(answers[key] ?? 0);
    return actualNum < Number(valStr);
  }

  // Existence check: key
  return Boolean(answers[trimmed]);
}

/**
 * Determines the next question_id given the current question and current answers.
 */
export function getNextQuestionId(
  currentQuestionId: string,
  answers: Record<string, any>,
  tree: WizardNode[] = INITIAL_QUESTION_TREE
): string | null {
  const node = tree.find(n => n.question_id === currentQuestionId);
  if (!node) return null;

  if (node.branches && node.branches.length > 0) {
    for (const branch of node.branches) {
      if (evaluateCondition(branch.condition, answers)) {
        return branch.next_question_id;
      }
    }
  }

  return node.default_next_question_id || null;
}

/**
 * Validates an answer value against a question node's validation rules.
 */
export function validateAnswer(
  node: WizardNode,
  value: any
): { valid: boolean; error?: string } {
  const rules = node.validation_rules || {};

  // Required check
  if (rules.required) {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      return { valid: false, error: `${node.question_text} is required.` };
    }
  }

  if (value === undefined || value === null || value === '') {
    return { valid: true };
  }

  // Number validation
  if (node.input_type === 'number') {
    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, error: 'Must be a valid number.' };
    }
    if (rules.min !== undefined && num < rules.min) {
      return { valid: false, error: `Value must be at least ${rules.min}.` };
    }
    if (rules.max !== undefined && num > rules.max) {
      return { valid: false, error: `Value cannot exceed ${rules.max}.` };
    }
  }

  // Date validation (maxPastDays check up to 365 days / 1 year in past)
  if (node.input_type === 'date' && value) {
    const parsedDate = new Date(value);
    if (isNaN(parsedDate.getTime())) {
      return { valid: false, error: 'Must be a valid date.' };
    }

    if (rules.maxPastDays !== undefined) {
      const now = new Date();
      const diffMs = now.getTime() - parsedDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > rules.maxPastDays) {
        return {
          valid: false,
          error: `Date cannot be more than ${rules.maxPastDays} days (1 year) in the past.`,
        };
      }
    }
  }

  // Regex check
  if (rules.regex && typeof value === 'string') {
    const regex = new RegExp(rules.regex);
    if (!regex.test(value)) {
      return { valid: false, error: 'Input format is invalid.' };
    }
  }

  return { valid: true };
}

/**
 * Calculates the dynamic question sequence path based on current answers.
 */
export function getQuestionSequence(
  answers: Record<string, any>,
  tree: WizardNode[] = INITIAL_QUESTION_TREE
): string[] {
  const sequence: string[] = [];
  let currentId: string | null = tree[0]?.question_id || null;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    sequence.push(currentId);
    currentId = getNextQuestionId(currentId, answers, tree);
  }

  return sequence;
}

/**
 * Calculates progress step index, total steps in active branch sequence, and percentage.
 */
export function calculateWizardProgress(
  currentQuestionId: string,
  answers: Record<string, any>,
  tree: WizardNode[] = INITIAL_QUESTION_TREE
): { step: number; totalSteps: number; percent: number } {
  const sequence = getQuestionSequence(answers, tree);
  const stepIndex = sequence.indexOf(currentQuestionId);
  const step = stepIndex >= 0 ? stepIndex + 1 : sequence.length;
  const totalSteps = sequence.length || 1;
  const percent = Math.min(100, Math.round((step / totalSteps) * 100));

  return { step, totalSteps, percent };
}
