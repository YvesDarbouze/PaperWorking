import fs from 'fs';
import path from 'path';
import { AVA_CONFIG, PEPPER_CONFIG } from '@/lib/assistant/config';
import { AVA_KNOWLEDGE_BASE } from '@/lib/assistant/knowledge';
import { compileSystemPrompt } from '@/lib/assistant/persona';

describe('Pepper Knowledge Domain Truth & Terminology Invariant (§3.1, §4, §5)', () => {
  describe('Configurable Name & Pricing Truth (§2, §5)', () => {
    it('has configurable display name defaulting to Pepper', () => {
      expect(PEPPER_CONFIG.agentName).toBe('Pepper');
      expect(AVA_CONFIG.agentName).toBe('Pepper');
    });

    it('quotes exact unchangeable pricing from versioned configuration', () => {
      expect(AVA_CONFIG.pricing.investor.billingText).toBe('$499/yr or $59/mo');
      expect(AVA_CONFIG.pricing.investor.annualPrice).toBe(499);
      expect(AVA_CONFIG.pricing.investor.monthlyPrice).toBe(59);

      expect(AVA_CONFIG.pricing.investmentTeam.billingText).toBe('$999/yr or $99/mo');
      expect(AVA_CONFIG.pricing.investmentTeam.annualPrice).toBe(999);
      expect(AVA_CONFIG.pricing.investmentTeam.monthlyPrice).toBe(99);

      expect(AVA_CONFIG.pricing.vendor.billingText).toBe('$390/yr or $39/mo');
      expect(AVA_CONFIG.pricing.vendor.annualPrice).toBe(390);
      expect(AVA_CONFIG.pricing.vendor.monthlyPrice).toBe(39);
    });

    it('quotes exact customer policies from versioned configuration', () => {
      expect(AVA_CONFIG.policies.trialDays).toBe(14);
      expect(AVA_CONFIG.policies.billingStartDay).toBe(15);
      expect(AVA_CONFIG.policies.annualMoneyBackDays).toBe(30);
      expect(AVA_CONFIG.policies.postCancellationReadOnlyDays).toBe(90);
      expect(AVA_CONFIG.policies.cancellationPath).toBe('Dashboard → Settings → Billing');
      expect(AVA_CONFIG.policies.annualMonthlySwitching).toBe(true);
    });
  });

  describe('33 KPIs and The Playbook Linkage (§5)', () => {
    it('grounds the 33 KPIs in the Playbook rather than reciting raw formulas from memory', () => {
      const kpiTopic = AVA_KNOWLEDGE_BASE.find((k) => k.id === 'portfolio-insights-33-kpis');
      expect(kpiTopic).toBeDefined();
      expect(kpiTopic?.playbookLink).toBe('/support/metrics');
      expect(kpiTopic?.title).toContain('33 Investor KPIs');
    });
  });

  describe('Persona System Prompt Generation (§4, §5)', () => {
    it('generates system prompt containing agent name, trial mission, and outcome-selling guidance', () => {
      const prompt = compileSystemPrompt({ firstName: 'Marcus', isTrialing: true, hasCreatedFirstDeal: false });
      expect(prompt).toContain('You are Pepper');
      expect(prompt).toContain('Marcus');
      expect(prompt).toContain('STANDING ONBOARDING MISSION');
      expect(prompt).toContain('Deal Calculator');
      expect(prompt).toContain('Your deals kept moving while you were gone');
    });
  });

  describe('STRICT INVARIANT: The Forbidden Word "Sponsor" Must NEVER Appear (§3.1)', () => {
    const assistantDir = path.resolve(process.cwd(), 'lib/assistant');
    const componentsDir = path.resolve(process.cwd(), 'components/assistant');

    function checkFilesForForbiddenWord(dir: string) {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          checkFilesForForbiddenWord(fullPath);
        } else if (/\.(ts|tsx)$/.test(file)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Case-insensitive regex match for "sponsor"
          const matches = content.match(/\bsponsor\w*/gi);
          if (matches) {
            throw new Error(
              `Forbidden word "Sponsor" found in ${fullPath}: matches [${matches.join(', ')}]. Core nouns must be Project and Deal.`,
            );
          }
          expect(matches).toBeNull();
        }
      }
    }

    it('confirms the word "Sponsor" is completely absent from all assistant code and copy', () => {
      checkFilesForForbiddenWord(assistantDir);
      checkFilesForForbiddenWord(componentsDir);
    });
  });
});
