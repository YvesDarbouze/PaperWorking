/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';

describe('usePlacesAutocomplete Hook', () => {
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'mock-key';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalEnv;
    delete (window as any).google;
    const script = document.querySelector('script[src*="maps.googleapis.com"]');
    if (script) script.remove();
  });

  test('initializes inputRef correctly', () => {
    const { result } = renderHook(() => usePlacesAutocomplete());
    expect(result.current.inputRef).toBeDefined();
    expect(result.current.isReady).toBe(false);
  });

  test('sets error if Google Maps API fails to load', async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const { result } = renderHook(() => usePlacesAutocomplete());
    
    // Create element and assign to ref to trigger init
    const input = document.createElement('input');
    (result.current.inputRef as any).current = input;

    await act(async () => {
      // Re-run effect with ref attached
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.error).toBeDefined();
  });
});
