export type ProfileUserRow = {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  phone: string | null;
  timezone: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  accountType: string | null;
  role: string | null;
  settings: unknown;
};

export type ProfileSettingsRepository = {
  findByAuthUid(uid: string): Promise<ProfileUserRow | null>;
  updateProfileFields(
    id: string,
    data: Partial<
      Pick<
        ProfileUserRow,
        'name' | 'displayName' | 'phone' | 'timezone' | 'companyName' | 'avatarUrl'
      >
    >,
  ): Promise<ProfileUserRow>;
};
