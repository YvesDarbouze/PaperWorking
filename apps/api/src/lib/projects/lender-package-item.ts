export function buildLenderPackageItemPatch(body: Record<string, unknown>): {
  ok: true;
  update: Record<string, unknown>;
} | { ok: false; error: string; status: number } {
  const update: Record<string, unknown> = {};

  if ('reminderCadence' in body) {
    const val = body.reminderCadence;
    if (val !== 'daily' && val !== 'weekly' && val !== 'none') {
      return { ok: false, error: 'Invalid reminder cadence', status: 400 };
    }
    update.reminderCadence = val;
  }

  if ('status' in body) {
    const val = body.status;
    if (val !== 'Pending' && val !== 'Uploaded') {
      return { ok: false, error: 'Invalid status', status: 400 };
    }
    update.status = val;
  }

  if ('fileId' in body) update.fileId = body.fileId;
  if ('fileName' in body) update.fileName = body.fileName;
  if ('fileUrl' in body) update.fileUrl = body.fileUrl;

  if (Object.keys(update).length === 0) {
    return { ok: false, error: 'No update data provided', status: 400 };
  }

  return { ok: true, update };
}
