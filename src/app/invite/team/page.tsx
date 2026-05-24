import { getTeamInvitationByToken } from '@/actions/team';
import TeamInviteClient from './TeamInviteClient';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TeamInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token || typeof token !== 'string') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-bg-primary">
        <h1 className="text-2xl font-bold mb-4 text-text-primary">Invalid Invitation Link</h1>
        <p className="text-text-secondary">No token provided.</p>
      </div>
    );
  }

  const invite = await getTeamInvitationByToken(token);

  if (!invite) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-bg-primary">
        <h1 className="text-2xl font-bold mb-4 text-text-primary">Invitation Not Found</h1>
        <p className="text-text-secondary">The invitation link is invalid or has been revoked.</p>
      </div>
    );
  }

  return <TeamInviteClient invite={invite} token={token} />;
}
