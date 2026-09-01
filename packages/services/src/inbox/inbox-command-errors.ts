/** Matches Nest NotFoundException for missing or foreign inbox item. */
export class InboxItemNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super('Inbox item not found');
    this.name = 'InboxItemNotFoundError';
  }

  get payload(): { error: string } {
    return { error: 'Inbox item not found' };
  }
}
