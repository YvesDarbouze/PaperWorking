import React from 'react';
import { getHelpArticles } from '@/lib/help/loader';
import HelpCenterClient from './HelpCenterClient';

// Force dynamic or dynamicParams to make sure fs is read dynamically in dev/production
export const dynamic = 'force-dynamic';

export default function HelpPage() {
  const articles = getHelpArticles();

  return <HelpCenterClient initialArticles={articles} />;
}
