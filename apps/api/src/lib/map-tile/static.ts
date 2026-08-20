export function clampMapTileParams(input: {
  lat?: string | null;
  lng?: string | null;
  zoom?: string | null;
  w?: string | null;
  h?: string | null;
}): { ok: true; lat: number; lng: number; zoom: number; w: number; h: number } | { ok: false; error: string } {
  const lat = parseFloat(input.lat ?? '');
  const lng = parseFloat(input.lng ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'lat and lng are required numeric parameters' };
  }
  const zoom = parseInt(input.zoom ?? '15', 10);
  const w = parseInt(input.w ?? '640', 10);
  const h = parseInt(input.h ?? '320', 10);
  return {
    ok: true,
    lat,
    lng,
    zoom: Math.min(Math.max(zoom, 1), 21),
    w: Math.min(Math.max(w, 64), 1280),
    h: Math.min(Math.max(h, 64), 640),
  };
}

export function buildGoogleStaticMapUrl(input: {
  lat: number;
  lng: number;
  zoom: number;
  w: number;
  h: number;
  apiKey: string;
}): string {
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.set('center', `${input.lat},${input.lng}`);
  url.searchParams.set('zoom', String(input.zoom));
  url.searchParams.set('size', `${input.w}x${input.h}`);
  url.searchParams.set('scale', '2');
  url.searchParams.set('maptype', 'roadmap');
  url.searchParams.set('style', 'feature:all|element:labels.text.fill|color:0x9E9DA0');
  url.searchParams.append('style', 'feature:all|element:labels.text.stroke|color:0x1a1a1a');
  url.searchParams.append('style', 'feature:water|element:geometry|color:0x0d0a0b');
  url.searchParams.append('style', 'feature:landscape|element:geometry|color:0x181420');
  url.searchParams.append('style', 'feature:road|element:geometry|color:0x2a2230');
  url.searchParams.append('style', 'feature:poi|visibility:off');
  url.searchParams.set('markers', `color:0x7A9EAA|size:mid|${input.lat},${input.lng}`);
  url.searchParams.set('key', input.apiKey);
  return url.toString();
}
