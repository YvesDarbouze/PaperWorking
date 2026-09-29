/**
 * Test Suite: Team Tier-Gating, Vendor Directory, and Contextual Recommendations
 *
 * Verifies:
 * 1. AssignOrInviteModal: Displays tier-gating upgrade error screen for solo Investor tier.
 * 2. AssignOrInviteModal: Links directly to /dashboard/settings?tab=subscription.
 * 3. AssignOrInviteModal: Allows viewing and assigning Subscribed Vendors in state on all tiers.
 * 4. AssignOrInviteModal: Unlocks full team assignment for Investment Team tier.
 * 5. TeamTierUpgradeModal: Renders clear tier-upgrade explanation and settings CTA.
 * 6. VendorMarketplaceSuggestions: Suggests verified marketplace vendors by trade & state.
 * 7. VendorMarketplaceSuggestions: Displays invite-to-bid fallback when no vendors in state.
 */

import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import AssignOrInviteModal from '../../components/projects/AssignOrInviteModal';
import {
  TeamTierUpgradeModal,
  VendorMarketplaceSuggestions,
} from '../../components/projects/fund';

describe('Team Tier-Gating, Vendor Directory, and Contextual Recommendations', () => {
  const defaultTask = {
    id: 'task-appraisal-1',
    title: 'Order Commercial Narrative Appraisal',
    assignedTo: 'Elena Rostova',
  };

  const defaultMembers = [
    { id: 'usr-1', name: 'Alex Morgan', role: 'Lead Underwriter' },
    { id: 'usr-2', name: 'Elena Rostova', role: 'Debt Broker' },
  ];

  describe('AssignOrInviteModal Tier-Gating', () => {
    it('shows team tier requirement error screen on solo Investor tier', () => {
      const html = renderToString(
        <AssignOrInviteModal
          isOpen={true}
          onClose={() => {}}
          projectId="proj-1"
          task={defaultTask}
          existingMembers={defaultMembers}
          userTier="Investor"
          propertyState="TX"
          onAssignExisting={() => {}}
          onMemberInvitedAndAssigned={() => {}}
        />
      );

      // Verify tier-gate error screen is rendered
      expect(html).toContain('team-tier-error-screen');
      expect(html).toContain('Team Account Required');
      expect(html).toContain('requires an <strong>Investment Team</strong> subscription');
      expect(html).toContain('/dashboard/settings?tab=subscription');
      expect(html).toContain('Go to Settings to Upgrade');
      expect(html).toContain('Browse Subscribed Vendors in TX');
    });

    it('renders state vendor directory on Vendors tab accessible to all tiers', () => {
      const html = renderToString(
        <AssignOrInviteModal
          isOpen={true}
          onClose={() => {}}
          projectId="proj-1"
          task={defaultTask}
          existingMembers={defaultMembers}
          initialTab="vendors"
          userTier="Investor"
          propertyState="TX"
          onAssignExisting={() => {}}
          onMemberInvitedAndAssigned={() => {}}
        />
      );

      // Subscribed vendors in TX must be listed
      expect(html).toContain('Lone Star Inspections');
      expect(html).toContain('Apex Valuation &amp; Appraisals');
      expect(html).toContain('First National Title &amp; Settlement');
      expect(html).toContain('Assign Vendor');
      expect(html).toContain('Vendors in TX');
    });

    it('allows normal team member assignment on Investment Team tier', () => {
      const html = renderToString(
        <AssignOrInviteModal
          isOpen={true}
          onClose={() => {}}
          projectId="proj-1"
          task={defaultTask}
          existingMembers={defaultMembers}
          userTier="Investment Team"
          propertyState="TX"
          onAssignExisting={() => {}}
          onMemberInvitedAndAssigned={() => {}}
        />
      );

      // No error screen on Investment Team tier
      expect(html).not.toContain('team-tier-error-screen');
      expect(html).toContain('Alex Morgan');
      expect(html).toContain('Lead Underwriter');
      expect(html).toContain('assign-button-Alex Morgan');
    });
  });

  describe('TeamTierUpgradeModal', () => {
    it('renders upgrade explanation, tier notice, and settings link', () => {
      const html = renderToString(
        <TeamTierUpgradeModal
          isOpen={true}
          onClose={jest.fn()}
          currentTier="Investor"
          targetTaskTitle="Review Environmental Phase I"
          onSwitchToVendors={jest.fn()}
        />
      );

      expect(html).toContain('team-tier-upgrade-modal');
      expect(html).toContain('Team Member Assignment Requires Investment Team Tier');
      expect(html).toContain('Review Environmental Phase I');
      expect(html).toContain('Subscribed Vendors Available on All Tiers');
      expect(html).toContain('/dashboard/settings?tab=subscription');
      expect(html).toContain('Go to Settings &amp; Upgrade');
      expect(html).toContain('Assign Subscribed Vendor Instead');
    });
  });

  describe('VendorMarketplaceSuggestions', () => {
    it('suggests matching state vendors for trade with ratings and fees', () => {
      const html = renderToString(
        <VendorMarketplaceSuggestions
          taskTitle="Order Commercial Narrative Appraisal"
          requiredTrade="Appraiser"
          propertyState="TX"
          onAssignVendor={jest.fn()}
        />
      );

      expect(html).toContain('vendor-marketplace-suggestions');
      expect(html).toContain('Apex Valuation &amp; Appraisals');
      expect(html).toContain('Austin, TX');
      expect(html).toContain('$650–$1,400');
      expect(html).toContain('5d avg');
      expect(html).toContain('4.9');
      expect(html).toContain('Request Quote / Assign');
      expect(html).toContain('+ Invite External Vendor to Bid');
    });

    it('renders fallback alert and invite-to-bid CTA when no vendors exist in state', () => {
      const html = renderToString(
        <VendorMarketplaceSuggestions
          taskTitle="Seismic Geotechnical Borings"
          requiredTrade="Seismic Geotech"
          propertyState="WY"
          onInviteVendorToBid={jest.fn()}
        />
      );

      expect(html).toContain('no-vendors-in-state-alert');
      expect(html).toContain('No verified <strong>Seismic Geotech</strong> vendors are currently listed in <strong>WY</strong>');
      expect(html).toContain('Invite a Vendor You Know to Bid');
    });
  });
});
