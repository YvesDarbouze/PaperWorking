import { NextResponse } from 'next/server';
import { getChangelogEntries } from '@/lib/help/loader';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = getChangelogEntries();
    if (entries.length === 0) {
      return NextResponse.json({ latestDate: '', entries: [] });
    }

    const metadata = entries.map(e => ({
      version: e.version,
      date: e.date,
      title: e.title
    }));

    return NextResponse.json({
      latestDate: entries[0].date,
      entries: metadata
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch changelog metadata' }, { status: 500 });
  }
}
