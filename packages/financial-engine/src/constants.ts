/**
 * Financial Engine Version Constant
 *
 * Version 1: Legacy heuristic calculation (falsified heuristic, removed in FIX-07).
 * Version 2: Canonical True DCF root-finding IRR with discrete cash flows and exact loan amortization.
 * Version 3: Privacy-preserving canonical engine with anonymous sealed payloads, per-user envelope encryption (DEK/KEK), and crypto-shredding support (Review C5.1).
 */
export const ENGINE_VERSION = 4;

/**
 * Next Financial Engine Version (Wave 3 Preparation)
 * Version 5: Advanced multi-tier debt waterfall and continuous sensitivity analysis.
 */
export const NEXT_ENGINE_VERSION = 5;

/**
 * Feature flag for Engine Version 4 dark launch.
 * Retired to hard-true following founder authorization and Wave 2 gate flip (2026-09-17).
 */
export const ENGINE_V4_ENABLED: boolean = true;
