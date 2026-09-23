/**
 * Pepper chatbot draft types shared by the drawer UI and intake routes.
 */

import type { ClientDiagnostics } from '@/lib/telemetry/client-diagnostic-buffer';
import type { BugSeverity, ReilPhase } from './pepper-triage';

export type ConversationalFlow = 'idle' | 'bug_report' | 'feature_request' | 'chat' | 'escalation';

export interface MediaAttachment {
  type: 'image' | 'video';
  name: string;
  dataUrl: string;
}

export interface StructuredBugDraft {
  title: string;
  description: string;
  module: string;
  severity: BugSeverity;
  ticketId: string;
  diagnostics: ClientDiagnostics;
  attachment?: MediaAttachment;
}

export interface StructuredFeatureDraft {
  title: string;
  description: string;
  reilPhase: ReilPhase;
  ticketId: string;
  attachment?: MediaAttachment;
}
