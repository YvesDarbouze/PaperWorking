export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
}

export function buildChangelogMetadata(entries: ChangelogEntry[]): {
  latestDate: string;
  entries: ChangelogEntry[];
} {
  if (entries.length === 0) {
    return { latestDate: '', entries: [] };
  }

  return {
    latestDate: entries[0].date,
    entries: entries.map((e) => ({
      version: e.version,
      date: e.date,
      title: e.title,
    })),
  };
}
