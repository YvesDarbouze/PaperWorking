/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import NewProjectPage from '@/app/dashboard/projects/new/page';
import { useAcquisitionWizard } from '@/store/acquisitionWizardStore';

// ── Mock next/navigation ───────────────────────────────
const mockReplace = jest.fn();
const mockGet = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// ── Mock AcquisitionWizard component ────────────────────
jest.mock('@/components/acquisition/AcquisitionWizard', () => ({
  AcquisitionWizard: () => <div data-testid="wizard" />,
}));

describe('NewProjectPage — DM-9 Rehydration Funnel', () => {
  const store = useAcquisitionWizard.getState();
  const originalReset = store.reset;
  const originalSetAddress = store.setAddress;

  const mockReset = jest.fn();
  const mockSetAddress = jest.fn();

  beforeAll(() => {
    // Intercept store actions
    useAcquisitionWizard.setState({
      reset: mockReset,
      setAddress: mockSetAddress,
    });
  });

  afterAll(() => {
    // Restore original store actions
    useAcquisitionWizard.setState({
      reset: originalReset,
      setAddress: originalSetAddress,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockGet.mockReturnValue(null);
  });

  it('resumes draft via initialProjectId if resume query param is present', () => {
    mockGet.mockReturnValue('project_draft_123');

    render(<NewProjectPage />);

    // Should not reset or fetch from sessionStorage
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockSetAddress).not.toHaveBeenCalled();
  });

  it('rehydrates resolved address from sessionStorage on fresh mount', () => {
    const resolvedAddress = {
      placeId: 'place_abc',
      formattedAddress: '789 Main St, Austin, TX 78701',
      displayName: '789 Main St',
      addressLine: '789 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      lat: 30.26,
      lng: -97.74,
    };
    sessionStorage.setItem('pw_pending_project_address', JSON.stringify(resolvedAddress));

    render(<NewProjectPage />);

    // Verify store is reset and resolved address is populated
    expect(mockReset).toHaveBeenCalled();
    expect(mockSetAddress).toHaveBeenCalledWith(resolvedAddress);

    // Verify sessionStorage is cleared to prevent re-populating on subsequent visits
    expect(sessionStorage.getItem('pw_pending_project_address')).toBeNull();
  });

  it('rehydrates resolved address from query parameters and cleans the URL', () => {
    const resolvedAddress = {
      placeId: 'place_xyz',
      formattedAddress: '123 Oak St, Austin, TX 78704',
      displayName: '123 Oak St',
      addressLine: '123 Oak St',
      city: 'Austin',
      state: 'TX',
      zip: '78704',
      lat: 30.25,
      lng: -97.76,
    };

    // Mock query parameters
    mockGet.mockImplementation((param: string) => {
      switch (param) {
        case 'address':
          return resolvedAddress.formattedAddress;
        case 'placeId':
          return resolvedAddress.placeId;
        case 'displayName':
          return resolvedAddress.displayName;
        case 'addressLine':
          return resolvedAddress.addressLine;
        case 'city':
          return resolvedAddress.city;
        case 'state':
          return resolvedAddress.state;
        case 'zip':
          return resolvedAddress.zip;
        case 'lat':
          return '30.25';
        case 'lng':
          return '-97.76';
        default:
          return null;
      }
    });

    render(<NewProjectPage />);

    // Verify store populated
    expect(mockReset).toHaveBeenCalled();
    expect(mockSetAddress).toHaveBeenCalledWith(resolvedAddress);

    // Verify query parameters are cleared via router.replace
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/projects/new');
  });
});
