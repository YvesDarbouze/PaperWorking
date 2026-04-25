'use client';

/**
 * LifecycleGrid.tsx — PaperWorking Landing Page: Phase Overview
 *
 * A 4-column feature grid outlining the REI investment lifecycle.
 * Sits between the hero and the FlippingPhases deep-dive, anchored
 * at id="how-it-works" so the hero secondary CTA scrolls here.
 *
 * Accessibility contract:
 *   All icons are aria-hidden="true" — meaning is carried by <h3> text.
 *   Phase counter badges are aria-hidden — "Phase 01" is redundant with the <h3>.
 *   Section has an aria-labelledby pointing to the section heading.
 *   Card <article> elements each have an aria-label for landmark navigation.
 *
 * Color / contrast:
 *   Phase 1 (#f2f2f2) → text #0d0d0d — 17.1:1  WCAG AAA ✅
 *   Phase 2 (#cccccc) → text #0d0d0d — 10.5:1  WCAG AAA ✅
 *   Phase 3 (#a5a5a5) → text #0d0d0d —  5.6:1  WCAG AA  ✅
 *   Phase 4 (#595959) → text #ffffff —  7.2:1  WCAG AAA ✅
 *   (verified via contrast.ts auditPalette())
 */

import { motion } from 'framer-motion';

// ─── Phase data ───────────────────────────────────────────────────────────────

const PHASES = [
  {
    id:          '01',
    surfaceClass:'pw-phase-sourcing',  // #f2f2f2 → dark text
    label:       'Phase 1',
    name:        'Source & Syndicate',
    tagline:     'Assemble capital and generate LOIs.',
    detail:      'Build your investor roster, model capital stack scenarios, and issue Letters of Intent directly from your command center.',
    bullets:     ['Investor CRM', 'Capital stack modeling', 'LOI generation'],
    icon:        <SourceIcon />,
  },
  {
    id:          '02',
    surfaceClass:'pw-phase-contract',  // #cccccc → dark text
    label:       'Phase 2',
    name:        'Acquire & Organize',
    tagline:     'Clear contingencies and manage the document vault.',
    detail:      'Track inspection deadlines, title search status, and financing milestones. Every document version-controlled in one place.',
    bullets:     ['Contingency tracker', 'Document vault', 'Closing checklist'],
    icon:        <AcquireIcon />,
  },
  {
    id:          '03',
    surfaceClass:'pw-phase-rehab',     // #a5a5a5 → dark text
    label:       'Phase 3',
    name:        'Rehab & Track Margins',
    tagline:     'Monitor burn rate and milestone payouts.',
    detail:      'Log contractor bids, set milestone-based payment triggers, and watch your 70% Rule margin in real time as costs accumulate.',
    bullets:     ['Burn rate monitor', 'Milestone payouts', '70% Rule gauge'],
    icon:        <RehabIcon />,
  },
  {
    id:          '04',
    surfaceClass:'pw-phase-closed',    // #595959 → white text
    label:       'Phase 4',
    name:        'Close & Reconcile',
    tagline:     'Calculate net proceeds and export tax docs.',
    detail:      'Run prorated cost reconciliation, estimate capital gains exposure, and generate settlement ledgers ready for your CPA.',
    bullets:     ['Net proceeds calculator', 'Cap gains estimator', 'Tax doc export'],
    icon:        <CloseIcon />,
  },
] as const;

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
};

const headingVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function LifecycleGrid() {
  return (
    <section
      id="how-it-works"
      className="lifecycle-section"
      aria-labelledby="lifecycle-heading"
    >
      {/* Section header */}
      <motion.div
        className="lifecycle-header"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={containerVariants}
      >
        <motion.p variants={headingVariants} className="lifecycle-eyebrow">
          The REI Lifecycle
        </motion.p>
        <motion.h2 variants={headingVariants} id="lifecycle-heading" className="lifecycle-heading">
          Four phases. One system.
        </motion.h2>
        <motion.p variants={headingVariants} className="lifecycle-subheading">
          Every deal moves through the same lifecycle. PaperWorking structures
          each phase so nothing falls through the cracks.
        </motion.p>
      </motion.div>

      {/* 4-column grid */}
      <motion.div
        className="lifecycle-grid"
        role="list"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={containerVariants}
      >
        {PHASES.map((phase) => (
          <motion.article
            key={phase.id}
            className={`lifecycle-card ${phase.surfaceClass}`}
            variants={cardVariants}
            role="listitem"
            aria-label={`${phase.label}: ${phase.name}`}
          >
            {/* Card header row */}
            <div className="lifecycle-card-header">
              {/* Phase counter — decorative, aria-hidden */}
              <span className="lifecycle-phase-badge" aria-hidden="true">
                {phase.label}
              </span>

              {/* Icon — aria-hidden, meaning carried by h3 */}
              <div className="lifecycle-icon-wrap" aria-hidden="true">
                {phase.icon}
              </div>
            </div>

            {/* Phase name — semantic h3 */}
            <h3 className="lifecycle-card-name">{phase.name}</h3>

            {/* Tagline */}
            <p className="lifecycle-card-tagline">{phase.tagline}</p>

            {/* Detail */}
            <p className="lifecycle-card-detail">{phase.detail}</p>

            {/* Bullet list */}
            <ul className="lifecycle-card-bullets" aria-label={`${phase.name} capabilities`}>
              {phase.bullets.map((bullet) => (
                <li key={bullet} className="lifecycle-card-bullet">
                  <span className="lifecycle-bullet-dot" aria-hidden="true" />
                  {bullet}
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}

// ─── Phase Icons (inline SVG, no external dependency) ────────────────────────

function SourceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.41 1.41M14.36 14.36l1.41 1.41M4.22 15.78l1.41-1.41M14.36 5.64l1.41-1.41"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AcquireIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="14" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function RehabIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 17l4-4 3 3 7-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 10l4 4 6-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
