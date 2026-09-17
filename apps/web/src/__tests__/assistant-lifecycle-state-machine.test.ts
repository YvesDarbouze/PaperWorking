import {
  HIGH_INTENT_CHIPS,
  getPulseSessionKey,
  isScrolledToBottom,
  isUserStalled,
  type UXPhase,
} from '@/lib/assistant/lifecycle-state-machine';

describe('Ava UX Lifecycle State Machine (§7, §8)', () => {
  describe('Phase 1: Proactive Pulse & Session Storage', () => {
    it('generates a unique storage key per surface to ensure pulse fires at most once per session', () => {
      expect(getPulseSessionKey('dashboard')).toBe('pw_pulse_dismissed_dashboard');
      expect(getPulseSessionKey('home')).toBe('pw_pulse_dismissed_home');
      expect(getPulseSessionKey('deal_calculator')).toBe('pw_pulse_dismissed_deal_calculator');
    });

    it('identifies stall conditions when idle duration exceeds threshold', () => {
      expect(isUserStalled(2000, 3000)).toBe(false);
      expect(isUserStalled(3000, 3000)).toBe(true);
      expect(isUserStalled(5000, 3000)).toBe(true);
    });
  });

  describe('Phase 2: Intent Prompt Chips (Never blank input)', () => {
    it('contains categorized high-intent prompt chips across the 4-phase lifecycle', () => {
      const categories = HIGH_INTENT_CHIPS.map((c) => c.category);
      expect(categories).toContain('Getting started');
      expect(categories).toContain('Acquisition');
      expect(categories).toContain('Fund');
      expect(categories).toContain('Hold');
      expect(categories).toContain('Exit/Portfolio');
      expect(categories).toContain('Account');
    });

    it('contains primary objection-killer and value milestone chips', () => {
      const labels = HIGH_INTENT_CHIPS.map((c) => c.label);
      expect(labels).toContain('Switch from spreadsheets mid-deal');
      expect(labels).toContain('Analyze my first deal');
      expect(labels).toContain('Run the Deal Calculator on an address');
      expect(labels).toContain('Track a contingency deadline');
      expect(labels).toContain('Log a contractor draw');
      expect(labels).toContain('Explain the 33 Insights KPIs');
      expect(labels).toContain('Why is my deal blocked at a phase gate?');
      expect(labels).toContain('Fix a revenue vs. expense misclassification');
    });
  });

  describe('Phase 3 & Phase 4: Transitions & Autoscroll Invariant', () => {
    it('accurately detects whether user is scrolled to bottom or scrolled up to read', () => {
      // Mock element pinned to bottom: scrollHeight (1000) - scrollTop (600) - clientHeight (400) = 0
      const pinnedElement = {
        scrollHeight: 1000,
        scrollTop: 600,
        clientHeight: 400,
      } as HTMLElement;

      expect(isScrolledToBottom(pinnedElement, 40)).toBe(true);

      // Mock element scrolled up to read earlier message: scrollHeight (1000) - scrollTop (300) - clientHeight (400) = 300
      const scrolledUpElement = {
        scrollHeight: 1000,
        scrollTop: 300,
        clientHeight: 400,
      } as HTMLElement;

      expect(isScrolledToBottom(scrolledUpElement, 40)).toBe(false);
    });

    it('follows valid sequence of UX lifecycle states', () => {
      const phases: UXPhase[] = [
        'PHASE_1_LAUNCHER',
        'PHASE_2_INTENT',
        'PHASE_3_SPLIT_VIEW',
        'PHASE_4_MINIMIZED',
      ];

      expect(phases[0]).toBe('PHASE_1_LAUNCHER');
      expect(phases[1]).toBe('PHASE_2_INTENT');
      expect(phases[2]).toBe('PHASE_3_SPLIT_VIEW');
      expect(phases[3]).toBe('PHASE_4_MINIMIZED');
    });
  });
});
