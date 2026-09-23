/**
 * Pepper triage heuristics — module, severity, and REIL phase inference for
 * chatbot bug reports and feature requests. Pure functions, no React.
 */

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReilPhase = 'Acquisition' | 'Fund' | 'Hold' | 'Exit' | 'Portfolio';

export interface DeflectionTip {
  title: string;
  body: string;
  link?: string;
}

export function inferModuleFromText(text: string, fallback: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('calc') || lower.includes('cap rate') || lower.includes('arv') || lower.includes('underwrit')) {
    return 'Deal Calculator';
  }
  if (lower.includes('vault') || lower.includes('pdf') || lower.includes('doc') || lower.includes('contract')) {
    return 'Document Vault';
  }
  if (lower.includes('ledger') || lower.includes('expense') || lower.includes('draw') || lower.includes('clock')) {
    return 'Holding Ledger';
  }
  if (lower.includes('marketplace') || lower.includes('deal') || lower.includes('partner')) {
    return 'Marketplace';
  }
  if (lower.includes('login') || lower.includes('billing') || lower.includes('account') || lower.includes('card')) {
    return 'Billing / Account';
  }
  return fallback;
}

export function inferSeverityFromText(text: string): BugSeverity {
  const lower = text.toLowerCase();
  if (lower.includes('wire') || lower.includes('closing today') || lower.includes('critical') || lower.includes('blocked')) {
    return 'critical';
  }
  if (lower.includes('crash') || lower.includes('wrong number') || lower.includes('error') || lower.includes('fail')) {
    return 'high';
  }
  if (lower.includes('typo') || lower.includes('label') || lower.includes('color') || lower.includes('align')) {
    return 'low';
  }
  return 'medium';
}

export function inferReilPhaseFromText(text: string): ReilPhase {
  const lower = text.toLowerCase();
  if (lower.includes('fund') || lower.includes('closing') || lower.includes('escrow') || lower.includes('vault')) {
    return 'Fund';
  }
  if (lower.includes('rehab') || lower.includes('hold') || lower.includes('contractor') || lower.includes('draw')) {
    return 'Hold';
  }
  if (lower.includes('exit') || lower.includes('sale') || lower.includes('tax') || lower.includes('1031')) {
    return 'Exit';
  }
  if (lower.includes('portfolio') || lower.includes('kpi') || lower.includes('insight')) {
    return 'Portfolio';
  }
  return 'Acquisition';
}

/** Incident / knowledge-base deflection suggestions shown above the draft card. */
export function buildDeflectionTip(text: string): DeflectionTip | null {
  const lower = text.toLowerCase();
  if (lower.includes('cap rate')) {
    return {
      title: 'How PaperWorking Computes Cap Rate',
      body: 'Cap Rate on Cost is Net Operating Income (NOI) divided by Total Project Cost (Purchase + Rehab). Check your income & expense ledger to ensure all line items are categorized.',
      link: '/support#cap-rate-faq',
    };
  }
  if (lower.includes('dashboard') || lower.includes('slow')) {
    return {
      title: 'System Status: All Systems Operational',
      body: 'PaperWorking core services are running normally. We captured your browser & network logs automatically to inspect any local latency.',
      link: '/support#status',
    };
  }
  return null;
}

/** Truncates a free-text report into a draft title. */
export function summarizeTitle(text: string): string {
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}
