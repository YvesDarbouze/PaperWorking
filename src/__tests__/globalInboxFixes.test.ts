/**
 * Prompts 67/68/69 — GlobalInbox: Filter, Draft Persistence, COMMIT Validation
 *
 * Tests verify source-level contracts:
 *   67 — Filter button has onClick, FilterPopover exists, filters applied to derived array
 *   68 — DraftContext interface exported, props accepted, context lifted into GlobalInbox
 *   69 — handleSend validates both preconditions; COMMIT button has aria-disabled
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

const INBOX = read('components/communication/GlobalInbox.tsx');
const DRAFT = read('components/communication/DraftAssistant.tsx');

describe('Prompt 67 — Filter button has a real handler and filters messages', () => {

  it('Filter button has an id for E2E testability', () => {
    expect(INBOX).toContain('id="global-inbox-filter-btn"');
  });

  it('Filter button has an onClick handler', () => {
    // The button that renders <Filter /> must call setFilterOpen
    expect(INBOX).toContain('onClick={() => setFilterOpen((v) => !v)}');
  });

  it('Filter button has aria-expanded and aria-haspopup', () => {
    expect(INBOX).toContain('aria-expanded={filterOpen}');
    expect(INBOX).toContain('aria-haspopup="true"');
  });

  it('FilterPopover component is defined in GlobalInbox.tsx', () => {
    expect(INBOX).toContain('function FilterPopover(');
  });

  it('FilterPopover has id="global-inbox-filter-popover"', () => {
    expect(INBOX).toContain('id="global-inbox-filter-popover"');
  });

  it('FilterPopover renders options for all three filter types', () => {
    // FilterPopover uses a map with a template-literal id: id={`filter-option-${opt}`}
    expect(INBOX).toContain("id={`filter-option-${opt}`}");
  });

  it('FilterPopover closes on outside click (mousedown handler)', () => {
    expect(INBOX).toContain("document.addEventListener('mousedown'");
  });

  it('filteredMessages is derived from messages + filterType (not raw messages)', () => {
    expect(INBOX).toContain('const filteredMessages = messages.filter(');
  });

  it('filteredMessages filters EMAIL_INBOUND and EMAIL_OUTBOUND for "email" type', () => {
    expect(INBOX).toContain("msg.type === 'EMAIL_INBOUND' || msg.type === 'EMAIL_OUTBOUND'");
  });

  it('filteredMessages filters INTERNAL_COMMENT and SYSTEM for "internal" type', () => {
    expect(INBOX).toContain("msg.type === 'INTERNAL_COMMENT' || msg.type === 'SYSTEM'");
  });

  it('stream renders filteredMessages, not raw messages', () => {
    // The message map must use filteredMessages
    expect(INBOX).toContain('filteredMessages.map(');
    // And the empty state must check filteredMessages.length
    expect(INBOX).toContain('filteredMessages.length === 0');
  });

  it('active filter renders a dismissible badge', () => {
    expect(INBOX).toContain('id="filter-clear-active"');
  });

  it('filter resets when switching deals', () => {
    expect(INBOX).toContain("setFilterType('all')");
  });
});

describe('Prompt 68 — Draft context persists through open/close cycles', () => {

  it('DraftContext interface is exported from DraftAssistant.tsx', () => {
    expect(DRAFT).toContain('export interface DraftContext');
  });

  it('DraftContext has audience and draft fields', () => {
    expect(DRAFT).toContain("audience: 'investors' | 'contractors'");
    expect(DRAFT).toContain('draft: string');
  });

  it('DraftAssistantProps has draftContext prop', () => {
    expect(DRAFT).toContain('draftContext: DraftContext');
  });

  it('DraftAssistantProps has onDraftContextChange prop', () => {
    expect(DRAFT).toContain('onDraftContextChange: (ctx: DraftContext) => void');
  });

  it('DraftAssistant no longer holds its own draft state (lifted)', () => {
    // After lifting, there should be no local useState for draft string inside DraftAssistant
    // The component should read from draftContext.draft, not a local useState
    const localDraftState = /const \[draft, setDraft\] = useState/.test(DRAFT);
    expect(localDraftState).toBe(false);
  });

  it('DraftAssistant no longer holds its own audience state (lifted)', () => {
    const localAudienceState = /const \[audience, setAudience\] = useState/.test(DRAFT);
    expect(localAudienceState).toBe(false);
  });

  it('DraftAssistant destructures audience and draft from draftContext', () => {
    expect(DRAFT).toContain('const { audience, draft } = draftContext');
  });

  it('setAudience calls onDraftContextChange', () => {
    expect(DRAFT).toContain('onDraftContextChange({ ...draftContext, audience })');
  });

  it('generateDraft calls onDraftContextChange with the new draft', () => {
    expect(DRAFT).toContain('onDraftContextChange({ ...draftContext, draft: result })');
  });

  it('clearDraft calls onDraftContextChange with empty draft', () => {
    expect(DRAFT).toContain("draft: ''");
  });

  it('GlobalInbox holds draftContext as useState (lifted owner)', () => {
    expect(INBOX).toContain('const [draftContext, setDraftContext] = useState<DraftContext>');
  });

  it('GlobalInbox passes draftContext and onDraftContextChange to DraftAssistant', () => {
    expect(INBOX).toContain('draftContext={draftContext}');
    expect(INBOX).toContain('onDraftContextChange={setDraftContext}');
  });

  it('GlobalInbox resets draftContext on deal switch', () => {
    expect(INBOX).toContain('setDraftContext(DEFAULT_DRAFT_CONTEXT)');
  });

  it('inserting a draft does not clear the lifted context', () => {
    // insertDraft should NOT call setDraftContext or reset it
    // It calls setReplyText and setIsDrafting(false) only
    const insertDraftBlock = INBOX.slice(
      INBOX.indexOf('const insertDraft'),
      INBOX.indexOf('const insertDraft') + 200,
    );
    expect(insertDraftBlock).toContain('setReplyText(draft)');
    expect(insertDraftBlock).toContain('setIsDrafting(false)');
    // Must NOT reset draftContext inside insertDraft
    expect(insertDraftBlock).not.toContain('setDraftContext(DEFAULT_DRAFT_CONTEXT)');
  });

  it('DraftAssistant has a Clear Draft button with id="draft-clear-btn"', () => {
    expect(DRAFT).toContain('id="draft-clear-btn"');
  });

  it('draft-insert-btn id exists for E2E testability', () => {
    expect(DRAFT).toContain('id="draft-insert-btn"');
  });
});

describe('Prompt 69 — COMMIT validates preconditions', () => {

  it('COMMIT button has id for E2E testability', () => {
    expect(INBOX).toContain('id="global-inbox-commit-btn"');
  });

  it('COMMIT button has aria-disabled attribute', () => {
    expect(INBOX).toContain('aria-disabled={!selectedDealId || !replyText.trim()}');
  });

  it('COMMIT button has a descriptive title attribute', () => {
    expect(INBOX).toContain("title={");
    expect(INBOX).toContain("Select a project first");
    expect(INBOX).toContain("Write a message first");
  });

  it('handleSend guards against null selectedDealId', () => {
    expect(INBOX).toContain('if (!selectedDealId)');
  });

  it('handleSend shows a toast error when no deal is selected', () => {
    expect(INBOX).toContain("'Select a project before committing a message.'");
  });

  it('handleSend guards against empty replyText', () => {
    expect(INBOX).toContain('if (!replyText.trim())');
  });

  it('handleSend shows a toast error when replyText is empty', () => {
    expect(INBOX).toContain("'Write a message before committing.'");
  });

  it('handleSend clears replyText after successful commit', () => {
    expect(INBOX).toContain("setReplyText('')");
  });

  it('handleSend shows success toast on completion', () => {
    expect(INBOX).toContain("toast.success('Message committed.'");
  });

  it('handleSend catches errors and shows an error toast', () => {
    expect(INBOX).toContain("'Failed to commit message. Please retry.'");
  });

  it('toast.error calls use a unique id to prevent duplication (commit-no-deal)', () => {
    expect(INBOX).toContain("id: 'commit-no-deal'");
  });

  it('toast.error calls use a unique id to prevent duplication (commit-no-text)', () => {
    expect(INBOX).toContain("id: 'commit-no-text'");
  });
});

describe('Shared: unique IDs for E2E testability', () => {
  it('search input has id', () => { expect(INBOX).toContain('id="global-inbox-search"'); });
  it('draft compile button in footer has id', () => { expect(INBOX).toContain('id="global-inbox-compile-btn"'); });
  it('draft assistant close button has id', () => { expect(DRAFT).toContain('id="draft-assistant-close"'); });
  it('draft audience investors has id', () => { expect(DRAFT).toContain('id="draft-audience-investors"'); });
  it('draft audience contractors has id', () => { expect(DRAFT).toContain('id="draft-audience-contractors"'); });
  it('draft compile button has id', () => { expect(DRAFT).toContain('id="draft-compile-btn"'); });
});
