'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, FileText, Clock, CheckCircle } from 'lucide-react';

/**
 * FastDiscovery
 *
 * "Fast Discovery" interactive UI snippet demonstrating real-time search
 * that finds a document in under 1 second. Reinforces the 'Intuitive Navigation'
 * guideline. Strict PaperWorking palette.
 */

const DOCUMENTS = [
  { name: '421 Oak St — Closing Disclosure', type: 'Legal', date: 'Mar 12, 2026', status: 'Signed' },
  { name: '421 Oak St — Title Insurance', type: 'Insurance', date: 'Mar 10, 2026', status: 'Pending' },
  { name: '88 Bergen Ave — HUD-1 Settlement', type: 'Financial', date: 'Feb 28, 2026', status: 'Signed' },
  { name: '88 Bergen Ave — Purchase Agreement', type: 'Legal', date: 'Feb 15, 2026', status: 'Signed' },
  { name: '15 Elm Ct — Appraisal Report', type: 'Valuation', date: 'Mar 8, 2026', status: 'Complete' },
  { name: '15 Elm Ct — Draw Request #3', type: 'Financial', date: 'Mar 14, 2026', status: 'Approved' },
  { name: '200 Main St — Wiring Instructions', type: 'Financial', date: 'Mar 5, 2026', status: 'Verified' },
  { name: '200 Main St — Environmental Report', type: 'Compliance', date: 'Mar 1, 2026', status: 'Complete' },
];

export default function FastDiscovery() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof DOCUMENTS>([]);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback((term: string) => {
    if (!term.trim()) {
      setResults([]);
      setSearchTime(null);
      return;
    }
    const start = performance.now();
    const lower = term.toLowerCase();
    const filtered = DOCUMENTS.filter(
      (doc) =>
        doc.name.toLowerCase().includes(lower) ||
        doc.type.toLowerCase().includes(lower) ||
        doc.status.toLowerCase().includes(lower)
    );
    const elapsed = performance.now() - start;
    setResults(filtered);
    setSearchTime(Math.max(elapsed, 0.3)); // min display value
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    performSearch(val);
  }, [performSearch]);

  // Auto-demo: type "closing" automatically
  const runDemo = useCallback(() => {
    if (demoRunning) return;
    setDemoRunning(true);
    setQuery('');
    setResults([]);
    setSearchTime(null);

    const word = 'closing';
    let i = 0;
    const interval = setInterval(() => {
      if (i < word.length) {
        const partial = word.slice(0, i + 1);
        setQuery(partial);
        performSearch(partial);
        i++;
      } else {
        clearInterval(interval);
        setDemoRunning(false);
      }
    }, 120);
  }, [demoRunning, performSearch]);

  // Auto-run the demo once after mount
  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      const timer = setTimeout(runDemo, 1500);
      return () => clearTimeout(timer);
    }
  }, [runDemo]);

  return (
    <section className="py-24 bg-dashboard border-b border-phase-1">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-phase-2 mb-4">
            Intuitive Navigation
          </p>
          <h2 className="text-3xl font-medium tracking-tight text-black sm:text-4xl text-balance">
            Find any document in under a second.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-phase-3 leading-relaxed">
            Type a property address, document type, or status — the system surfaces what you need instantly.
          </p>
        </div>

        {/* Search UI */}
        <div className="mx-auto max-w-2xl">
          <div className={`border bg-white transition-all duration-200 ${
            isFocused ? 'border-black shadow-sm' : 'border-phase-1'
          }`}>
            {/* Search bar */}
            <div className="flex items-center px-4 py-3">
              <Search className="w-4 h-4 text-phase-2 mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Search documents... try 'closing' or 'Bergen'"
                className="flex-1 text-sm text-phase-4 placeholder:text-phase-2 bg-transparent focus:outline-none"
              />
              {searchTime !== null && (
                <div className="flex items-center space-x-1 shrink-0 ml-3">
                  <Clock className="w-3 h-3 text-phase-2" />
                  <span className="text-[10px] font-bold tabular-nums text-phase-3">
                    {searchTime < 1 ? '<1' : searchTime.toFixed(0)}ms
                  </span>
                </div>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="border-t border-phase-1">
                {results.map((doc, i) => (
                  <div
                    key={doc.name}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-dashboard transition-colors cursor-pointer ${
                      i < results.length - 1 ? 'border-b border-dashboard' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <FileText className="w-4 h-4 text-phase-2 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-black truncate">{doc.name}</p>
                        <p className="text-[10px] text-phase-2 mt-0.5">{doc.type} · {doc.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0 ml-3">
                      <CheckCircle className="w-3 h-3 text-phase-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-phase-3">
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {query.trim() && results.length === 0 && (
              <div className="border-t border-phase-1 px-4 py-6 text-center">
                <p className="text-xs text-phase-2">No documents match &quot;{query}&quot;</p>
              </div>
            )}
          </div>

          {/* Try it prompt */}
          <div className="flex items-center justify-center mt-4 space-x-3">
            <span className="text-[10px] text-phase-2">Try:</span>
            {['closing', 'Bergen', 'appraisal', 'wiring'].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  performSearch(term);
                  inputRef.current?.focus();
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-phase-3 border border-phase-1 px-2 py-1 hover:border-phase-3 hover:text-black transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
