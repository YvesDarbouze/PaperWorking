import { DEFAULT_BASECAMP_DATA } from '../../lib/projects/seed-data.js';

describe('Basecamp vendor & guest visibility controls', () => {
  it('filters message topics according to vendor visibility flag', () => {
    const allTopics = DEFAULT_BASECAMP_DATA.messageTopics;
    const vendorVisibleTopics = allTopics.filter((t) => t.vendorVisible);

    expect(allTopics.length).toBeGreaterThan(vendorVisibleTopics.length);
    expect(vendorVisibleTopics.every((t) => t.vendorVisible === true)).toBe(true);
  });

  it('filters task items according to vendor visibility flag', () => {
    const allTasks = DEFAULT_BASECAMP_DATA.tasks;
    const vendorVisibleTasks = allTasks.filter((t) => t.vendorVisible);

    expect(allTasks.length).toBeGreaterThan(vendorVisibleTasks.length);
    expect(vendorVisibleTasks.every((t) => t.vendorVisible === true)).toBe(true);
  });

  it('filters card table cards so internal items are hidden from vendor mode', () => {
    const allCards = DEFAULT_BASECAMP_DATA.cardColumns.flatMap((col) => col.cards);
    const vendorCards = allCards.filter((c) => c.vendorVisible);

    expect(allCards.length).toBeGreaterThan(vendorCards.length);
    expect(vendorCards.every((c) => c.vendorVisible === true)).toBe(true);
  });
});
