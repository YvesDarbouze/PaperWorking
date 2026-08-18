'use client';

import React from 'react';
import AcquisitionPanel from './AcquisitionPanel';
import PurchasePanel from './PurchasePanel';
import HoldPanel from './HoldPanel';
import ExitPanel from './ExitPanel';

export default function PhasePanelsContainer() {
  return (
    <div data-testid="phase-panels-container" className="space-y-8 w-full">
      <AcquisitionPanel />
      <PurchasePanel />
      <HoldPanel />
      <ExitPanel />
    </div>
  );
}
