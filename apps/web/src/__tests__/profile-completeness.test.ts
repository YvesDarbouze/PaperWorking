import { calculateProfileCompleteness } from '../../lib/profile/completeness';

describe('Profile Completeness Calculation', () => {
  it('returns 0% when profile is null or undefined', () => {
    expect(calculateProfileCompleteness(null).score).toBe(0);
    expect(calculateProfileCompleteness(undefined).score).toBe(0);
  });

  it('returns 0% when all fields are empty or whitespace', () => {
    const res = calculateProfileCompleteness({
      displayName: '   ',
      companyName: '',
      headline: '',
      publicBio: '  ',
      avatarUrl: '',
      location: '   ',
      strategies: [],
    });
    expect(res.score).toBe(0);
  });

  it('computes exact equal-weight increments across all 6 checklist items (17%, 33%, 50%, 67%, 83%, 100%)', () => {
    // 1 of 6 -> round(1/6 * 100) = 17%
    const r1 = calculateProfileCompleteness({ displayName: 'Alex Morgan' });
    expect(r1.score).toBe(17);

    // 2 of 6 -> round(2/6 * 100) = 33%
    const r2 = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: 'Apex Capital',
    });
    expect(r2.score).toBe(33);

    // 3 of 6 -> round(3/6 * 100) = 50%
    const r3 = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: 'Apex Capital',
      publicBio: 'Commercial operator',
    });
    expect(r3.score).toBe(50);

    // 4 of 6 -> round(4/6 * 100) = 67%
    const r4 = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: 'Apex Capital',
      publicBio: 'Commercial operator',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
    expect(r4.score).toBe(67);

    // 5 of 6 -> round(5/6 * 100) = 83%
    const r5 = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: 'Apex Capital',
      publicBio: 'Commercial operator',
      avatarUrl: 'https://example.com/avatar.jpg',
      location: 'Austin, TX',
    });
    expect(r5.score).toBe(83);

    // 6 of 6 -> round(6/6 * 100) = 100%
    const r6 = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: 'Apex Capital',
      publicBio: 'Commercial operator',
      avatarUrl: 'https://example.com/avatar.jpg',
      location: 'Austin, TX',
      strategies: ['multifamily', 'commercial'],
    });
    expect(r6.score).toBe(100);
  });

  it('Bug_77: completing 4 of 6 criteria (Display Name, Headline & Bio, Location, Investment Strategies) renders 67% instead of 70%', () => {
    const res = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: '',
      headline: 'Commercial & Multifamily Syndicator',
      publicBio: 'Value-add acquisitions across Sunbelt markets.',
      avatarUrl: '',
      location: 'Austin, TX',
      strategies: ['multifamily'],
    });
    const metCount = res.criteria.filter((c) => c.met).length;
    expect(res.criteria.length).toBe(6);
    expect(metCount).toBe(4);
    expect(res.score).toBe(67);
  });

  it('accepts businessName as company fallback and headline as bio fallback (3 of 6 = 50%)', () => {
    const res = calculateProfileCompleteness({
      displayName: 'Operator Name',
      businessName: 'Apex Holding',
      headline: 'Multifamily syndicator',
    });
    expect(res.score).toBe(50);
  });
});
