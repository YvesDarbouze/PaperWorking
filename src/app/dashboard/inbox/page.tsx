'use client';

import React from 'react';
import GlobalInbox from '@/components/communication/GlobalInbox';

export default function InboxPage() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-light tracking-tight text-text-primary mb-2">Command Center</h1>
        <p className="text-text-secondary font-medium">Manage unified deal communications and AI-drafted updates.</p>
      </header>
      
      <GlobalInbox />
    </div>
  );
}
