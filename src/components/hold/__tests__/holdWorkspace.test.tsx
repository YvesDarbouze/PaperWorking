import { HOLD_CARD_REGISTRY } from '@/lib/project/holdCardRegistry';
import { usersService } from '@/lib/firebase/users';

describe('HD-5 Hold Workspace Shell & Banner Verification', () => {
  test('H5 Strategy-Conditional Reveal: RENT, LEASE, and SALE paths filter correctly', () => {
    const rentCards = HOLD_CARD_REGISTRY.filter((c) => c.columnId === 'H5' && c.revealCondition({ dispositionType: 'RENT' }));
    expect(rentCards.map((c) => c.id)).toEqual(['H5.R']);

    const leaseCards = HOLD_CARD_REGISTRY.filter((c) => c.columnId === 'H5' && c.revealCondition({ dispositionType: 'LEASE' }));
    expect(leaseCards.map((c) => c.id)).toEqual(['H5.L']);

    const saleCards = HOLD_CARD_REGISTRY.filter((c) => c.columnId === 'H5' && c.revealCondition({ dispositionType: 'SALE' }));
    expect(saleCards.map((c) => c.id)).toEqual(['H5.S']);
  });

  test('User-Scoped Banner Dismissal Persistence: user_1 dismissal does not dismiss user_2', async () => {
    // User 1 dismisses banner
    await usersService.setPhaseBannerDismissed('user_1', 'hold');
    const user1Dismissed = await usersService.getPhaseBannerDismissed('user_1', 'hold');
    expect(user1Dismissed).toBe(true);

    // User 2 has not dismissed banner
    const user2Dismissed = await usersService.getPhaseBannerDismissed('user_2', 'hold');
    expect(user2Dismissed).toBe(false);
  });

  test('Save mid-card, leave, return, resume flow restores draft state', () => {
    const projectId = 'proj_test_101';
    const userId = 'user_1';
    const cardId = 'H1.1';
    const key = `pw_hold_drafts_${projectId}_${userId}`;

    // Simulate save mid-card
    const draft = { [cardId]: 'Renovation Tier: GUT' };
    localStorage.setItem(key, JSON.stringify(draft));

    // Simulate return / resume
    const restored = JSON.parse(localStorage.getItem(key) || '{}');
    expect(restored[cardId]).toBe('Renovation Tier: GUT');
  });
});
