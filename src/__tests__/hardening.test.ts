import { pingBlockchainTitleRegistry } from '../lib/web3/titleVerify';
import { pingDigitalRegistry } from '../lib/web3RegistryHooks';
import { PHASE_STEPS } from '../components/project/PhaseProgressTracker';
import { REIL_PHASES } from '../components/projects/REILKanBan';
import { PHASES } from '../components/dashboard/FullscreenLifecycleView';
import { isValidTransition } from '../lib/services/projectStateMachine';

describe('Hardening and Safety Checks', () => {
  describe('registry-integrity', () => {
    it('pingBlockchainTitleRegistry resolves with valid txHash starting with 0x and valid length', async () => {
      const result = await pingBlockchainTitleRegistry('123 Main St');
      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.txHash.startsWith('0x')).toBe(true);
      expect(result.txHash.length).toBe(42); // 0x + 40 hex chars (20 bytes)
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('pingDigitalRegistry resolves with verified status and valid txHash format', async () => {
      const result = await pingDigitalRegistry('456 Oak Ave');
      expect(result.chainOfTitleStatus).toBe('verified');
      expect(result.blockchainTxHash).toBeDefined();
      expect(result.blockchainTxHash?.startsWith('0x')).toBe(true);
      expect(result.blockchainTxHash?.length).toBe(66); // 0x + 64 hex chars (32 bytes)
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('phase-constant', () => {
    it('PHASE_STEPS in PhaseProgressTracker contains no banned Phase 2 labels and matches Closing', () => {
      const step2 = PHASE_STEPS.find(s => s.index === 1 || s.number === 2);
      expect(step2).toBeDefined();
      expect(step2?.label).not.toContain('Transaction');
      expect(step2?.label).not.toContain('Purchase');
      expect(step2?.label).toBe('Closing');
    });

    it('REIL_PHASES in REILKanBan contains no banned Phase 2 labels and matches Closing', () => {
      const phase2 = REIL_PHASES.find(p => p.phase === 2);
      expect(phase2).toBeDefined();
      expect(phase2?.label).not.toContain('Transaction');
      expect(phase2?.label).not.toContain('Purchase');
      expect(phase2?.label).toBe('Closing');
    });

    it('PHASES in FullscreenLifecycleView contains no banned Phase 2 labels and matches Closing', () => {
      const phase2 = PHASES.find(p => p.id === 2);
      expect(phase2).toBeDefined();
      expect(phase2?.title).not.toContain('Transaction');
      expect(phase2?.title).not.toContain('Purchase');
      expect(phase2?.title).toBe('Closing');
    });
  });

  describe('directionality', () => {
    it('allows moving forward to subsequent phases', () => {
      expect(isValidTransition('Sourcing', 'Under Contract')).toBe(true);
      expect(isValidTransition('Under Contract', 'Rehab')).toBe(true);
      expect(isValidTransition('Rehab', 'Listed')).toBe(true);
      expect(isValidTransition('Listed', 'Sold')).toBe(true);
      expect(isValidTransition('Sold', 'Rented')).toBe(true);
    });

    it('allows moving backward by exactly 1 step', () => {
      expect(isValidTransition('Rehab', 'Under Contract')).toBe(true);
      expect(isValidTransition('Listed', 'Rehab')).toBe(true);
      expect(isValidTransition('Sold', 'Listed')).toBe(true);
    });

    it('rejects jumping backward by more than 1 step', () => {
      expect(isValidTransition('Rehab', 'Sourcing')).toBe(false);
      expect(isValidTransition('Listed', 'Under Contract')).toBe(false);
      expect(isValidTransition('Sold', 'Rehab')).toBe(false);
      expect(isValidTransition('Rented', 'Listed')).toBe(false);
    });
  });
});
