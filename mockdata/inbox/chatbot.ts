export const CHATBOT_WELCOME_TEXT =
  'PaperWorking Support. Briefly describe your issue, or ask a question about our SOPs and platform features.';

/** Scripted demo replies — local-only, never sent to a server. */
export function demoChatbotReply(userText: string): string {
  const q = userText.trim().toLowerCase();
  if (/^(hi|hello|hey|xin chào|chào)\b/.test(q)) {
    return 'Hi — this is a local demo chat. Messages stay on this device only (localStorage). How can we help with PaperWorking?';
  }
  if (/sop|feature|how|help|hướng dẫn|tính năng/.test(q)) {
    return 'Demo reply: ask about Portfolio, Projects, Inbox, or Settings. Nothing here is sent to a server.';
  }
  return 'Got it (demo). Your message is saved locally on this browser only — not synced to support tickets.';
}
