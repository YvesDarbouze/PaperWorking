export function buildImpersonationCookies(input: {
  agentId: string;
  email: string;
  name: string;
}): Array<{ name: string; value: string; options?: { path?: string; httpOnly?: boolean; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; maxAge?: number } }> {
  return [
    {
      name: '__session',
      value: `mock_session_agent_${input.agentId}`,
      options: { path: '/', httpOnly: true, secure: false, sameSite: 'lax', maxAge: 86400 },
    },
    { name: 'mock_user_uid', value: input.agentId, options: { path: '/' } },
    { name: 'mock_user_email', value: input.email, options: { path: '/' } },
    { name: 'mock_user_name', value: input.name, options: { path: '/' } },
  ];
}

export function buildPurgeAllSummary(input: {
  usersDeleted: number;
  projectsDeleted: number;
  listingsDeleted: number;
  messagesDeleted: number;
  subscriptionsCanceled: number;
}): Record<string, unknown> {
  return {
    success: true,
    message: 'Purged all synthetic agent data successfully.',
    ...input,
  };
}
