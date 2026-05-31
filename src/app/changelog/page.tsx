import React from 'react';
import { getChangelogEntries } from '@/lib/help/loader';
import ChangelogClient from './ChangelogClient';

export const dynamic = 'force-dynamic';

export default function ChangelogPage() {
  const entries = getChangelogEntries();

  return <ChangelogClient entries={entries} />;
}
