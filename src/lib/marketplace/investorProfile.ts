/**
 * Investor marketplace profiles — types and pure logic.
 *
 * React-free so the redaction rules, initials/gradient derivation, and stat
 * formatting are unit-testable on their own. The redaction rules in particular
 * are security-relevant: they decide what leaves a private project when an
 * investor publishes it to their public profile.
 *
 * ── Firestore data model ──────────────────────────────────────────────────
 *
 *   users/{uid}
 *     profileType        'individual' | 'team'
 *     businessName?      team display name
 *     teamLogoUrl?
 *     publicBio?
 *     location?
 *     websiteUrl?
 *     strategies?        InvestmentStrategy[]
 *     isVerified?        boolean — set by admin review, never self-serve
 *     publicProfile?     boolean — opt in to appearing in discovery
 *     followerCount?     denormalised, maintained on follow/unfollow
 *     followingCount?    denormalised
 *     aumCents?          assets under management
 *     avgRoiPct?         only surfaced when `showRoiPublicly`
 *     showRoiPublicly?   boolean
 *
 *   projects/{projectId}
 *     isPublicOnMarketplace  boolean — DEFAULT FALSE (see PUBLIC_DEAL_DEFAULT)
 *
 *   investorFollowers/{followerUid}_{targetUid}
 *     followerUid, targetUid, createdAt, consent
 *     — the existing flat model; deliberately kept rather than migrated to a
 *       nested followers/{uid}/following/{id} shape, which would have meant
 *       dual-writing two subcollections per follow and rewriting
 *       `actions/follows.ts`, the Follow button, and the E2E helpers.
 *     Queries: following = where followerUid == me · followers = where targetUid == me
 */

export type ProfileType = 'individual' | 'team';

export type InvestmentStrategy =
  | 'buy_and_hold'
  | 'flip'
  | 'brrrr'
  | 'short_term_rental'
  | 'multifamily'
  | 'commercial';

export const STRATEGY_LABELS: Record<InvestmentStrategy, string> = {
  buy_and_hold: 'Buy & Hold',
  flip: 'Flip',
  brrrr: 'BRRRR',
  short_term_rental: 'Short-Term Rental',
  multifamily: 'Multifamily',
  commercial: 'Commercial',
};

export interface TeamMember {
  uid: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
  /** Pending invites carry an email but no uid yet. */
  invitedEmail?: string;
}

export interface InvestorProfile {
  uid: string;
  displayName: string;
  profileType: ProfileType;
  businessName?: string;
  avatarUrl?: string;
  teamLogoUrl?: string;
  publicBio?: string;
  location?: string;
  websiteUrl?: string;
  strategies?: InvestmentStrategy[];
  isVerified?: boolean;
  publicProfile?: boolean;
  followerCount?: number;
  followingCount?: number;
  dealCount?: number;
  aumCents?: number;
  avgRoiPct?: number;
  showRoiPublicly?: boolean;
  teamMembers?: TeamMember[];
}

/* ── Deal privacy ────────────────────────────────────────────────────────── */

/** Deals are private until explicitly published. Requirement 3. */
export const PUBLIC_DEAL_DEFAULT = false;

/**
 * The ONLY fields that may appear on a public profile.
 *
 * Anything not listed is withheld. This is an allowlist on purpose: a denylist
 * would leak every new financial field the moment someone added one.
 */
export const PUBLIC_DEAL_FIELDS = [
  'id',
  'address',
  'propertyName',
  'photoUrl',
  'phaseStatus',
  'city',
  'state',
  'propertyType',
  'units',
] as const;

/**
 * Fields that must NEVER leave a project, even if a future refactor adds them
 * to the allowlist by mistake. Checked explicitly by `redactDealForPublic`
 * and asserted in tests.
 */
export const FORBIDDEN_PUBLIC_DEAL_FIELDS = [
  'purchasePrice',
  'listedPrice',
  'loanAmount',
  'downPayment',
  'totalCashInvested',
  'monthlyGrossRent',
  'estimatedARV',
  'financials',
  'ledgerItems',
  'sellerName',
  'ownerUid',
] as const;

export interface PublicDeal {
  id: string;
  address?: string;
  propertyName?: string;
  photoUrl?: string;
  phaseStatus?: string;
  city?: string;
  state?: string;
  propertyType?: string;
  units?: number;
  /** A single coarse headline metric — never an exact financial figure. */
  headlineMetric?: { label: string; value: string };
}

/**
 * Coarse buckets so a public card can convey scale without disclosing price.
 * Exact figures are the thing requirement 3 forbids.
 */
export function bucketValue(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return null;
  const dollars = cents / 100;
  if (dollars < 100_000) return 'Under $100k';
  if (dollars < 250_000) return '$100k–$250k';
  if (dollars < 500_000) return '$250k–$500k';
  if (dollars < 1_000_000) return '$500k–$1M';
  if (dollars < 5_000_000) return '$1M–$5M';
  return '$5M+';
}

/**
 * Strip a project down to what may be shown publicly.
 *
 * Returns null when the deal is not published — callers should never have to
 * remember to check the flag separately.
 */
export function redactDealForPublic(project: unknown): PublicDeal | null {
  if (!project || typeof project !== 'object') return null;
  const p = project as Record<string, unknown>;

  if (p.isPublicOnMarketplace !== true) return null;

  const out: PublicDeal = { id: String(p.id ?? '') };
  for (const field of PUBLIC_DEAL_FIELDS) {
    if (field === 'id') continue;
    const v = p[field];
    if (v !== undefined && v !== null) {
      (out as unknown as Record<string, unknown>)[field] = v;
    }
  }

  // Headline metric is bucketed, never exact.
  const fin = (p.financials ?? {}) as Record<string, unknown>;
  const price = typeof fin.purchasePrice === 'number' ? fin.purchasePrice * 100 : null;
  const bucket = bucketValue(price);
  if (bucket) out.headlineMetric = { label: 'Value range', value: bucket };

  return out;
}

/** Redact a list, dropping anything unpublished. */
export function publicDealsFor(projects: unknown[]): PublicDeal[] {
  return projects
    .map(redactDealForPublic)
    .filter((d): d is PublicDeal => d !== null);
}

/* ── Avatar ──────────────────────────────────────────────────────────────── */

/** Up to two initials. Falls back to '?' rather than rendering an empty chip. */
export function initialsFor(name: string | undefined | null): string {
  const clean = (name ?? '').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic gradient so a given person always gets the same avatar. */
export function gradientFor(seed: string | undefined | null): string {
  const s = seed ?? '';
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const h1 = hash % 360;
  const h2 = (h1 + 48) % 360;
  return `linear-gradient(135deg, hsl(${h1} 45% 32%) 0%, hsl(${h2} 45% 20%) 100%)`;
}

/* ── Display ─────────────────────────────────────────────────────────────── */

/** Teams show their business name; individuals their display name. */
export function profileDisplayName(p: InvestorProfile): string {
  if (p.profileType === 'team') return p.businessName?.trim() || p.displayName;
  return p.displayName;
}

export function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatAum(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '—';
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}k`;
  return `$${Math.round(dollars)}`;
}

/** ROI is withheld unless the investor opted in. */
export function publicRoi(p: InvestorProfile): string {
  if (!p.showRoiPublicly || p.avgRoiPct === undefined || p.avgRoiPct === null) return '—';
  return `${p.avgRoiPct.toFixed(1)}%`;
}

/* ── Discovery filtering ─────────────────────────────────────────────────── */

export interface DiscoveryFilters {
  type?: ProfileType | 'all';
  location?: string;
  strategy?: InvestmentStrategy | 'all';
  query?: string;
}

/**
 * Filter the discovery grid.
 *
 * Profiles that have not opted in are excluded first — discovery must never
 * surface someone who did not publish.
 */
export function filterProfiles(
  profiles: InvestorProfile[],
  filters: DiscoveryFilters = {},
): InvestorProfile[] {
  const { type = 'all', location, strategy = 'all', query } = filters;
  const q = query?.trim().toLowerCase();
  const loc = location?.trim().toLowerCase();

  return profiles.filter((p) => {
    if (p.publicProfile !== true) return false;
    if (type !== 'all' && p.profileType !== type) return false;
    if (strategy !== 'all' && !(p.strategies ?? []).includes(strategy)) return false;
    if (loc && !(p.location ?? '').toLowerCase().includes(loc)) return false;
    if (q) {
      const haystack = [p.displayName, p.businessName, p.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/* ── Write path (req 4) ──────────────────────────────────────────────────── */

/**
 * The fields a profile owner may write.
 *
 * `isVerified` is deliberately absent: verification is an admin decision, and a
 * self-serve badge would mean nothing. Same for `followerCount` /
 * `followingCount`, which are maintained atomically by the follow route — a
 * client that could set them could inflate its own social proof.
 */
export interface EditableProfile {
  profileType: ProfileType;
  businessName: string;
  teamLogoUrl: string;
  publicBio: string;
  location: string;
  websiteUrl: string;
  strategies: InvestmentStrategy[];
  publicProfile: boolean;
  showRoiPublicly: boolean;
  teamMembers: TeamMember[];
}

export type SanitizeResult =
  | { ok: true; value: EditableProfile }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STRATEGIES = new Set<string>(Object.keys(STRATEGY_LABELS));

export const MAX_TEAM_MEMBERS = 50;
export const MAX_BIO_LENGTH = 600;

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/**
 * Validate and normalise a profile PUT body.
 *
 * Pure so the rules that decide what reaches Firestore are testable without a
 * database. Unknown keys are dropped rather than merged — the caller writes the
 * returned object, so anything not named here can never be persisted.
 */
export function sanitizeProfileInput(body: unknown): SanitizeResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid profile payload.' };
  const b = body as Record<string, unknown>;

  const profileType: ProfileType = b.profileType === 'team' ? 'team' : 'individual';
  const businessName = str(b.businessName, 120);

  // A team without a name renders as a blank card in discovery.
  if (profileType === 'team' && !businessName) {
    return { ok: false, error: 'Investment Teams need a business name.' };
  }

  const websiteUrl = str(b.websiteUrl, 300);
  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
    return { ok: false, error: 'Website must start with http:// or https://' };
  }

  const strategies = Array.isArray(b.strategies)
    ? (b.strategies.filter(
        (s): s is InvestmentStrategy => typeof s === 'string' && VALID_STRATEGIES.has(s),
      ))
    : [];

  const rawMembers = Array.isArray(b.teamMembers) ? b.teamMembers : [];

  const badEmail = rawMembers.some((m) => {
    const e = (m as { invitedEmail?: unknown })?.invitedEmail;
    return typeof e === 'string' && e.trim() !== '' && !EMAIL_RE.test(e.trim());
  });
  if (badEmail) return { ok: false, error: 'One of the invite emails is not valid.' };

  const teamMembers: TeamMember[] = rawMembers
    .slice(0, MAX_TEAM_MEMBERS)
    .map((raw) => {
      const m = (raw ?? {}) as Record<string, unknown>;
      return {
        uid: str(m.uid, 128),
        displayName: str(m.displayName, 120),
        role: str(m.role, 60) || 'Member',
        invitedEmail: str(m.invitedEmail, 200),
      };
    })
    // A row with neither an identity nor an email is noise on the public roster.
    .filter((m) => m.uid || m.invitedEmail || m.displayName);

  return {
    ok: true,
    value: {
      profileType,
      businessName,
      teamLogoUrl: str(b.teamLogoUrl, 500),
      publicBio: str(b.publicBio, MAX_BIO_LENGTH),
      location: str(b.location, 120),
      websiteUrl,
      strategies,
      publicProfile: b.publicProfile === true,
      showRoiPublicly: b.showRoiPublicly === true,
      // Individuals have no roster; keeping stale members would republish them
      // the moment the account flipped back to a team.
      teamMembers: profileType === 'team' ? teamMembers : [],
    },
  };
}
