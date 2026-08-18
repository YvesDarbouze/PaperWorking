export const DEFAULT_ACCOUNT_QUOTA_BYTES = 536870912; // 0.5 GB (512 MB)

export interface QuotaAllocation {
  totalAccountQuotaBytes: number;
  activeProjectCount: number;
  quotaPerProjectBytes: number;
}

export interface StorageUsageStats {
  usedBytes: number;
  totalQuotaBytes: number;
  percentageUsed: number;
  remainingBytes: number;
  activeProjectCount: number;
  quotaPerProjectBytes: number;
}

/**
 * Calculates per-project storage quota evenly divided across active projects
 */
export function calculateProjectQuota(
  activeProjectCount: number,
  totalAccountQuotaBytes: number = DEFAULT_ACCOUNT_QUOTA_BYTES
): QuotaAllocation {
  const safeCount = Math.max(1, activeProjectCount);
  const quotaPerProjectBytes = Math.floor(totalAccountQuotaBytes / safeCount);

  return {
    totalAccountQuotaBytes,
    activeProjectCount: safeCount,
    quotaPerProjectBytes,
  };
}

/**
 * Validates if uploading a file exceeds remaining project storage quota
 */
export function validateUploadQuota(
  currentUsedBytes: number,
  projectQuotaBytes: number,
  newFileSizeBytes: number
): { allowed: boolean; remainingBytes: number; errorReason?: string } {
  const remainingBytes = Math.max(0, projectQuotaBytes - currentUsedBytes);

  if (newFileSizeBytes > remainingBytes) {
    const overflowMB = ((newFileSizeBytes - remainingBytes) / (1024 * 1024)).toFixed(2);
    const limitMB = (projectQuotaBytes / (1024 * 1024)).toFixed(0);
    return {
      allowed: false,
      remainingBytes,
      errorReason: `Storage quota exceeded by ${overflowMB} MB. Maximum per-project limit is ${limitMB} MB.`,
    };
  }

  return { allowed: true, remainingBytes: remainingBytes - newFileSizeBytes };
}

/**
 * Generates Storage Usage Stats for display in UI headers
 */
export function getStorageUsageStats(
  usedBytes: number,
  activeProjectCount: number,
  totalAccountQuotaBytes: number = DEFAULT_ACCOUNT_QUOTA_BYTES
): StorageUsageStats {
  const allocation = calculateProjectQuota(activeProjectCount, totalAccountQuotaBytes);
  const percentageUsed = Number(((usedBytes / totalAccountQuotaBytes) * 100).toFixed(1));
  const remainingBytes = Math.max(0, totalAccountQuotaBytes - usedBytes);

  return {
    usedBytes,
    totalQuotaBytes: totalAccountQuotaBytes,
    percentageUsed,
    remainingBytes,
    activeProjectCount: allocation.activeProjectCount,
    quotaPerProjectBytes: allocation.quotaPerProjectBytes,
  };
}

/**
 * Enforces 3-Year IRS Tax Document Deletion Lock
 */
export function validateTaxDocumentDeletion(
  category: string,
  uploadedAtIso: string,
  currentDate: Date = new Date()
): { canDelete: boolean; isTaxLocked: boolean; reason?: string } {
  const isTaxDoc = category.toLowerCase() === 'tax' || category.toLowerCase().includes('generated_forms');
  if (!isTaxDoc) {
    return { canDelete: true, isTaxLocked: false };
  }

  const uploaded = new Date(uploadedAtIso).getTime();
  const now = currentDate.getTime();
  const threeYearsMs = 3 * 365 * 24 * 60 * 60 * 1000;

  const ageMs = now - uploaded;
  if (ageMs < threeYearsMs) {
    const daysRemaining = Math.ceil((threeYearsMs - ageMs) / (1000 * 3600 * 24));
    return {
      canDelete: false,
      isTaxLocked: true,
      reason: `IRS compliance lock: Tax document cannot be deleted for 3 years. ${daysRemaining} days remaining in retention window. Archive available.`,
    };
  }

  return { canDelete: true, isTaxLocked: false };
}
