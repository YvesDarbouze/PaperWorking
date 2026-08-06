import {
  FORBIDDEN_PUBLIC_DEAL_FIELDS,
  PUBLIC_DEAL_DEFAULT,
  bucketValue,
  filterProfiles,
  formatAum,
  formatCompact,
  gradientFor,
  initialsFor,
  profileDisplayName,
  publicDealsFor,
  publicRoi,
  redactDealForPublic,
  sanitizeProfileInput,
  type InvestorProfile,
} from '@/lib/marketplace/investorProfile';

const profile = (over: Partial<InvestorProfile> = {}): InvestorProfile => ({
  uid: 'u1',
  displayName: 'Sophie Bennett',
  profileType: 'individual',
  publicProfile: true,
  ...over,
});

/** A full private project, as it exists in Firestore. */
const rawProject = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  address: '4208 Melrose Ave',
  propertyName: 'Melrose Duplex',
  photoUrl: 'https://example.com/p.jpg',
  phaseStatus: 'Phase 3: Hold',
  city: 'Los Angeles',
  state: 'CA',
  units: 2,
  sellerName: 'Ned Flanders',
  ownerUid: 'u1',
  isPublicOnMarketplace: true,
  financials: {
    purchasePrice: 400_000,
    loanAmount: 300_000,
    monthlyGrossRent: 4_000,
    estimatedARV: 460_000,
  },
  ledgerItems: [{ id: 'l1', amount: 250 }],
  ...over,
});

describe('investor marketplace profiles', () => {
  describe('deal privacy — requirement 3', () => {
    it('defaults to private', () => {
      expect(PUBLIC_DEAL_DEFAULT).toBe(false);
    });

    it('returns null for an unpublished deal', () => {
      expect(redactDealForPublic(rawProject({ isPublicOnMarketplace: false }))).toBeNull();
    });

    it('returns null when the flag is absent entirely', () => {
      const { isPublicOnMarketplace, ...withoutFlag } = rawProject();
      void isPublicOnMarketplace;
      expect(redactDealForPublic(withoutFlag)).toBeNull();
    });

    it('treats a truthy non-true value as private', () => {
      expect(redactDealForPublic(rawProject({ isPublicOnMarketplace: 'yes' }))).toBeNull();
      expect(redactDealForPublic(rawProject({ isPublicOnMarketplace: 1 }))).toBeNull();
    });

    it('exposes only the allowlisted display fields', () => {
      const out = redactDealForPublic(rawProject())!;
      expect(out.address).toBe('4208 Melrose Ave');
      expect(out.phaseStatus).toBe('Phase 3: Hold');
      expect(out.photoUrl).toBeDefined();
      expect(out.city).toBe('Los Angeles');
    });

    it('NEVER leaks a forbidden financial field', () => {
      const out = redactDealForPublic(rawProject())! as unknown as Record<string, unknown>;
      for (const forbidden of FORBIDDEN_PUBLIC_DEAL_FIELDS) {
        expect(out[forbidden]).toBeUndefined();
      }
    });

    it('does not leak an exact purchase price anywhere in the payload', () => {
      const out = redactDealForPublic(rawProject())!;
      const serialised = JSON.stringify(out);
      expect(serialised).not.toContain('400000');
      expect(serialised).not.toContain('300000');
      expect(serialised).not.toContain('Ned Flanders');
    });

    it('conveys scale as a bucket, not a figure', () => {
      const out = redactDealForPublic(rawProject())!;
      expect(out.headlineMetric?.value).toBe('$250k–$500k');
    });

    it('omits the headline metric when there is no price', () => {
      const out = redactDealForPublic(rawProject({ financials: {} }))!;
      expect(out.headlineMetric).toBeUndefined();
    });

    it('handles junk input without throwing', () => {
      expect(redactDealForPublic(null)).toBeNull();
      expect(redactDealForPublic('nope')).toBeNull();
      expect(redactDealForPublic(42)).toBeNull();
    });

    it('publicDealsFor drops every unpublished deal', () => {
      const list = publicDealsFor([
        rawProject({ id: 'a' }),
        rawProject({ id: 'b', isPublicOnMarketplace: false }),
        rawProject({ id: 'c' }),
      ]);
      expect(list.map((d) => d.id)).toEqual(['a', 'c']);
    });
  });

  describe('bucketValue', () => {
    it('buckets across the range', () => {
      expect(bucketValue(50_000 * 100)).toBe('Under $100k');
      expect(bucketValue(150_000 * 100)).toBe('$100k–$250k');
      expect(bucketValue(750_000 * 100)).toBe('$500k–$1M');
      expect(bucketValue(9_000_000 * 100)).toBe('$5M+');
    });

    it('is null for missing input', () => {
      expect(bucketValue(null)).toBeNull();
      expect(bucketValue(undefined)).toBeNull();
      expect(bucketValue(NaN)).toBeNull();
    });
  });

  describe('avatar fallback', () => {
    it('takes first and last initials', () => {
      expect(initialsFor('Sophie Bennett')).toBe('SB');
      expect(initialsFor('Ada Blackwell Lovelace')).toBe('AL');
    });

    it('uses two letters for a single name', () => {
      expect(initialsFor('Sophie')).toBe('SO');
    });

    it('falls back to ? rather than an empty chip', () => {
      expect(initialsFor('')).toBe('?');
      expect(initialsFor(null)).toBe('?');
      expect(initialsFor('   ')).toBe('?');
    });

    it('gradient is deterministic per seed', () => {
      expect(gradientFor('u1')).toBe(gradientFor('u1'));
      expect(gradientFor('u1')).not.toBe(gradientFor('u2'));
    });

    it('gradient handles empty seed', () => {
      expect(gradientFor(null)).toContain('linear-gradient');
    });
  });

  describe('display', () => {
    it('teams show their business name', () => {
      expect(profileDisplayName(profile({ profileType: 'team', businessName: 'Apex Capital' })))
        .toBe('Apex Capital');
    });

    it('teams fall back to display name when unnamed', () => {
      expect(profileDisplayName(profile({ profileType: 'team' }))).toBe('Sophie Bennett');
    });

    it('individuals show their own name even if a business name exists', () => {
      expect(profileDisplayName(profile({ businessName: 'Apex' }))).toBe('Sophie Bennett');
    });

    it('formats compact counts', () => {
      expect(formatCompact(950)).toBe('950');
      expect(formatCompact(1_500)).toBe('1.5k');
      expect(formatCompact(2_400_000)).toBe('2.4M');
      expect(formatCompact(null)).toBe('—');
    });

    it('formats AUM from cents', () => {
      expect(formatAum(4_200_000_00)).toBe('$4.2M');
      expect(formatAum(250_000_00)).toBe('$250k');
      expect(formatAum(null)).toBe('—');
    });
  });

  describe('ROI is opt-in', () => {
    it('is withheld unless explicitly public', () => {
      expect(publicRoi(profile({ avgRoiPct: 18.4 }))).toBe('—');
      expect(publicRoi(profile({ avgRoiPct: 18.4, showRoiPublicly: false }))).toBe('—');
    });

    it('shows once opted in', () => {
      expect(publicRoi(profile({ avgRoiPct: 18.4, showRoiPublicly: true }))).toBe('18.4%');
    });

    it('is a dash when opted in but unset', () => {
      expect(publicRoi(profile({ showRoiPublicly: true }))).toBe('—');
    });
  });

  describe('discovery filtering', () => {
    const people = [
      profile({ uid: 'a', displayName: 'Sophie Bennett', location: 'Austin, TX', strategies: ['flip'] }),
      profile({ uid: 'b', displayName: 'Marcus Aurelius', profileType: 'team', businessName: 'Apex Capital', location: 'Phoenix, AZ', strategies: ['buy_and_hold'] }),
      profile({ uid: 'c', displayName: 'Hidden Person', publicProfile: false, location: 'Austin, TX' }),
    ];

    it('excludes anyone who has not opted into a public profile', () => {
      expect(filterProfiles(people).map((p) => p.uid)).toEqual(['a', 'b']);
    });

    it('filters by profile type', () => {
      expect(filterProfiles(people, { type: 'team' }).map((p) => p.uid)).toEqual(['b']);
      expect(filterProfiles(people, { type: 'individual' }).map((p) => p.uid)).toEqual(['a']);
    });

    it('filters by strategy', () => {
      expect(filterProfiles(people, { strategy: 'flip' }).map((p) => p.uid)).toEqual(['a']);
    });

    it('filters by location, case-insensitively and partially', () => {
      expect(filterProfiles(people, { location: 'austin' }).map((p) => p.uid)).toEqual(['a']);
    });

    it('searches name and company', () => {
      expect(filterProfiles(people, { query: 'sophie' }).map((p) => p.uid)).toEqual(['a']);
      expect(filterProfiles(people, { query: 'apex' }).map((p) => p.uid)).toEqual(['b']);
    });

    it('combines filters', () => {
      expect(filterProfiles(people, { type: 'team', query: 'apex' }).map((p) => p.uid)).toEqual(['b']);
      expect(filterProfiles(people, { type: 'individual', query: 'apex' })).toEqual([]);
    });

    it('returns everything public when unfiltered', () => {
      expect(filterProfiles(people, {})).toHaveLength(2);
    });
  });
});

/* ── Write path (req 4) ──────────────────────────────────────────────────── */

describe('sanitizeProfileInput', () => {
  const ok = (body: unknown) => {
    const r = sanitizeProfileInput(body);
    if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
    return r.value;
  };

  it('rejects a non-object body', () => {
    expect(sanitizeProfileInput(null).ok).toBe(false);
    expect(sanitizeProfileInput('nope').ok).toBe(false);
  });

  it('defaults an unrecognised profileType to individual', () => {
    expect(ok({ profileType: 'enterprise' }).profileType).toBe('individual');
    expect(ok({}).profileType).toBe('individual');
  });

  it('requires a business name for teams', () => {
    const r = sanitizeProfileInput({ profileType: 'team', businessName: '   ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/business name/i);
  });

  it('accepts a named team', () => {
    expect(ok({ profileType: 'team', businessName: ' Apex Capital ' }).businessName).toBe('Apex Capital');
  });

  /* Security: the badge is an admin decision. A self-serve one is worthless. */
  it('never lets the client write isVerified', () => {
    const value = ok({ isVerified: true }) as unknown as Record<string, unknown>;
    expect('isVerified' in value).toBe(false);
  });

  /* Security: counts are maintained atomically by the follow route. */
  it('never lets the client write follower counts', () => {
    const value = ok({ followerCount: 99999, followingCount: 4 }) as unknown as Record<string, unknown>;
    expect('followerCount' in value).toBe(false);
    expect('followingCount' in value).toBe(false);
  });

  it('drops every unknown key rather than merging it', () => {
    const value = ok({ role: 'admin', tier: 'enterprise', aumCents: 10 ** 12 }) as unknown as Record<string, unknown>;
    expect(Object.keys(value).sort()).toEqual([
      'businessName',
      'location',
      'profileType',
      'publicBio',
      'publicProfile',
      'showRoiPublicly',
      'strategies',
      'teamLogoUrl',
      'teamMembers',
      'websiteUrl',
    ]);
  });

  it('drops strategies outside the known set', () => {
    expect(ok({ strategies: ['flip', 'ponzi', 'brrrr', 42] }).strategies).toEqual(['flip', 'brrrr']);
  });

  it('requires an absolute http(s) website', () => {
    expect(sanitizeProfileInput({ websiteUrl: 'example.com' }).ok).toBe(false);
    expect(sanitizeProfileInput({ websiteUrl: 'javascript:alert(1)' }).ok).toBe(false);
    expect(ok({ websiteUrl: 'https://example.com' }).websiteUrl).toBe('https://example.com');
    expect(ok({ websiteUrl: '' }).websiteUrl).toBe('');
  });

  it('caps the bio at 600 characters', () => {
    expect(ok({ publicBio: 'x'.repeat(900) }).publicBio).toHaveLength(600);
  });

  it('rejects a malformed invite email', () => {
    const r = sanitizeProfileInput({
      profileType: 'team',
      businessName: 'Apex',
      teamMembers: [{ displayName: 'Ada', invitedEmail: 'not-an-email' }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/invite email/i);
  });

  it('keeps valid invites and defaults a blank role', () => {
    const members = ok({
      profileType: 'team',
      businessName: 'Apex',
      teamMembers: [{ displayName: 'Ada', invitedEmail: 'ada@apex.com', role: '' }],
    }).teamMembers;
    expect(members).toEqual([
      { uid: '', displayName: 'Ada', role: 'Member', invitedEmail: 'ada@apex.com' },
    ]);
  });

  it('drops rows with no identity at all', () => {
    const members = ok({
      profileType: 'team',
      businessName: 'Apex',
      teamMembers: [{ displayName: '', invitedEmail: '', role: 'Analyst' }],
    }).teamMembers;
    expect(members).toEqual([]);
  });

  it('caps the roster at 50 members', () => {
    const teamMembers = Array.from({ length: 80 }, (_, i) => ({ displayName: `M${i}`, role: 'Member' }));
    expect(ok({ profileType: 'team', businessName: 'Apex', teamMembers }).teamMembers).toHaveLength(50);
  });

  /* Switching back to Individual must not leave a roster that would republish
     the moment the account flipped to a team again. */
  it('clears the roster for individuals', () => {
    const members = ok({
      profileType: 'individual',
      teamMembers: [{ displayName: 'Ada', invitedEmail: 'ada@apex.com' }],
    }).teamMembers;
    expect(members).toEqual([]);
  });

  it('treats non-true visibility values as private', () => {
    expect(ok({ publicProfile: 'yes', showRoiPublicly: 1 })).toMatchObject({
      publicProfile: false,
      showRoiPublicly: false,
    });
    expect(ok({ publicProfile: true, showRoiPublicly: true })).toMatchObject({
      publicProfile: true,
      showRoiPublicly: true,
    });
  });
});
