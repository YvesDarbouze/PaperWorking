// pingBlockchainTitleRegistry was a setTimeout simulation — removed along with titleVerify.ts.
import { pingDigitalRegistry } from '../lib/web3RegistryHooks';
import { PHASE_STEPS } from '../components/project/PhaseProgressTracker';
import { REIL_PHASES } from '../components/projects/REILKanBan';
import { PHASES } from '../components/dashboard/FullscreenLifecycleView';
import { isValidTransition } from '../lib/services/projectStateMachine';

describe('Hardening and Safety Checks', () => {
  describe('registry-integrity', () => {
    // The old fake (setTimeout + random txHash) was removed in the security sweep.
    // pingDigitalRegistry now throws Web3ProviderNotConfiguredError when
    // WEB3_REGISTRY_URL is not set — the honest "not available" behaviour.
    // See: src/__tests__/titleChecks.test.ts for title-clearance regression tests.

    it('pingDigitalRegistry throws Web3ProviderNotConfiguredError when no provider is configured', async () => {
      // In CI / test env, WEB3_REGISTRY_URL is not set — this must throw, not fabricate.
      await expect(pingDigitalRegistry('456 Oak Ave')).rejects.toThrow(
        /not enabled|not configured/i,
      );
    });

    it('pingDigitalRegistry never returns a synthetic txHash', async () => {
      // Under no circumstance may a random hex string be returned as on-chain proof.
      // The call must either throw (provider not configured) or return a real verified hash.
      // In this env it must throw — assert the rejects path, not a fake success.
      await expect(pingDigitalRegistry('456 Oak Ave')).rejects.toThrow();
    });
  });

  describe('phase-constant', () => {
    it('PHASE_STEPS in PhaseProgressTracker contains no banned Phase 2 labels and matches Fund', () => {
      const step2 = PHASE_STEPS.find(s => s.index === 1 || s.number === 2);
      expect(step2).toBeDefined();
      expect(step2?.label).not.toContain('Transaction');
      expect(step2?.label).not.toContain('Purchase');
      expect(step2?.label).not.toContain('Closing');
      expect(step2?.label).toBe('Fund');
    });

    it('REIL_PHASES in REILKanBan contains no banned Phase 2 labels and matches Fund', () => {
      const phase2 = REIL_PHASES.find(p => p.phase === 2);
      expect(phase2).toBeDefined();
      expect(phase2?.label).not.toContain('Transaction');
      expect(phase2?.label).not.toContain('Purchase');
      expect(phase2?.label).not.toContain('Closing');
      expect(phase2?.label).toBe('Fund');
    });

    it('PHASES in FullscreenLifecycleView contains no banned Phase 2 labels and matches Fund', () => {
      const phase2 = PHASES.find(p => p.id === 2);
      expect(phase2).toBeDefined();
      expect(phase2?.title).not.toContain('Transaction');
      expect(phase2?.title).not.toContain('Purchase');
      expect(phase2?.title).not.toContain('Closing');
      expect(phase2?.title).toBe('Fund');
    });
  });

  describe('directionality', () => {
    it('allows moving forward to subsequent phases', () => {
      expect(isValidTransition('acquisition', 'fund')).toBe(true);
      expect(isValidTransition('fund', 'hold')).toBe(true);
      expect(isValidTransition('hold', 'exit')).toBe(true);
    });

    it('allows moving backward by exactly 1 step', () => {
      expect(isValidTransition('hold', 'fund')).toBe(true);
      expect(isValidTransition('exit', 'hold')).toBe(true);
    });

    it('rejects jumping backward by more than 1 step', () => {
      expect(isValidTransition('hold', 'acquisition')).toBe(false);
      expect(isValidTransition('exit', 'fund')).toBe(false);
    });
  });
});
