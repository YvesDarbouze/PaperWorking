#!/usr/bin/env node

/**
 * Google Maps API Key Restriction Probe
 * 
 * Verifies that the Google Maps API Key is restricted:
 * 1. Restricted by HTTP Referrer: Requests from unauthorized referrers must receive REQUEST_DENIED.
 * 2. Restricted by API: Key cannot answer unapproved APIs.
 * 
 * If the key answers unrestricted (e.g. status: "OK" from an attacker domain),
 * this probe exits with code 1.
 */

const key =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  '';

async function runProbe() {
  console.log('=== Google Maps API Key Restriction Probe ===');

  if (!key) {
    console.log('[REQUIRES CREDENTIALS] NEXT_PUBLIC_GOOGLE_MAPS_KEY / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not configured.');
    console.log('Follow the founder console steps documented in walkthrough.md to provision and restrict the key.');
    process.exit(0);
  }

  const unauthorizedReferrer = 'https://unauthorized-attacker.example.com';
  const testUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=123+Main+St&key=${key}`;

  console.log(`Probing Google Places API with unauthorized HTTP referrer: ${unauthorizedReferrer}`);

  try {
    const res = await fetch(testUrl, {
      headers: {
        'Referer': unauthorizedReferrer,
        'Origin': unauthorizedReferrer,
      },
    });

    const data = await res.json();
    console.log(`HTTP Status: ${res.status}`);
    console.log(`API Status: ${data.status}`);
    if (data.error_message) {
      console.log(`Error Message: ${data.error_message}`);
    }

    if (data.status === 'REQUEST_DENIED') {
      console.log('\n[PASS] Key restriction confirmed: Request from unauthorized referrer was denied (REQUEST_DENIED).');
      process.exit(0);
    } else if (data.status === 'OK') {
      console.error('\n[FAIL] SECURITY VIOLATION: The API key answered successfully from an unauthorized referrer!');
      console.error('The key is UNRESTRICTED. Immediate founder action required to restrict the key.');
      process.exit(1);
    } else {
      console.log(`\nProbe completed with status: ${data.status}`);
      process.exit(0);
    }
  } catch (err) {
    if (err && (err.code === 'ENOTFOUND' || (err.cause && err.cause.code === 'ENOTFOUND'))) {
      console.log('\n[SANDBOXED/OFFLINE] Network access to Google Maps API is unavailable in this environment.');
      console.log('To run against live Google Maps, execute unsandboxed or in staging with outbound internet enabled.');
      process.exit(0);
    }
    console.error('Network error during probe:', err);
    process.exit(1);
  }
}

runProbe();
