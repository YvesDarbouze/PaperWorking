import { describe, expect, it } from '@jest/globals';
import { validateUploadQuota, calculateProjectQuota } from '../lib/storage/quota.js';
import { getCategoryByFilename } from '../lib/storage/categories.js';
import { validateUploadInput, extractFileExtension } from '../lib/upload/validation.js';
import { parseAddressFallback, mapGoogleValidationResponse } from '../lib/places/validate.js';
import { validateVisibilityPatch } from '../lib/projects/visibility.js';
import {
  validateTaskAssignBody,
  isTaskAssignBlocked,
} from '../lib/tasks/assign.js';
import { expandListingsToRentPayments } from '../lib/rent-history/payments.js';
import {
  parseStreetViewCoordinates,
  parseStreetViewQuery,
  buildStreetViewStaticUrl,
} from '../lib/maps/street-view-params.js';

describe('Phase 4p storage/upload libs', () => {
  it('validateUploadQuota rejects overflow', () => {
    const result = validateUploadQuota(100, 200, 150);
    expect(result.allowed).toBe(false);
    expect(result.errorReason).toContain('Storage quota exceeded');
  });

  it('getCategoryByFilename maps tax docs', () => {
    expect(getCategoryByFilename('schedule_e_2025.pdf')).toBe('tax');
  });

  it('validateUploadInput rejects disallowed extension', () => {
    expect(validateUploadInput({ fileName: 'virus.exe', fileSizeBytes: 100 }).ok).toBe(false);
  });

  it('extractFileExtension returns lowercase ext', () => {
    expect(extractFileExtension('Doc.PDF')).toBe('.pdf');
  });

  it('calculateProjectQuota divides evenly', () => {
    expect(calculateProjectQuota(2).quotaPerProjectBytes).toBeGreaterThan(0);
  });
});

describe('Phase 4p places/projects/tasks libs', () => {
  it('parseAddressFallback splits comma-separated address', () => {
    const parsed = parseAddressFallback('123 Main St, Austin, TX 78701');
    expect(parsed.components.city).toBe('Austin');
    expect(parsed.verdict.fallback).toBe(true);
  });

  it('mapGoogleValidationResponse extracts components', () => {
    const mapped = mapGoogleValidationResponse('123 Main', {
      result: {
        address: {
          postalAddress: { addressLines: ['123 Main St'] },
          addressComponents: [
            { componentType: 'locality', componentName: { text: 'Austin' } },
          ],
        },
        verdict: { validationGranularity: 'PREMISE' },
        geocode: { placeId: 'place-1' },
      },
    });
    expect(mapped.placeId).toBe('place-1');
    expect(mapped.components.city).toBe('Austin');
  });

  it('validateVisibilityPatch requires boolean', () => {
    expect(validateVisibilityPatch({ isPublic: true }).ok).toBe(true);
    expect(validateVisibilityPatch({ isPublic: 'yes' }).ok).toBe(false);
  });

  it('validateTaskAssignBody requires ids', () => {
    expect(validateTaskAssignBody({ taskId: 't1', assigneeUid: 'u2' }).ok).toBe(true);
    expect(validateTaskAssignBody({}).ok).toBe(false);
  });

  it('isTaskAssignBlocked for solo investor', () => {
    expect(isTaskAssignBlocked('investor')).toBe(true);
    expect(isTaskAssignBlocked('investment_team')).toBe(false);
  });
});

describe('Phase 4p rent-history and street-view libs', () => {
  it('expandListingsToRentPayments creates monthly rows', () => {
    const payments = expandListingsToRentPayments(
      [{ price: 2000, listedDate: '2026-01-15', removedDate: '2026-02-20' }],
      new Date('2026-02-28'),
    );
    expect(payments.length).toBeGreaterThanOrEqual(2);
    expect(payments[0].modality).toBe('long_term_rental');
  });

  it('parseStreetViewCoordinates rejects invalid input', () => {
    expect(parseStreetViewCoordinates('bad', 1).ok).toBe(false);
  });

  it('parseStreetViewQuery clamps dimensions', () => {
    const parsed = parseStreetViewQuery({ lat: 30.2, lng: -97.7, w: 9999, h: 9999 });
    expect(parsed?.width).toBe(1280);
    expect(parsed?.height).toBe(800);
  });

  it('buildStreetViewStaticUrl includes key', () => {
    const url = buildStreetViewStaticUrl('test-key', {
      lat: 1,
      lng: 2,
      metadataOnly: false,
      fov: 90,
      pitch: 0,
      width: 600,
      height: 400,
    });
    expect(url).toContain('key=test-key');
  });
});
