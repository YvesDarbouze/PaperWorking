'use client';

import { useRouter } from 'next/navigation';
import { GLOSSARY_CATEGORIES } from '@/lib/marketing/glossary-data';
import { PLAYBOOK_CATEGORIES } from '@/lib/marketing/playbook-metrics-data';

const selectClassName =
  'h-11 w-full cursor-pointer rounded-xl border border-white/12 bg-white/[0.04] px-4 text-sm text-white focus:border-[color:var(--color-primary)]/40 focus:outline-none';

/**
 * Two selects on Support hub — jump to glossary or metrics (full page or category).
 */
export default function SupportResourceSelects() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className="block text-left">
        <span className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.08em] text-white/45">
          Real Estate Glossary
        </span>
        <select
          aria-label="Choose glossary section"
          className={selectClassName}
          defaultValue=""
          onChange={(e) => {
            const value = e.target.value;
            if (value) router.push(value);
          }}
        >
          <option value="" disabled>
            Choose a section…
          </option>
          <option value="/support/glossary">Browse all terms</option>
          {GLOSSARY_CATEGORIES.map((cat) => (
            <option key={cat.id} value={`/support/glossary?category=${cat.id}`}>
              {cat.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-left">
        <span className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.08em] text-white/45">
          The Playbook (33 Metrics)
        </span>
        <select
          aria-label="Choose metrics section"
          className={selectClassName}
          defaultValue=""
          onChange={(e) => {
            const value = e.target.value;
            if (value) router.push(value);
          }}
        >
          <option value="" disabled>
            Choose a section…
          </option>
          <option value="/support/metrics">Browse all metrics</option>
          {PLAYBOOK_CATEGORIES.map((cat) => (
            <option key={cat.id} value={`/support/metrics?category=${cat.id}`}>
              {cat.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
