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

  it('computes exact weight increments for each field', () => {
    // Only display name -> 25%
    const r1 = calculateProfileCompleteness({ displayName: 'Alex Morgan' });
    expect(r1.score).toBe(25);

    // Display name + Company -> 25 + 15 = 40%
    const r2 = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: 'Apex Capital',
    });
    expect(r2.score).toBe(40);

    // + Bio -> 40 + 20 = 60%
    const r3 = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: 'Apex Capital',
      publicBio: 'Commercial operator',
    });
    expect(r3.score).toBe(60);

    // + Avatar -> 60 + 15 = 75%
    const r4 = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: 'Apex Capital',
      publicBio: 'Commercial operator',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
    expect(r4.score).toBe(75);

    // + Location -> 75 + 10 = 85%
    const r5 = calculateProfileCompleteness({
      displayName: 'Alex Morgan',
      companyName: 'Apex Capital',
      publicBio: 'Commercial operator',
      avatarUrl: 'https://example.com/avatar.jpg',
      location: 'Austin, TX',
    });
    expect(r5.score).toBe(85);

    // + Strategies -> 85 + 15 = 100%
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

  it('accepts businessName as company fallback and headline as bio fallback', () => {
    const res = calculateProfileCompleteness({
      displayName: 'Operator Name',
      businessName: 'Apex Holding',
      headline: 'Multifamily syndicator',
    });
    // 25 (name) + 15 (company) + 20 (bio) = 60
    expect(res.score).toBe(60);
  });
});
