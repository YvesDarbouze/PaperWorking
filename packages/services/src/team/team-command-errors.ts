/** Matches Nest ForbiddenException for invalid organization role. */
export class TeamInvalidRoleError extends Error {
  readonly status = 403;

  constructor(readonly role: string) {
    super('Invalid organization role');
    this.name = 'TeamInvalidRoleError';
  }

  get payload(): { error: string; role: string } {
    return { error: 'Invalid organization role', role: this.role };
  }
}

/** Matches Nest soft-failure when member id is missing or not found (200 + success:false). */
export class TeamMemberNotFoundError extends Error {
  readonly status = 200;

  constructor() {
    super('Member not found');
    this.name = 'TeamMemberNotFoundError';
  }

  get payload(): { success: false; error: string } {
    return { success: false, error: 'Member not found' };
  }
}

export class TeamMemberIdRequiredError extends Error {
  readonly status = 200;

  constructor() {
    super('member id required');
    this.name = 'TeamMemberIdRequiredError';
  }

  get payload(): { success: false; error: string } {
    return { success: false, error: 'member id required' };
  }
}

export class TeamNoOrganizationError extends Error {
  readonly status = 200;

  constructor(message = 'No organization found for user') {
    super(message);
    this.name = 'TeamNoOrganizationError';
  }

  get payload(): { success: false; error: string } {
    return { success: false, error: this.message };
  }
}
