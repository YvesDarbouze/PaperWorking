import {
  evaluateCondition,
  getNextQuestionId,
  validateAnswer,
  getQuestionSequence,
  calculateWizardProgress,
  INITIAL_QUESTION_TREE,
  WizardNode,
} from '../index';
import { generateTodosForPhase, calculatePhaseCompletion } from '../../todo-engine';

describe('Wizard Engine - Branching & Condition Evaluation', () => {
  test('evaluates equality conditions correctly', () => {
    expect(evaluateCondition("phase === 'acquisition'", { phase: 'acquisition' })).toBe(true);
    expect(evaluateCondition("phase === 'hold'", { phase: 'acquisition' })).toBe(false);
  });

  test('evaluates OR (||) conditions correctly', () => {
    const condition = "entity_type === 'LLC (multi)' || entity_type === 'Partnership'";
    expect(evaluateCondition(condition, { entity_type: 'LLC (multi)' })).toBe(true);
    expect(evaluateCondition(condition, { entity_type: 'Partnership' })).toBe(true);
    expect(evaluateCondition(condition, { entity_type: 'Sole Proprietor' })).toBe(false);
  });

  test('evaluates numerical comparison conditions (> and <)', () => {
    expect(evaluateCondition('purchase_price > 100000', { purchase_price: 250000 })).toBe(true);
    expect(evaluateCondition('purchase_price > 100000', { purchase_price: 50000 })).toBe(false);
  });

  test('determines correct next question ID dynamically', () => {
    // Q5 for acquisition phase branches to Q7 (skips Q6 rehab budget)
    const nextForAcq = getNextQuestionId('Q5', { phase: 'acquisition' }, INITIAL_QUESTION_TREE);
    expect(nextForAcq).toBe('Q7');

    // Q5 for hold phase defaults to Q6
    const nextForHold = getNextQuestionId('Q5', { phase: 'hold' }, INITIAL_QUESTION_TREE);
    expect(nextForHold).toBe('Q6');
  });

  test('computes complete question sequence for active branch', () => {
    const acqSequence = getQuestionSequence({ phase: 'acquisition' }, INITIAL_QUESTION_TREE);
    expect(acqSequence).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q7', 'Q8']);

    const holdSequence = getQuestionSequence({ phase: 'hold' }, INITIAL_QUESTION_TREE);
    expect(holdSequence).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']);
  });
});

describe('Wizard Engine - Answer Validation', () => {
  test('validates required fields', () => {
    const node: WizardNode = {
      question_id: 'test_req',
      question_text: 'Required Test Question',
      input_type: 'text',
      validation_rules: { required: true },
    };

    expect(validateAnswer(node, '').valid).toBe(false);
    expect(validateAnswer(node, 'Sample Answer').valid).toBe(true);
  });

  test('validates numerical ranges', () => {
    const node: WizardNode = {
      question_id: 'test_num',
      question_text: 'Number Test',
      input_type: 'number',
      validation_rules: { required: true, min: 10, max: 100 },
    };

    expect(validateAnswer(node, 5).valid).toBe(false);
    expect(validateAnswer(node, 150).valid).toBe(false);
    expect(validateAnswer(node, 50).valid).toBe(true);
  });

  test('validates past dates up to 1 year (365 days)', () => {
    const node: WizardNode = {
      question_id: 'test_date',
      question_text: 'Date Test',
      input_type: 'date',
      validation_rules: { required: true, maxPastDays: 365 },
    };

    const recentPastDate = new Date();
    recentPastDate.setMonth(recentPastDate.getMonth() - 3); // 3 months ago
    const validDateStr = recentPastDate.toISOString().split('T')[0];

    const oldPastDate = new Date();
    oldPastDate.setFullYear(oldPastDate.getFullYear() - 2); // 2 years ago
    const invalidDateStr = oldPastDate.toISOString().split('T')[0];

    expect(validateAnswer(node, validDateStr).valid).toBe(true);
    expect(validateAnswer(node, invalidDateStr).valid).toBe(false);
  });
});

describe('Wizard Engine - Progress Calculation', () => {
  test('calculates wizard step progress correctly', () => {
    const p1 = calculateWizardProgress('Q1', { phase: 'acquisition' });
    expect(p1.step).toBe(1);
    expect(p1.totalSteps).toBe(7);

    const p3 = calculateWizardProgress('Q3', { phase: 'acquisition' });
    expect(p3.step).toBe(3);
    expect(p3.percent).toBe(43);
  });
});

describe('Todo Engine & Phase Completion', () => {
  test('generates todos dynamically for acquisition phase', () => {
    const todos = generateTodosForPhase('acquisition', {});
    expect(todos.length).toBeGreaterThan(0);
    expect(todos.some(t => t.content.includes('proof of funds'))).toBe(true);
  });

  test('calculates phase completion percentage accurately', () => {
    const todos = generateTodosForPhase('acquisition', {});
    const initialPct = calculatePhaseCompletion(todos, 0, 5);
    expect(initialPct).toBe(0);

    todos[0].status = 'completed';
    todos[1].status = 'completed';
    const updatedPct = calculatePhaseCompletion(todos, 2, 5);
    expect(updatedPct).toBe(44);
  });
});
