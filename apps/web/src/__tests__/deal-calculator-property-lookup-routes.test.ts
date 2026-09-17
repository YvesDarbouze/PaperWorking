// Verification of backward-compatible historical alias: /api/deal-analyzer/property-lookup -> /api/deal-calculator/property-lookup
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import {
  GET as canonicalGet,
  POST as canonicalPost,
} from '@/app/api/deal-calculator/property-lookup/route';
import {
  GET as aliasGet,
  POST as aliasPost,
} from '@/app/api/deal-analyzer/property-lookup/route'; // Historical alias route

describe('Deal Calculator & Deal Analyzer Property Lookup Routes (Historical Alias Parity)', () => {
  const originalRentCastKey = process.env.RENTCAST_API_KEY;
  const originalAttomKey = process.env.ATTOM_API_KEY;
  let warnSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    delete process.env.RENTCAST_API_KEY;
    delete process.env.ATTOM_API_KEY;
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalRentCastKey !== undefined) {
      process.env.RENTCAST_API_KEY = originalRentCastKey;
    } else {
      delete process.env.RENTCAST_API_KEY;
    }
    if (originalAttomKey !== undefined) {
      process.env.ATTOM_API_KEY = originalAttomKey;
    } else {
      delete process.env.ATTOM_API_KEY;
    }
    warnSpy.mockRestore();
  });

  describe('POST routes parity and behavior', () => {
    it('returns 400 error when address is missing on canonical and alias', async () => {
      const canonicalReq = new NextRequest(
        'http://localhost:3000/api/deal-calculator/property-lookup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );
      const aliasReq = new NextRequest(
        'http://localhost:3000/api/deal-analyzer/property-lookup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );

      const canonicalRes = await canonicalPost(canonicalReq);
      const aliasRes = await aliasPost(aliasReq);

      expect(canonicalRes.status).toBe(400);
      expect(aliasRes.status).toBe(400);

      const canonicalJson = await canonicalRes.json();
      const aliasJson = await aliasRes.json();

      expect(canonicalJson).toEqual(aliasJson);
      expect(canonicalJson.error).toBe('Property address is required for property data lookup');

      // Assert deprecation headers on alias
      expect(aliasRes.headers.get('Deprecation')).toBe('true');
      expect(aliasRes.headers.get('Link')).toBe(
        '</api/deal-calculator/property-lookup>; rel="successor-version"',
      );
      expect(aliasRes.headers.get('Warning')).toContain(
        '/api/deal-calculator/property-lookup',
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] POST /api/deal-analyzer/property-lookup'),
      );
    });

    it('returns honest unconfigured response when credentials are absent, with identical payloads', async () => {
      const testAddress = '742 Evergreen Terrace, Springfield, OR';
      const canonicalReq = new NextRequest(
        'http://localhost:3000/api/deal-calculator/property-lookup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: testAddress }),
        },
      );
      const aliasReq = new NextRequest(
        'http://localhost:3000/api/deal-analyzer/property-lookup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: testAddress }),
        },
      );

      const canonicalRes = await canonicalPost(canonicalReq);
      const aliasRes = await aliasPost(aliasReq);

      expect(canonicalRes.status).toBe(200);
      expect(aliasRes.status).toBe(200);

      const canonicalJson = await canonicalRes.json();
      const aliasJson = await aliasRes.json();

      expect(canonicalJson).toEqual(aliasJson);
      expect(canonicalJson.configured).toBe(false);
      expect(canonicalJson.requiresCredentials).toBe(true);
      expect(canonicalJson.provider).toBe('rentcast');
      expect(canonicalJson.comps).toEqual([]);

      // Deprecation headers present on alias, absent on canonical
      expect(canonicalRes.headers.get('Deprecation')).toBeNull();
      expect(aliasRes.headers.get('Deprecation')).toBe('true');
      expect(aliasRes.headers.get('Link')).toBe(
        '</api/deal-calculator/property-lookup>; rel="successor-version"',
      );
    });

    it('handles invalid JSON body on canonical and alias with 400', async () => {
      const createBadReq = (url: string) =>
        new NextRequest(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{{{',
        });

      const canonicalRes = await canonicalPost(
        createBadReq('http://localhost:3000/api/deal-calculator/property-lookup'),
      );
      const aliasRes = await aliasPost(
        createBadReq('http://localhost:3000/api/deal-analyzer/property-lookup'),
      );

      expect(canonicalRes.status).toBe(400);
      expect(aliasRes.status).toBe(400);

      const canonicalJson = await canonicalRes.json();
      const aliasJson = await aliasRes.json();
      expect(canonicalJson).toEqual(aliasJson);
      expect(canonicalJson.error).toBe('Invalid JSON body');
      expect(aliasRes.headers.get('Deprecation')).toBe('true');
    });
  });

  describe('GET routes parity and behavior', () => {
    it('returns 400 error when address query param is omitted', async () => {
      const canonicalReq = new NextRequest(
        'http://localhost:3000/api/deal-calculator/property-lookup',
      );
      const aliasReq = new NextRequest(
        'http://localhost:3000/api/deal-analyzer/property-lookup',
      );

      const canonicalRes = await canonicalGet(canonicalReq);
      const aliasRes = await aliasGet(aliasReq);

      expect(canonicalRes.status).toBe(400);
      expect(aliasRes.status).toBe(400);

      const canonicalJson = await canonicalRes.json();
      const aliasJson = await aliasRes.json();
      expect(canonicalJson).toEqual(aliasJson);
      expect(aliasRes.headers.get('Deprecation')).toBe('true');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] GET /api/deal-analyzer/property-lookup'),
      );
    });

    it('returns identical responses for valid address query parameter', async () => {
      const urlWithQuery = (path: string) =>
        `http://localhost:3000${path}?address=${encodeURIComponent('100 Main St, Austin, TX')}`;

      const canonicalRes = await canonicalGet(
        new NextRequest(urlWithQuery('/api/deal-calculator/property-lookup')),
      );
      const aliasRes = await aliasGet(
        new NextRequest(urlWithQuery('/api/deal-analyzer/property-lookup')),
      );

      expect(canonicalRes.status).toBe(200);
      expect(aliasRes.status).toBe(200);

      const canonicalJson = await canonicalRes.json();
      const aliasJson = await aliasRes.json();
      expect(canonicalJson).toEqual(aliasJson);
      expect(aliasRes.headers.get('Deprecation')).toBe('true');
    });
  });
});
