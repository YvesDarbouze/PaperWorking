/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpandedModal from '@/components/deals/ExpandedModal';

const MOCK_DEAL = {
  id: 'deal_123mainst',
  slug: '123mainstaustintx78701',
  address: '123 Main St, Austin, TX 78701',
  propertyName: 'Austin Core Multifamily Project',
  city: 'Austin',
  state: 'TX',
  assetClass: 'Multi-family',
  subStrategy: 'FLIP',
  status: 'published',
  purchasePrice: 350000,
  rehabCost: 50000,
  arv: 480000,
  projectedRoi: 18.5,
  fundingTarget: 200000,
  committedAmount: 130000,
  description: 'High-ROI 8-unit value-add property',
};

describe('ExpandedModal Component', () => {
  it('renders left and right panels when modal is open', () => {
    render(
      <ExpandedModal
        isOpen={true}
        onClose={jest.fn()}
        deal={MOCK_DEAL}
        isSubscribed={true}
      />
    );

    expect(screen.getByTestId('expanded-deal-modal')).toBeTruthy();
    expect(screen.getByTestId('expanded-modal-address').textContent).toContain('123 Main St, Austin, TX 78701');
    expect(screen.getByTestId('expanded-modal-left-panel')).toBeTruthy();
    expect(screen.getByTestId('expanded-modal-right-panel')).toBeTruthy();
    expect(screen.getByTestId('expanded-message-thread')).toBeTruthy();
    expect(screen.getByTestId('expanded-deal-analyzer')).toBeTruthy();
  });

  it('triggers onClose when close button or Escape key is pressed', () => {
    const handleClose = jest.fn();
    render(
      <ExpandedModal
        isOpen={true}
        onClose={handleClose}
        deal={MOCK_DEAL}
        isSubscribed={true}
      />
    );

    const closeBtn = screen.getByTestId('close-expanded-modal');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('renders paywall overlay when user is unsubscribed', () => {
    render(
      <ExpandedModal
        isOpen={true}
        onClose={jest.fn()}
        deal={MOCK_DEAL}
        isSubscribed={false}
      />
    );

    expect(screen.getByTestId('expanded-paywall-overlay')).toBeTruthy();
  });
});
