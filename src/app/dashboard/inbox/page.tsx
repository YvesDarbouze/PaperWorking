'use client';

import React from 'react';
import GlobalInbox from '@/components/communication/GlobalInbox';

export default function InboxPage() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-2">Command Center</h1>
        <p className="text-gray-500 font-medium">Manage unified deal communications and AI-drafted updates.</p>
      </header>
      
      <GlobalInbox />
    </div>
  );
}
