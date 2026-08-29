export const PROFILE_PREVIEW = {
  firstName: 'Dev',
  lastName: 'Investor',
  name: 'Dev Investor',
  email: 'investor@paperworking.test',
  phone: '+1 (512) 555-0142',
  accountType: 'investor',
  organization: 'Migration Preview Org',
  role: 'Lead Investor',
  mfaEnabled: false,
  invitationSuspended: false,
  claimedEmails: ['dev.investor@legacy.paperworking.test'] as string[],
  activity: [
    { id: 'a1', title: 'Signed in from Chrome · Austin, TX', time: '2h ago' },
    { id: 'a2', title: 'Updated marketplace profile', time: 'Yesterday' },
    { id: 'a3', title: 'Exported quarterly report (PDF)', time: '3d ago' },
    { id: 'a4', title: 'Invited Jordan Lee to workspace', time: '5d ago' },
  ],
  sessions: [
    {
      id: 'sess-1',
      label: 'This Device',
      detail: 'Chrome · macOS · Austin, TX',
      current: true,
    },
    {
      id: 'sess-2',
      label: 'iPhone 15',
      detail: 'Safari · iOS · Last active yesterday',
      current: false,
    },
  ],
} as const;
