import {
  calculateProjectQuota,
  validateUploadQuota,
  getStorageUsageStats,
  validateTaxDocumentDeletion,
  DEFAULT_ACCOUNT_QUOTA_BYTES,
} from '../quota';

describe('Agent 7: Storage Quota & Retention System Unit Tests', () => {
  test('1. calculateProjectQuota divides 0.5 GB total account quota evenly across active projects', () => {
    const allocation1 = calculateProjectQuota(1);
    expect(allocation1.totalAccountQuotaBytes).toBe(536870912); // 0.5 GB
    expect(allocation1.quotaPerProjectBytes).toBe(536870912);

    const allocation3 = calculateProjectQuota(3);
    expect(allocation3.quotaPerProjectBytes).toBe(Math.floor(536870912 / 3)); // 178,956,970 bytes (~178.9 MB)
  });

  test('2. validateUploadQuota permits upload when file size is within remaining quota', () => {
    const projectQuota = 178956970;
    const currentUsed = 10000000; // 10 MB
    const newFileSize = 5000000; // 5 MB

    const res = validateUploadQuota(currentUsed, projectQuota, newFileSize);
    expect(res.allowed).toBe(true);
    expect(res.remainingBytes).toBe(projectQuota - currentUsed - newFileSize);
  });

  test('3. validateUploadQuota rejects upload when file size exceeds remaining project quota', () => {
    const projectQuota = 178956970;
    const currentUsed = 175000000; // 175 MB
    const newFileSize = 10000000; // 10 MB overflow

    const res = validateUploadQuota(currentUsed, projectQuota, newFileSize);
    expect(res.allowed).toBe(false);
    expect(res.errorReason).toContain('Storage quota exceeded');
  });

  test('4. getStorageUsageStats computes percentage used and usage metrics accurately', () => {
    const used = 268435456; // 0.25 GB (50%)
    const stats = getStorageUsageStats(used, 2);

    expect(stats.percentageUsed).toBe(50.0);
    expect(stats.usedBytes).toBe(used);
    expect(stats.remainingBytes).toBe(268435456);
    expect(stats.quotaPerProjectBytes).toBe(268435456);
  });

  test('5. validateTaxDocumentDeletion blocks deletion of tax documents under 3 years old', () => {
    const currentDate = new Date('2026-08-18T00:00:00Z');
    const recentTaxUploadDate = new Date('2025-06-01T00:00:00Z').toISOString(); // ~1.2 years old

    const res = validateTaxDocumentDeletion('tax', recentTaxUploadDate, currentDate);
    expect(res.canDelete).toBe(false);
    expect(res.isTaxLocked).toBe(true);
    expect(res.reason).toContain('IRS compliance lock');
  });

  test('6. validateTaxDocumentDeletion allows deletion of non-tax documents or tax documents >= 3 years old', () => {
    const currentDate = new Date('2026-08-18T00:00:00Z');
    const oldTaxUploadDate = new Date('2022-01-01T00:00:00Z').toISOString(); // 4.6 years old

    const nonTaxRes = validateTaxDocumentDeletion('acquisition', new Date().toISOString(), currentDate);
    expect(nonTaxRes.canDelete).toBe(true);
    expect(nonTaxRes.isTaxLocked).toBe(false);

    const oldTaxRes = validateTaxDocumentDeletion('tax', oldTaxUploadDate, currentDate);
    expect(oldTaxRes.canDelete).toBe(true);
    expect(oldTaxRes.isTaxLocked).toBe(false);
  });
});
