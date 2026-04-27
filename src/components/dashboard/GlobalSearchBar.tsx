'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Building2, MapPin } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';

/* ═══════════════════════════════════════════════════════
   GlobalSearchBar — Project/Deal Search

   Filters useProjectStore by propertyName or address.
   Selecting a result sets it as currentProject and
   switches to COMMAND_CENTER view.

   Scope: Projects/Deals only (Batch 1).
   ═══════════════════════════════════════════════════════ */

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const projects = useProjectStore((s) => s.projects);
  const setDeal = useProjectStore((s) => s.setDeal);
  const setViewMode = useUIStore((s) => s.setViewMode);

  // Filter projects by query
  const filtered = query.trim().length >= 2
    ? projects.filter((p) => {
        const q = query.toLowerCase();
        return (
          (p.propertyName?.toLowerCase().includes(q)) ||
          (p.address?.toLowerCase().includes(q))
        );
      }).slice(0, 8)
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setDeal(project);
      setViewMode('COMMAND_CENTER');
    }
    setQuery('');
    setIsOpen(false);
  }, [projects, setDeal, setViewMode]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
      setIsOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === 'Enter' && filtered.length === 1) {
      handleSelect(filtered[0].id);
    }
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="flex items-center gap-2 bg-bg-primary border border-border-accent/30 rounded-lg px-3 py-1.5 focus-within:border-pw-black/50 transition-colors">
        <Search className="w-3.5 h-3.5 text-text-secondary" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search deals…"
          className="bg-transparent text-xs font-medium text-text-primary placeholder:text-text-secondary/50 outline-none w-36 lg:w-48 tracking-wide"
          aria-label="Search projects and deals"
          id="global-search-input"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div
          className="absolute top-full mt-2 left-0 w-72 bg-bg-surface border border-border-accent/20 rounded-lg shadow-xl overflow-hidden z-[100]"
          role="listbox"
          aria-label="Search results"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-text-secondary font-medium">No deals match &quot;{query}&quot;</p>
            </div>
          ) : (
            filtered.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project.id)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-bg-primary transition-colors text-left group"
                role="option"
                aria-selected={false}
              >
                <div className="w-8 h-8 rounded bg-bg-primary flex items-center justify-center flex-shrink-0 group-hover:bg-pw-black group-hover:text-pw-white transition-colors">
                  <Building2 className="w-4 h-4 text-text-secondary group-hover:text-pw-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text-primary truncate uppercase tracking-wide">
                    {project.propertyName || 'Unnamed Deal'}
                  </p>
                  <p className="text-[10px] text-text-secondary truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                    {project.address || '—'}
                  </p>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/60 flex-shrink-0 mt-0.5">
                  {project.status}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
