'use client';

import React, { useEffect } from 'react';
import { Rss, Calendar, Tag } from 'lucide-react';
import type { ChangelogEntry } from '@/lib/help/loader';

interface ChangelogClientProps {
  entries: ChangelogEntry[];
}

export default function ChangelogClient({ entries }: ChangelogClientProps) {
  // Update last visit timestamp in localStorage to clear "What's new" unread count
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('paperworking_changelog_last_visit', Date.now().toString());
      // Trigger a custom event to notify TopAppBar to update its unread count
      window.dispatchEvent(new Event('changelog_read'));
    }
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 pb-6 border-b border-[var(--pw-border)]">
        <div>
          <span className="uppercase tracking-widest text-xs font-black text-emerald-400 mb-3 block">
            Platform Updates
          </span>
          <h1 className="text-4xl md:text-5xl font-light tracking-tighter text-[var(--pw-black)]">
            What's New in PaperWorking
          </h1>
          <p className="text-sm text-[var(--pw-muted)] mt-2">
            Stay up to date with the latest features, enhancements, and bug fixes we push to the platform.
          </p>
        </div>

        <div>
          <a
            href="/changelog/rss"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--pw-border)] hover:border-emerald-400 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-[var(--pw-black)] transition-all"
          >
            <Rss className="w-4 h-4 text-emerald-400" />
            RSS Feed
          </a>
        </div>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--pw-border)] rounded-2xl bg-white/5 text-[var(--pw-muted)]">
          No changelog entries published yet.
        </div>
      ) : (
        <div className="space-y-12">
          {entries.map((entry) => (
            <div
              key={entry.version}
              className="p-8 rounded-2xl border border-[var(--pw-border)] bg-white/5 backdrop-blur-xl relative overflow-hidden group"
            >
              {/* Date & Version Tag */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-1.5 text-xs text-[var(--pw-muted)]">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  {entry.date}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--pw-muted)]">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  Version {entry.version}
                </div>
              </div>

              {/* Parsed HTML Body */}
              <div
                className="prose prose-neutral max-w-none text-[var(--pw-black)]
                           prose-headings:font-light prose-headings:tracking-tight prose-headings:text-[var(--pw-black)]
                           prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-0
                           prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-widest prose-h2:font-black prose-h2:text-emerald-400 prose-h2:mt-6 prose-h2:mb-2
                           prose-p:my-4 prose-p:leading-relaxed prose-p:text-sm prose-p:text-[var(--pw-muted)]
                           prose-strong:font-bold prose-strong:text-[var(--pw-black)]
                           prose-ul:list-disc prose-ul:pl-5 prose-ul:my-2 prose-ul:space-y-1
                           prose-li:text-sm prose-li:text-[var(--pw-muted)]"
                dangerouslySetInnerHTML={{ __html: entry.content }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
