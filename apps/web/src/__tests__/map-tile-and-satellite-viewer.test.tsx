import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { toNextResponse } from '../../lib/api/adapt-route-result.js';
import { GET as getMapTile } from '../../app/api/map-tile/route.js';
import { GET as getPlacesGeocode } from '../../app/api/places/geocode/route.js';
import PropertySatelliteViewer, {
  buildInlineSatelliteFallbackDataUri,
} from '../../components/maps/PropertySatelliteViewer.js';

describe('Bug_13 & Bug_41 Regression: Map Tile Binary Serialization, Geocode Fallback & PropertySatelliteViewer', () => {
  it('toNextResponse preserves ArrayBuffer binary payloads instead of serializing them as "{}" JSON', async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const buffer = new TextEncoder().encode(svgContent).buffer;

    const response = toNextResponse({
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
      body: buffer,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/svg+xml');
    const text = await response.text();
    expect(text).not.toBe('{}');
    expect(text).toContain('<svg');
  });

  it('GET /api/map-tile returns 200 and valid SVG image bytes when GOOGLE_MAPS_API_KEY is unset without bottom-left text overlap', async () => {
    const prevMapsKey = process.env.GOOGLE_MAPS_API_KEY;
    const prevPlacesKey = process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;

    try {
      const req = new NextRequest(
        'http://localhost/api/map-tile?lat=38.9072&lng=-77.0369&zoom=18&maptype=satellite&w=800&h=450',
      );
      const res = await getMapTile(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/^image\//);
      const bodyText = await res.text();
      expect(bodyText).not.toBe('{}');
      expect(bodyText).toContain('<svg');
      expect(bodyText).toContain('38.9072');
      expect(bodyText).toContain('-77.0369');
      expect(bodyText).not.toContain('x="20" y="433"');
      expect(bodyText).toContain('text-anchor="middle"');
    } finally {
      if (prevMapsKey !== undefined) process.env.GOOGLE_MAPS_API_KEY = prevMapsKey;
      if (prevPlacesKey !== undefined) process.env.GOOGLE_PLACES_API_KEY = prevPlacesKey;
    }
  });

  it('GET /api/map-tile falls back to 200 SVG image when upstream Google Static Maps returns 403 Forbidden or x-staticmap-api-warning', async () => {
    const prevMapsKey = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = 'AIzaSyRealLookingTestKey999999999';
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => new Response('Forbidden', { status: 403 })) as typeof fetch;

    try {
      const req = new NextRequest(
        'http://localhost/api/map-tile?lat=38.9072&lng=-77.0369&zoom=18&maptype=satellite&w=800&h=450',
      );
      const res = await getMapTile(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/svg+xml');
      const bodyText = await res.text();
      expect(bodyText).toContain('<svg');
      expect(bodyText).toContain('SATELLITE: 38.9072°, -77.0369°');

      global.fetch = jest.fn(
        async () =>
          new Response('warning-image', {
            status: 200,
            headers: {
              'content-type': 'image/png',
              'x-staticmap-api-warning': 'Error geocoding',
            },
          }),
      ) as typeof fetch;

      const warnRes = await getMapTile(req);
      expect(warnRes.status).toBe(200);
      expect(warnRes.headers.get('content-type')).toBe('image/svg+xml');
    } finally {
      global.fetch = originalFetch;
      if (prevMapsKey !== undefined) {
        process.env.GOOGLE_MAPS_API_KEY = prevMapsKey;
      } else {
        delete process.env.GOOGLE_MAPS_API_KEY;
      }
    }
  });

  it('Bug_41: GET /api/places/geocode returns 200 with deterministic numeric coordinates when GOOGLE_MAPS_API_KEY is unset or placeholder', async () => {
    const prevMapsKey = process.env.GOOGLE_MAPS_API_KEY;
    const prevPlacesKey = process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;

    try {
      const req = new NextRequest(
        'http://localhost/api/places/geocode?address=' +
          encodeURIComponent('K & K Circle, Littleton, NC, USA'),
      );
      const res = await getPlacesGeocode(req);
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        lat: number;
        lng: number;
        formattedAddress: string;
      };
      expect(typeof data.lat).toBe('number');
      expect(Number.isFinite(data.lat)).toBe(true);
      expect(typeof data.lng).toBe('number');
      expect(Number.isFinite(data.lng)).toBe(true);
      expect(data.formattedAddress).toBe('K & K Circle, Littleton, NC, USA');
    } finally {
      if (prevMapsKey !== undefined) process.env.GOOGLE_MAPS_API_KEY = prevMapsKey;
      if (prevPlacesKey !== undefined) process.env.GOOGLE_PLACES_API_KEY = prevPlacesKey;
    }
  });

  it('Bug_41: PropertySatelliteViewer renders satellite-map-image with text-transparent select-none and persistent parcel background', () => {
    const html = renderToString(
      <PropertySatelliteViewer
        address="K & K Circle, Littleton, NC, USA"
        lat={36.4315}
        lng={-77.9105}
        title="K & K Circle, Littleton, NC, USA"
      />,
    );

    expect(html).toContain('data-testid="property-satellite-viewer"');
    expect(html).toContain('data-testid="satellite-map-image"');
    expect(html).toContain('text-transparent');
    expect(html).toContain('select-none');
    expect(html).toContain('lat=36.4315');
    expect(html).toContain('lng=-77.9105');

    const fallbackUri = buildInlineSatelliteFallbackDataUri(36.4315, -77.9105, 18, 'satellite');
    expect(fallbackUri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(decodeURIComponent(fallbackUri)).toContain('36.4315');
  });

  it('Bug_59: PropertySatelliteViewer bottom overlay bar spaces the w-fit coordinates badge away from the Road button on 390px mobile viewports', () => {
    const html = renderToString(
      <PropertySatelliteViewer
        address="1247 Elm Street, Austin, TX 78702"
        lat={30.2804}
        lng={-97.7574}
      />,
    );

    expect(html).toContain('data-testid="satellite-viewer-bottom-bar"');
    expect(html).toContain('min-h-[220px] sm:min-h-[240px]');
    expect(html).toContain('gap-3 sm:gap-4');
    expect(html).toContain('mr-2 sm:mr-3');
    expect(html).toContain('data-testid="satellite-viewer-coords-badge"');
    expect(html).toContain('flex w-fit max-w-full flex-col sm:flex-row');
    expect(html).toContain('data-testid="satellite-viewer-controls"');
    expect(html).toContain('data-testid="satellite-viewer-maptype-btn"');
    expect(html).toContain('mr-1 sm:mr-1.5');
    expect(html).toContain('flex shrink-0 items-center gap-1.5');
  });
});

