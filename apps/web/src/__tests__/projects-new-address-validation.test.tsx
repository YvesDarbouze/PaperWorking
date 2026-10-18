/**
 * @jest-environment jsdom
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

// @ts-expect-error global flag for React 18/19
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T,>(val: T): T => JSON.parse(JSON.stringify(val)) as T;
}

if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = (async () => ({
    ok: false,
    status: 404,
    json: async () => ({}),
  })) as unknown as typeof fetch;
}

const mockUseAuth = jest.fn();
const mockUseSearchParams = jest.fn(() => new URLSearchParams());
const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
  useOptionalAuth: mockUseAuth,
}));

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, back: mockRouterBack }),
  useSearchParams: mockUseSearchParams,
  usePathname: () => '/projects/new',
}));

const { default: NewProjectPage } = await import('../../app/(dashboard)/projects/new/page.js');
const { projectPromoteSchema } = await import('../../../api/src/lib/projects/create-schema.js');

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Bug_20 & Bug_21 Regression: Create New Project 5-Step Wizard Validation & Submission', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockRouterPush.mockReset();
    mockRouterBack.mockReset();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      profile: {
        uid: 'user-1',
        email: 'investor@paperworking.com',
        name: 'Jordan Principal',
        accountType: 'investor',
        subscriptionPlan: 'Individual',
        subscriptionStatus: 'active',
        marketplaceEligible: true,
      },
      refreshProfile: jest.fn(),
      logout: jest.fn(),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('clears both the inline address error and the top-level error-banner immediately when a valid Street Address is typed', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
    expect(container.querySelector('[data-testid="address-field-error"]')).toBeNull();

    const continueBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="wizard-continue-btn"]',
    );
    expect(continueBtn).not.toBeNull();

    await act(async () => {
      continueBtn!.click();
    });

    const errorBanner = container.querySelector('[data-testid="error-banner"]');
    const inlineError = container.querySelector('[data-testid="address-field-error"]');
    expect(errorBanner).not.toBeNull();
    expect(errorBanner?.textContent).toContain('Property Address');
    expect(inlineError).not.toBeNull();

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    expect(addressInput).not.toBeNull();

    await act(async () => {
      setNativeInputValue(addressInput!, '1247 Elm Street, Austin, TX 78702');
    });

    expect(container.querySelector('[data-testid="address-field-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
  });

  it('re-triggers both validation errors if the address is cleared and Continue is clicked again, then clears both when a valid Street Address is entered and submitted with Enter', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    const continueBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="wizard-continue-btn"]',
    );
    expect(continueBtn).not.toBeNull();

    await act(async () => {
      continueBtn!.click();
    });

    expect(container.querySelector('[data-testid="error-banner"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="address-field-error"]')).not.toBeNull();

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    expect(addressInput).not.toBeNull();

    await act(async () => {
      setNativeInputValue(addressInput!, '742 Evergreen Terrace, Austin, TX 78702');
      addressInput!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });

    expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
    expect(container.querySelector('[data-testid="address-field-error"]')).toBeNull();
  });

  it('clears both validation errors when a valid address is selected from autocomplete suggestions', async () => {
    const prevFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      if (String(url).includes('/api/places/autocomplete')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            predictions: [
              {
                placeId: 'place-london-woods',
                description: 'London Woods, Capitol Heights, MD, USA',
                mainText: 'London Woods',
                secondaryText: 'Capitol Heights, MD, USA',
              },
            ],
          }),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      };
    }) as unknown as typeof fetch;

    try {
      await act(async () => {
        root.render(<NewProjectPage />);
      });

      const continueBtn = container.querySelector<HTMLButtonElement>(
        '[data-testid="wizard-continue-btn"]',
      );
      await act(async () => {
        continueBtn!.click();
      });

      expect(container.querySelector('[data-testid="error-banner"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="address-field-error"]')).not.toBeNull();

      const addressInput = container.querySelector<HTMLInputElement>('#address-input');
      await act(async () => {
        setNativeInputValue(addressInput!, 'London Woods');
        jest.advanceTimersByTime(350);
      });

      const option = container.querySelector<HTMLLIElement>('#address-prediction-0');
      expect(option).not.toBeNull();

      await act(async () => {
        option!.click();
      });

      expect(addressInput?.value).toBe('London Woods, Capitol Heights, MD, USA');
      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
      expect(container.querySelector('[data-testid="address-field-error"]')).toBeNull();
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  it('Bug_21: completes all 5 steps and creates project via POST /api/projects/promote without Validation Failed error', async () => {
    const prevFetch = globalThis.fetch;
    let capturedPromoteBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/projects/promote')) {
        const parsedBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
        capturedPromoteBody = parsedBody;
        const validation = projectPromoteSchema.safeParse(parsedBody);
        if (!validation.success) {
          return {
            ok: false,
            status: 400,
            json: async () => ({
              error: 'Validation failed',
              details: validation.error.flatten().fieldErrors,
            }),
          };
        }
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            projectId: 'proj-bug21-verified',
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    }) as unknown as typeof fetch;

    try {
      await act(async () => {
        root.render(<NewProjectPage />);
      });

      // Step 1: Enter valid address
      const addressInput = container.querySelector<HTMLInputElement>('#address-input');
      expect(addressInput).not.toBeNull();
      await act(async () => {
        setNativeInputValue(addressInput!, 'London Bridge Court, Aspen Hill, MD, USA');
      });

      // Step 1 -> Step 2
      await act(async () => {
        container.querySelector<HTMLButtonElement>('[data-testid="wizard-continue-btn"]')!.click();
      });

      // Step 2: Set Rehab Budget to 50000 and leave Estimated ARV empty (null)
      const rehabInput = container.querySelector<HTMLInputElement>(
        '#rehab-budget-input',
      );
      expect(rehabInput).not.toBeNull();
      await act(async () => {
        setNativeInputValue(rehabInput!, '50000');
      });

      // Step 2 -> Step 3 -> Step 4 -> Step 5
      for (const expectedNextStep of [3, 4, 5]) {
        const btn = container.querySelector<HTMLButtonElement>(
          '[data-testid="wizard-continue-btn"]',
        );
        expect(btn).not.toBeNull();
        expect(btn?.textContent).toContain(`Step ${expectedNextStep}`);
        await act(async () => {
          btn!.click();
        });
      }

      // Step 5: Submit Create Project & Enter Pipeline
      const launchBtn = container.querySelector<HTMLButtonElement>(
        '[data-testid="create-project-submit-btn"]',
      );
      expect(launchBtn).not.toBeNull();
      expect(launchBtn?.disabled).toBe(false);

      await act(async () => {
        launchBtn!.click();
      });

      expect(capturedPromoteBody).not.toBeNull();
      const body = capturedPromoteBody as unknown as Record<string, unknown>;
      expect(body.address).toBe('London Bridge Court, Aspen Hill, MD, USA');
      expect(body.purchasePrice).toBe(485000);
      expect(body.rehabBudget).toBe(50000);
      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
      expect(mockRouterPush).toHaveBeenCalledWith('/project/proj-bug21-verified');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  it('Bug_27: parses multi-part Google Places address (", USA"), dismisses stale draft prompt on new address intake, guards forward stepper clicks, and submits 5-step project cleanly', async () => {
    const prevFetch = globalThis.fetch;
    let capturedPromoteBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/projects/drafts') && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            draft: {
              step: 2,
              address: 'London Woods, Capitol Heights, MD, USA',
              purchasePrice: 485000,
            },
          }),
        };
      }
      if (urlStr.includes('/api/places/autocomplete')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            predictions: [
              {
                placeId: 'place-london-bridge',
                description: 'London Bridge Court, Aspen Hill, MD, USA',
                mainText: 'London Bridge Court',
                secondaryText: 'Aspen Hill, MD, USA',
              },
            ],
          }),
        };
      }
      if (urlStr.includes('/api/projects/promote')) {
        const parsedBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
        capturedPromoteBody = parsedBody;
        const validation = projectPromoteSchema.safeParse(parsedBody);
        if (!validation.success) {
          return {
            ok: false,
            status: 400,
            json: async () => ({
              error: 'Validation failed',
              details: validation.error.flatten().fieldErrors,
            }),
          };
        }
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            projectId: 'proj-bug27-verified',
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    }) as unknown as typeof fetch;

    try {
      await act(async () => {
        root.render(<NewProjectPage />);
      });

      // Stale draft banner initially appears
      expect(container.querySelector('[data-testid="resume-draft-banner"]')).not.toBeNull();

      // Clicking Step 5 in top stepper before entering address triggers Step 1 validation guard
      const stepperButtons = container.querySelectorAll<HTMLButtonElement>(
        'nav[aria-label="Wizard Steps"] button',
      );
      expect(stepperButtons.length).toBe(5);
      await act(async () => {
        stepperButtons[4]!.click();
      });
      expect(container.querySelector('[data-testid="error-banner"]')?.textContent).toContain(
        'Property Address',
      );

      // Select "London Bridge Court, Aspen Hill, MD, USA" from autocomplete
      const addressInput = container.querySelector<HTMLInputElement>('#address-input');
      await act(async () => {
        setNativeInputValue(addressInput!, 'Lond');
        jest.advanceTimersByTime(350);
      });

      const option = container.querySelector<HTMLLIElement>('#address-prediction-0');
      expect(option).not.toBeNull();
      await act(async () => {
        option!.click();
      });

      // Verify city ("Aspen Hill"), state ("MD"), and zipCode ("20906") parsed cleanly, and draft banner dismissed
      expect(container.querySelector<HTMLInputElement>('#city-input')?.value).toBe('Aspen Hill');
      expect(container.querySelector<HTMLInputElement>('#state-input')?.value).toBe('MD');
      expect(container.querySelector<HTMLInputElement>('#zip-input')?.value).toBe('20906');
      expect(container.querySelector('[data-testid="resume-draft-banner"]')).toBeNull();
      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();

      // Complete Steps 1 -> 2 -> 3 -> 4 -> 5
      for (const expectedStep of [2, 3, 4, 5]) {
        const btn = container.querySelector<HTMLButtonElement>('[data-testid="wizard-continue-btn"]');
        expect(btn).not.toBeNull();
        expect(btn?.textContent).toContain(`Step ${expectedStep}`);
        await act(async () => {
          btn!.click();
        });
      }

      // Submit on Step 5
      const launchBtn = container.querySelector<HTMLButtonElement>(
        '[data-testid="create-project-submit-btn"]',
      );
      expect(launchBtn).not.toBeNull();
      expect(launchBtn?.disabled).toBe(false);

      await act(async () => {
        launchBtn!.click();
      });

      expect(capturedPromoteBody).not.toBeNull();
      const body = capturedPromoteBody as unknown as Record<string, unknown>;
      expect(body.address).toBe('London Bridge Court, Aspen Hill, MD, USA');
      expect(body.city).toBe('Aspen Hill');
      expect(body.state).toBe('MD');
      expect(body.purchasePrice).toBe(485000);
      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
      expect(mockRouterPush).toHaveBeenCalledWith('/project/proj-bug27-verified');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  it('Bug_28: renders a 44x44px clear (X) icon button in the Street Address search bar when text is entered and clears the input when clicked', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    expect(addressInput).not.toBeNull();
    expect(container.querySelector('[data-testid="clear-address-search-btn"]')).toBeNull();

    await act(async () => {
      setNativeInputValue(addressInput!, '1247 Elm Street');
    });

    const clearBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="clear-address-search-btn"]',
    );
    expect(clearBtn).not.toBeNull();
    expect(clearBtn?.getAttribute('aria-label')).toBe('Clear search');
    expect(clearBtn?.className).toContain('min-h-[44px]');
    expect(clearBtn?.className).toContain('min-w-[44px]');

    await act(async () => {
      clearBtn!.click();
    });

    expect(addressInput?.value).toBe('');
    expect(container.querySelector('[data-testid="clear-address-search-btn"]')).toBeNull();
  });

  it('Bug_42: validates Contact Phone / Email (#source-contact-phone) against plain alphabets (e.g., "abccc"), shows inline error and blocks Step 1 progression until valid phone, email, or blank value is entered', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    const contactInput = container.querySelector<HTMLInputElement>('#source-contact-phone');
    expect(addressInput).not.toBeNull();
    expect(contactInput).not.toBeNull();

    // Enter valid address first
    await act(async () => {
      setNativeInputValue(addressInput!, '1247 Elm Street, Austin, TX 78702');
    });

    // Initially empty Contact Phone / Email has no error
    expect(container.querySelector('[data-testid="source-contact-phone-error"]')).toBeNull();
    expect(contactInput?.getAttribute('aria-invalid')).not.toBe('true');

    // Enter plain alphabets "abccc" as in Bug_42 reproduction steps
    await act(async () => {
      setNativeInputValue(contactInput!, 'abccc');
    });

    const inlinePhoneError = container.querySelector('[data-testid="source-contact-phone-error"]');
    expect(inlinePhoneError).not.toBeNull();
    expect(inlinePhoneError?.getAttribute('role')).toBe('alert');
    expect(inlinePhoneError?.textContent).toContain('Enter a valid phone number');
    expect(contactInput?.getAttribute('aria-invalid')).toBe('true');

    // Attempting to click Continue on Step 1 with invalid Contact Phone / Email is blocked
    const continueBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="wizard-continue-btn"]',
    );
    await act(async () => {
      continueBtn!.click();
    });

    expect(container.querySelector('[data-testid="step-1-address-intake"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="error-banner"]')?.textContent).toContain(
      'Contact Phone / Email',
    );

    // Entering a valid phone number clears both the inline error and the error banner
    await act(async () => {
      setNativeInputValue(contactInput!, '512-555-0199');
    });

    expect(container.querySelector('[data-testid="source-contact-phone-error"]')).toBeNull();
    expect(contactInput?.getAttribute('aria-invalid')).toBe('false');
    expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();

    // Entering a valid email address is also accepted
    await act(async () => {
      setNativeInputValue(contactInput!, 'broker@paperworking.com');
    });
    expect(container.querySelector('[data-testid="source-contact-phone-error"]')).toBeNull();
    expect(contactInput?.getAttribute('aria-invalid')).toBe('false');

    // Clicking Continue now advances cleanly to Step 2
    await act(async () => {
      continueBtn!.click();
    });
    expect(container.querySelector('[data-testid="step-1-address-intake"]')).toBeNull();
  });

  it('Bug_43: validates Unit / Suite (#unit-input), City (#city-input), State (#state-input), and Zip Code (#zip-input) against special characters, enforces maxLength, displays inline errors, and blocks Step 1 progression until corrected', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    const unitInput = container.querySelector<HTMLInputElement>('#unit-input');
    const cityInput = container.querySelector<HTMLInputElement>('#city-input');
    const stateInput = container.querySelector<HTMLInputElement>('#state-input');
    const zipInput = container.querySelector<HTMLInputElement>('#zip-input');

    expect(addressInput).not.toBeNull();
    expect(unitInput).not.toBeNull();
    expect(cityInput).not.toBeNull();
    expect(stateInput).not.toBeNull();
    expect(zipInput).not.toBeNull();

    // Verify character limits on inputs
    expect(unitInput?.getAttribute('maxLength')).toBe('20');
    expect(cityInput?.getAttribute('maxLength')).toBe('60');
    expect(stateInput?.getAttribute('maxLength')).toBe('2');
    expect(zipInput?.getAttribute('maxLength')).toBe('10');

    // Enter valid Street Address first
    await act(async () => {
      setNativeInputValue(addressInput!, '1247 Elm Street, Austin, TX 78702');
    });

    // Enter invalid special characters as in Bug_43 reproduction steps
    await act(async () => {
      setNativeInputValue(unitInput!, '&&&&&&&&');
      setNativeInputValue(cityInput!, '****');
      setNativeInputValue(stateInput!, '%%%%');
      setNativeInputValue(zipInput!, '%%%%');
    });

    // State auto-truncates to 2 chars ("%%")
    expect(stateInput?.value).toBe('%%');

    // Verify all 4 inline error alerts render with role="alert" and aria-invalid="true"
    const unitError = container.querySelector('[data-testid="unit-field-error"]');
    const cityError = container.querySelector('[data-testid="city-field-error"]');
    const stateError = container.querySelector('[data-testid="state-field-error"]');
    const zipError = container.querySelector('[data-testid="zip-field-error"]');

    expect(unitError).not.toBeNull();
    expect(unitError?.getAttribute('role')).toBe('alert');
    expect(unitInput?.getAttribute('aria-invalid')).toBe('true');

    expect(cityError).not.toBeNull();
    expect(cityError?.getAttribute('role')).toBe('alert');
    expect(cityInput?.getAttribute('aria-invalid')).toBe('true');

    expect(stateError).not.toBeNull();
    expect(stateError?.getAttribute('role')).toBe('alert');
    expect(stateError?.textContent).toContain('2-letter');
    expect(stateInput?.getAttribute('aria-invalid')).toBe('true');

    expect(zipError).not.toBeNull();
    expect(zipError?.getAttribute('role')).toBe('alert');
    expect(zipError?.textContent).toContain('ZIP code');
    expect(zipInput?.getAttribute('aria-invalid')).toBe('true');

    // Attempting to click Continue on Step 1 is blocked
    const continueBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="wizard-continue-btn"]',
    );
    await act(async () => {
      continueBtn!.click();
    });
    expect(container.querySelector('[data-testid="step-1-address-intake"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="error-banner"]')).not.toBeNull();

    // Entering valid values clears all 4 errors and allows Step 1 progression
    await act(async () => {
      setNativeInputValue(unitInput!, 'Apt 4B');
      setNativeInputValue(cityInput!, 'Austin');
      setNativeInputValue(stateInput!, 'tx');
      setNativeInputValue(zipInput!, '78702');
    });

    expect(stateInput?.value).toBe('TX');
    expect(container.querySelector('[data-testid="unit-field-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="city-field-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="state-field-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="zip-field-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();

    await act(async () => {
      continueBtn!.click();
    });
    expect(container.querySelector('[data-testid="step-1-address-intake"]')).toBeNull();
  });

  it('Bug_44: aligns Estimated ARV (#arv-input) and Gross Monthly Rent (#gross-rent-input) label headers cleanly and renders the ARV helper text below #arv-input without overlapping the label', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    expect(addressInput).not.toBeNull();
    await act(async () => {
      setNativeInputValue(addressInput!, '1247 Elm Street, Austin, TX 78702');
    });

    // Advance to Step 2
    const continueBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="wizard-continue-btn"]',
    );
    await act(async () => {
      continueBtn!.click();
    });

    expect(container.querySelector('[data-testid="step-2-deal-calculation"]')).not.toBeNull();

    const arvInput = container.querySelector<HTMLInputElement>('#arv-input');
    const grossRentInput = container.querySelector<HTMLInputElement>('#gross-rent-input');
    const arvLabel = container.querySelector<HTMLLabelElement>('label[for="arv-input"]');
    const grossRentLabel = container.querySelector<HTMLLabelElement>('label[for="gross-rent-input"]');

    expect(arvInput).not.toBeNull();
    expect(grossRentInput).not.toBeNull();
    expect(arvLabel).not.toBeNull();
    expect(grossRentLabel).not.toBeNull();

    // Verify both label header containers have consistent min-h-[20px] alignment and the helper text is NOT crammed inside the label header
    const arvLabelHeader = arvLabel?.parentElement;
    const grossRentLabelHeader = grossRentLabel?.parentElement;
    expect(arvLabelHeader?.className).toContain('min-h-[20px]');
    expect(grossRentLabelHeader?.className).toContain('min-h-[20px]');
    expect(arvLabelHeader?.textContent).not.toContain('ARV not provided');

    // Verify helper text is rendered below #arv-input and linked via aria-describedby
    const arvHelper = container.querySelector<HTMLElement>('[data-testid="arv-helper-text"]');
    expect(arvHelper).not.toBeNull();
    expect(arvHelper?.id).toBe('arv-helper-text');
    expect(arvHelper?.textContent).toContain('ARV not provided: enter ARV to compute equity/MAO.');
    expect(arvInput?.getAttribute('aria-describedby')).toBe('arv-helper-text');

    // Entering an explicit ARV hides the helper text and clears aria-describedby
    await act(async () => {
      setNativeInputValue(arvInput!, '625000');
    });

    expect(container.querySelector('[data-testid="arv-helper-text"]')).toBeNull();
    expect(arvInput?.getAttribute('aria-describedby')).toBeNull();
  });

  it('Bug_45: renders all 5 Investment Strategy Template card titles and descriptions in Step 2 without truncate or line-clamp classes so full strategy titles are readable', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    expect(addressInput).not.toBeNull();
    await act(async () => {
      setNativeInputValue(addressInput!, '1247 Elm Street, Austin, TX 78702');
    });

    // Advance to Step 2
    const continueBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="wizard-continue-btn"]',
    );
    await act(async () => {
      continueBtn!.click();
    });

    const strategyGroup = container.querySelector<HTMLElement>(
      '[role="group"][aria-label="Investment Strategy Template"]',
    );
    expect(strategyGroup).not.toBeNull();
    expect(strategyGroup?.className).toContain('lg:grid-cols-3');
    expect(strategyGroup?.className).not.toContain('md:grid-cols-5');

    const expectedStrategies = [
      { id: 'flip', label: 'Fix & Flip' },
      { id: 'brrrr', label: 'BRRRR' },
      { id: 'buy_and_hold_rental', label: 'Buy & Hold Rental' },
      { id: 'short_term_rental_airbnb', label: 'Short-Term / Airbnb' },
      { id: 'commercial_value_add', label: 'Commercial Value-Add' },
    ];

    for (const { id, label } of expectedStrategies) {
      const titleEl = container.querySelector<HTMLElement>(
        `[data-testid="strategy-card-title-${id}"]`,
      );
      expect(titleEl).not.toBeNull();
      expect(titleEl?.textContent).toBe(label);
      expect(titleEl?.className).not.toContain('truncate');
    }

    // Also verify no description paragraph inside the strategy group uses line-clamp-2
    const descEls = strategyGroup!.querySelectorAll('p');
    expect(descEls.length).toBe(5);
    descEls.forEach((p) => {
      expect(p.className).not.toContain('line-clamp');
    });
  });

  it('Bug_46: blocks scientific notation keys, clamps oversized Estimated ARV inputs (including repeated inputs at cap) in the live DOM, shows formatted currency preview, and prevents KPI card overflow', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    expect(addressInput).not.toBeNull();
    await act(async () => {
      setNativeInputValue(addressInput!, '1247 Elm Street, Austin, TX 78702');
    });

    // Advance to Step 2
    const continueBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="wizard-continue-btn"]',
    );
    await act(async () => {
      continueBtn!.click();
    });

    const arvInput = container.querySelector<HTMLInputElement>('#arv-input');
    const priceInput = container.querySelector<HTMLInputElement>('#purchase-price-input');
    const rehabInput = container.querySelector<HTMLInputElement>('#rehab-budget-input');
    const rentInput = container.querySelector<HTMLInputElement>('#gross-rent-input');

    expect(arvInput).not.toBeNull();
    expect(priceInput).not.toBeNull();
    expect(rehabInput).not.toBeNull();
    expect(rentInput).not.toBeNull();

    // Verify max and maxLength attributes
    for (const input of [arvInput, priceInput, rehabInput, rentInput]) {
      expect(input?.getAttribute('max')).toBe('999999999999');
      expect(input?.getAttribute('maxLength')).toBe('12');
    }

    // Verify scientific notation keys ('e', 'E', '+', '-') are prevented on keydown
    for (const blockedKey of ['e', 'E', '+', '-']) {
      const keyEvent = new KeyboardEvent('keydown', {
        key: blockedKey,
        bubbles: true,
        cancelable: true,
      });
      arvInput!.dispatchEvent(keyEvent);
      expect(keyEvent.defaultPrevented).toBe(true);
    }

    // Enter a normal ARV first and check formatted preview
    await act(async () => {
      setNativeInputValue(arvInput!, '625000');
    });
    expect(arvInput?.value).toBe('625000');
    const previewNormal = container.querySelector('[data-testid="arv-formatted-preview"]');
    expect(previewNormal).not.toBeNull();
    expect(previewNormal?.textContent).toBe('Formatted: $625,000');

    // Enter scientific notation string "9.99991e+49" as in Bug_46 reproduction steps
    await act(async () => {
      setNativeInputValue(arvInput!, '9.99991e+49');
    });
    expect(arvInput?.value).toBe('999999999999');
    expect(arvInput?.value).not.toContain('e');

    // Enter another oversized 30-digit string while state is already at 999999999999 (tests React bailout DOM sync)
    await act(async () => {
      setNativeInputValue(arvInput!, '999999999999999999999999999999');
    });
    expect(arvInput?.value).toBe('999999999999');

    const previewMax = container.querySelector('[data-testid="arv-formatted-preview"]');
    expect(previewMax?.textContent).toBe('Formatted: $999,999,999,999 (Maximum limit reached)');

    // Verify all 4 KPI cards and value spans in Live 33 Underwriting Datapoints Engine
    const kpiCards = container.querySelectorAll('[data-testid="underwriting-kpi-card"]');
    expect(kpiCards.length).toBe(4);
    kpiCards.forEach((card) => {
      expect(card.className).toContain('min-w-0');
      expect(card.className).toContain('overflow-hidden');
    });

    const maoVal = container.querySelector('[data-testid="underwriting-kpi-mao"]');
    const cashVal = container.querySelector('[data-testid="underwriting-kpi-cash-required"]');
    const netMarginVal = container.querySelector('[data-testid="underwriting-kpi-net-margin"]');
    const capRateVal = container.querySelector('[data-testid="underwriting-kpi-cap-rate"]');

    for (const valEl of [maoVal, cashVal, netMarginVal, capRateVal]) {
      expect(valEl).not.toBeNull();
      expect(valEl?.className).toContain('block');
      expect(valEl?.className).toContain('truncate');
      expect(valEl?.className).toContain('tabular-nums');
      expect(valEl?.textContent).not.toContain('e+');
    }
    expect(maoVal?.textContent).toBe('$699,999,932,099');
  });

  it('Bug_47: shows immediate validation errors on invalid Step 4 dates (including Chrome validity.badInput, out-of-range years, and closing before PSA date), blocks forward navigation to Step 5, and preserves Step 4 DOM nodes across step transitions', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    expect(addressInput).not.toBeNull();
    await act(async () => {
      setNativeInputValue(addressInput!, '1247 Elm Street, Austin, TX 78702');
    });

    const getContinueBtn = () =>
      container.querySelector<HTMLButtonElement>('[data-testid="wizard-continue-btn"]');

    // Step 1 -> Step 2 -> Step 3 -> Step 4
    await act(async () => {
      getContinueBtn()!.click();
    });
    await act(async () => {
      getContinueBtn()!.click();
    });
    await act(async () => {
      getContinueBtn()!.click();
    });

    const psaDateInput = container.querySelector<HTMLInputElement>('#target-psa-date');
    const closingDateInput = container.querySelector<HTMLInputElement>('#target-closing-date');
    const inspectionInput = container.querySelector<HTMLInputElement>('#inspection-days-input');
    const financingInput = container.querySelector<HTMLInputElement>('#financing-days-input');

    expect(psaDateInput).not.toBeNull();
    expect(closingDateInput).not.toBeNull();
    expect(inspectionInput).not.toBeNull();
    expect(financingInput).not.toBeNull();
    expect(psaDateInput?.getAttribute('min')).toBe('2000-01-01');
    expect(psaDateInput?.getAttribute('max')).toBe('2100-12-31');
    expect(closingDateInput?.getAttribute('min')).toBe('2000-01-01');
    expect(closingDateInput?.getAttribute('max')).toBe('2100-12-31');

    // 1. Simulate Chrome <input type="date"> badInput when typing an invalid date (e.g., 02/31/2026 or 99/99/9999)
    Object.defineProperty(psaDateInput!, 'validity', {
      configurable: true,
      get: () => ({ badInput: true, valid: false }),
    });
    await act(async () => {
      setNativeInputValue(psaDateInput!, '');
    });

    const psaError = container.querySelector('[data-testid="target-psa-date-error"]');
    expect(psaError).not.toBeNull();
    expect(psaError?.getAttribute('role')).toBe('alert');
    expect(psaError?.textContent).toContain(
      'Enter a valid Target Contract (PSA) Date (valid calendar date required).',
    );
    expect(psaDateInput?.getAttribute('aria-invalid')).toBe('true');

    // 2. Attempt to proceed to Step 5 via Continue button -> must be blocked on Step 4
    await act(async () => {
      getContinueBtn()!.click();
    });
    const errorBanner = container.querySelector('[data-testid="error-banner"]');
    expect(errorBanner).not.toBeNull();
    expect(errorBanner?.textContent).toContain('Target Contract (PSA) Date');
    // Still on Step 4 (Step 5 heading is not rendered)
    expect(container.textContent).not.toContain('5. Review & Launch Project');

    // 3. Navigate Back to Step 3 and return to Step 4 -> verify the #target-psa-date DOM element was NOT unmounted
    const backBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Back') && !b.textContent?.includes('Back to Projects'),
    );
    expect(backBtn).toBeDefined();
    await act(async () => {
      backBtn!.click();
    });
    // Step 4 container remains mounted in DOM (hidden) so Chrome's internal date buffer is preserved
    expect(container.querySelector('#target-psa-date')).toBe(psaDateInput);

    // Return to Step 4
    await act(async () => {
      getContinueBtn()!.click();
    });
    expect(container.querySelector('#target-psa-date')).toBe(psaDateInput);
    expect(container.querySelector('[data-testid="target-psa-date-error"]')).not.toBeNull();

    // 4. Fix badInput on PSA date, test chronological error where Target Closing Date < Target Contract Date
    Object.defineProperty(psaDateInput!, 'validity', {
      configurable: true,
      get: () => ({ badInput: false, valid: true }),
    });
    await act(async () => {
      setNativeInputValue(psaDateInput!, '2026-06-15');
    });
    expect(container.querySelector('[data-testid="target-psa-date-error"]')).toBeNull();

    await act(async () => {
      setNativeInputValue(closingDateInput!, '2026-06-01');
    });
    const closingError = container.querySelector('[data-testid="target-closing-date-error"]');
    expect(closingError).not.toBeNull();
    expect(closingError?.textContent).toContain(
      'Target Closing Date must be on or after the Target Contract (PSA) Date.',
    );

    // Blocking forward navigation when closing date < contract date
    await act(async () => {
      getContinueBtn()!.click();
    });
    expect(container.textContent).not.toContain('5. Review & Launch Project');

    // 5. Fix Target Closing Date and verify clean progression to Step 5 and Back navigation preservation
    await act(async () => {
      setNativeInputValue(closingDateInput!, '2026-07-15');
    });
    expect(container.querySelector('[data-testid="target-closing-date-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();

    await act(async () => {
      getContinueBtn()!.click();
    });
    expect(container.textContent).toContain('5. Review & Launch Project');
    expect(container.textContent).toContain('2026-06-15');
    expect(container.textContent).toContain('2026-07-15');

    // Navigate Back from Step 5 to Step 4 and verify both dates remain intact
    await act(async () => {
      backBtn!.click();
    });
    expect(psaDateInput?.value).toBe('2026-06-15');
    expect(closingDateInput?.value).toBe('2026-07-15');
  });

  it('Bug_48: launches project cleanly with only the 3 required fields (Street Address, Investment Strategy, Target Purchase Price) even when address has comma-separated unit/suite or optional fields are cleared', async () => {
    const fetchCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/projects/promote' && init?.body) {
        const parsed = JSON.parse(String(init.body)) as Record<string, unknown>;
        fetchCalls.push({ url, body: parsed });
        const validation = projectPromoteSchema.safeParse(parsed);
        if (!validation.success) {
          return {
            ok: false,
            status: 400,
            json: async () => ({
              error: 'Validation failed',
              details: validation.error.flatten().fieldErrors,
            }),
          } as Response;
        }
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            projectId: 'proj-bug48-ok',
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    try {
      await act(async () => {
        root.render(<NewProjectPage />);
      });

      expect(container.textContent).toContain('Only 3 required fields to launch');

      // 1. Enter Street Address with comma-separated unit/suite (e.g. "123 Main St, Apt 4B")
      const addressInput = container.querySelector<HTMLInputElement>('#address-input');
      const cityInput = container.querySelector<HTMLInputElement>('#city-input');
      const stateInput = container.querySelector<HTMLInputElement>('#state-input');
      const zipInput = container.querySelector<HTMLInputElement>('#zip-input');
      expect(addressInput).not.toBeNull();

      await act(async () => {
        setNativeInputValue(addressInput!, '123 Main St, Apt 4B');
      });
      // City must NOT be overwritten with "Apt 4B"
      expect(cityInput?.value).toBe('Austin');
      expect(container.querySelector('[data-testid="city-error"]')).toBeNull();

      // 2. Clear optional City, State, Zip Code on Step 1 so ONLY Street Address is filled
      await act(async () => {
        setNativeInputValue(cityInput!, '');
        setNativeInputValue(stateInput!, '');
        setNativeInputValue(zipInput!, '');
      });

      const getContinueBtn = () =>
        container.querySelector<HTMLButtonElement>('[data-testid="wizard-continue-btn"]');

      // Step 1 -> Step 2
      await act(async () => {
        getContinueBtn()!.click();
      });
      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();

      // Select Strategy (Required #2) and set Target Purchase Price (Required #3), leaving Estimated ARV empty
      const brrrrCard = container
        .querySelector<HTMLElement>('[data-testid="strategy-card-title-brrrr"]')
        ?.closest('button');
      expect(brrrrCard).not.toBeNull();
      expect(brrrrCard).toBeDefined();
      await act(async () => {
        brrrrCard!.click();
      });

      const priceInput = container.querySelector<HTMLInputElement>('#purchase-price-input');
      expect(priceInput).not.toBeNull();
      await act(async () => {
        setNativeInputValue(priceInput!, '425000');
      });

      // Step 2 -> Step 3 -> Step 4
      await act(async () => {
        getContinueBtn()!.click();
      });
      await act(async () => {
        getContinueBtn()!.click();
      });

      // Clear optional Step 4 dates (without browser badInput)
      const psaDateInput = container.querySelector<HTMLInputElement>('#target-psa-date');
      const closingDateInput = container.querySelector<HTMLInputElement>('#target-closing-date');
      await act(async () => {
        setNativeInputValue(psaDateInput!, '');
        setNativeInputValue(closingDateInput!, '');
      });

      // Step 4 -> Step 5
      await act(async () => {
        getContinueBtn()!.click();
      });
      expect(container.textContent).toContain('5. Review & Launch Project');

      // Click Create Project & Enter Pipeline
      const submitBtn = container.querySelector<HTMLButtonElement>(
        '[data-testid="create-project-submit-btn"]',
      );
      expect(submitBtn).not.toBeNull();
      await act(async () => {
        submitBtn!.click();
      });

      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
      expect(fetchCalls.length).toBe(1);
      expect(fetchCalls[0]?.body.address).toBe('123 Main St, Apt 4B');
      expect(fetchCalls[0]?.body.purchasePrice).toBe(425000);
      expect(fetchCalls[0]?.body.strategy).toBe('brrrr');
      expect(mockRouterPush).toHaveBeenCalledWith('/project/proj-bug48-ok');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('Bug_51: promotes a Marketplace deal through Deal Calculator to Step 5 of /projects/new and launches into /project/[id] without "Failed to promote deal to project"', async () => {
    const originalFetch = globalThis.fetch;
    const promoteCalls: Array<Record<string, unknown>> = [];

    // Verify projectPromoteSchema normalizes all human-readable marketplace strategy labels
    for (const label of [
      'Value-Add / BRRRR',
      'Fix & Flip',
      'Buy & Hold',
      'Buy & Hold Rental',
      'Short-Term / Airbnb',
      'Commercial Value-Add',
      'Wholesale',
    ]) {
      const parsed = projectPromoteSchema.safeParse({
        address: '1247 Elm Street, Austin, TX 78702',
        purchasePrice: 485000,
        strategy: label,
      });
      expect(parsed.success).toBe(true);
    }

    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({
        fromCalculator: 'true',
        phase: 'acquisition',
        address: '1247 Elm Street, Austin, TX 78702',
        price: '485000',
        rehab: '62000',
        arv: '650000',
        rent: '4200',
        strategy: 'Value-Add / BRRRR',
      }),
    );

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/projects/promote' && init?.body) {
        const parsed = JSON.parse(String(init.body)) as Record<string, unknown>;
        promoteCalls.push(parsed);
        const validation = projectPromoteSchema.safeParse(parsed);
        if (!validation.success) {
          return {
            ok: false,
            status: 400,
            json: async () => ({
              error: 'Failed to promote deal to project',
              details: validation.error.flatten().fieldErrors,
            }),
          } as Response;
        }
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            projectId: 'proj-bug51-marketplace',
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    try {
      await act(async () => {
        root.render(<NewProjectPage />);
      });

      // Lands directly on Step 5 (Review & Launch)
      expect(container.textContent).toContain('5. Review & Launch Project');
      expect(container.textContent).toContain('1247 Elm Street, Austin, TX 78702');

      const submitBtn = container.querySelector<HTMLButtonElement>(
        '[data-testid="create-project-submit-btn"]',
      );
      expect(submitBtn).not.toBeNull();
      await act(async () => {
        submitBtn!.click();
      });

      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
      expect(promoteCalls.length).toBe(1);
      expect(promoteCalls[0]?.strategy).toBe('brrrr');
      expect(promoteCalls[0]?.estimatedARV).toBe(650000);
      expect(mockRouterPush).toHaveBeenCalledWith('/project/proj-bug51-marketplace');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('Bug_78: selecting "Abbey Place Northeast, Washington, DC, USA" populates City as "Washington", State as "DC", and Zip Code as "20002" instead of TX / 78702', async () => {
    const prevFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/places/autocomplete')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            predictions: [
              {
                placeId: 'bm-dc-abbey-place',
                description: 'Abbey Place Northeast, Washington, DC, USA',
                mainText: 'Abbey Place Northeast',
                secondaryText: 'Washington, DC, USA',
              },
            ],
          }),
        };
      }
      if (urlStr.includes('/api/places/details')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            placeId: 'bm-dc-abbey-place',
            formatted_address: 'Abbey Pl NE, Washington, DC 20002, USA',
            address_components: [
              { long_name: 'Abbey Place Northeast', short_name: 'Abbey Pl NE', types: ['route'] },
              { long_name: 'Washington', short_name: 'Washington', types: ['locality', 'political'] },
              {
                long_name: 'District of Columbia',
                short_name: 'DC',
                types: ['administrative_area_level_1', 'political'],
              },
              { long_name: '20002', short_name: '20002', types: ['postal_code'] },
            ],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    }) as unknown as typeof fetch;

    try {
      await act(async () => {
        root.render(<NewProjectPage />);
      });

      const addressInput = container.querySelector<HTMLInputElement>('#address-input');
      const cityInput = container.querySelector<HTMLInputElement>('#city-input');
      const stateInput = container.querySelector<HTMLInputElement>('#state-input');
      const zipInput = container.querySelector<HTMLInputElement>('#zip-input');

      expect(addressInput).not.toBeNull();
      expect(cityInput).not.toBeNull();
      expect(stateInput).not.toBeNull();
      expect(zipInput).not.toBeNull();

      await act(async () => {
        setNativeInputValue(addressInput!, 'Abbey Place');
        jest.advanceTimersByTime(350);
      });

      const option = container.querySelector<HTMLLIElement>('#address-prediction-0');
      expect(option).not.toBeNull();
      expect(option?.textContent).toContain('Abbey Place Northeast');

      await act(async () => {
        option!.click();
      });

      expect(addressInput?.value).toBe('Abbey Place Northeast, Washington, DC, USA');
      expect(cityInput?.value).toBe('Washington');
      expect(stateInput?.value).toBe('DC');
      expect(zipInput?.value).toBe('20002');
      expect(stateInput?.value).not.toBe('TX');
      expect(zipInput?.value).not.toBe('78702');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  it('Bug_19 & Bug_20: Step 5 Underwriting Highlights renders non-negative Net Profit ($0 when ARV <= Purchase Price + Rehab Budget) and accurate Net Profit (ARV - Purchase Price - Rehab Budget) when positive', async () => {
    await act(async () => {
      root.render(<NewProjectPage />);
    });

    const addressInput = container.querySelector<HTMLInputElement>('#address-input');
    expect(addressInput).not.toBeNull();
    await act(async () => {
      setNativeInputValue(addressInput!, 'New York Avenue Northwest, Washington, DC, USA');
    });

    const getContinueBtn = () =>
      container.querySelector<HTMLButtonElement>('[data-testid="wizard-continue-btn"]');

    // Step 1 -> Step 2
    await act(async () => {
      getContinueBtn()!.click();
    });

    const priceInput = container.querySelector<HTMLInputElement>('#purchase-price-input');
    const rehabInput = container.querySelector<HTMLInputElement>('#rehab-budget-input');
    const arvInput = container.querySelector<HTMLInputElement>('#arv-input');

    // Case 1 (Bug_19): Purchase Price = $485,000, Rehab Budget = $50,000, Estimated ARV = $10,000 -> Net Profit is $0 (never negative)
    await act(async () => {
      setNativeInputValue(priceInput!, '485000');
      setNativeInputValue(rehabInput!, '50000');
      setNativeInputValue(arvInput!, '10000');
    });

    // Advance Step 2 -> Step 3 -> Step 4 -> Step 5
    for (const _step of [3, 4, 5]) {
      await act(async () => {
        getContinueBtn()!.click();
      });
    }

    const projectedReturnEl = container.querySelector('[data-testid="step5-projected-return"]');
    expect(projectedReturnEl).not.toBeNull();
    expect(projectedReturnEl?.textContent).toBe('$0 Net Profit');
    expect(projectedReturnEl?.textContent).not.toContain('-');

    // Case 2 (Bug_20): Navigate back to Step 2, set Estimated ARV = $625,000 ($625,000 - $485,000 - $50,000 = $90,000 Net Profit)
    const stepperButtons = container.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Wizard Steps"] button',
    );
    await act(async () => {
      stepperButtons[1]!.click();
    });

    const arvInputStep2 = container.querySelector<HTMLInputElement>('#arv-input');
    await act(async () => {
      setNativeInputValue(arvInputStep2!, '625000');
    });

    await act(async () => {
      stepperButtons[4]!.click();
    });

    const updatedReturnEl = container.querySelector('[data-testid="step5-projected-return"]');
    expect(updatedReturnEl?.textContent).toBe('$90,000 Net Profit');
  });
});


