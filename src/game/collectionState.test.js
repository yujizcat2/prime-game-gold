import { describe, expect, it } from 'vitest';
import { getMaterialDisplayState, getNumberCollectionState, isCardToxic } from './collectionState.js';
import { createNormalCard } from './cards.js';

describe('card collection display state', () => {
  it('shows the normal material without a warning when it is uncollected', () => {
    const state = getMaterialDisplayState(17, 'A', new Set());
    expect(state).toMatchObject({ displayName: '酸', isDuplicateRisk: false });
  });

  it('shows a toxic warning for a collected material before all four are complete', () => {
    const state = getMaterialDisplayState(17, 'A', new Set(['A17', 'C17']));
    expect(state).toMatchObject({ displayName: '毒酸', isDuplicateRisk: true, isNumberComplete: false });
  });

  it('reports each material accurately and marks all four as complete', () => {
    const partial = getNumberCollectionState(17, new Set(['A17', 'C17']));
    expect(partial.materials.map(({ collected }) => collected)).toEqual([true, false, true, false]);

    const complete = getNumberCollectionState(17, new Set(['A17', 'B17', 'C17', 'D17']));
    expect(complete.materials.every(({ collected }) => collected)).toBe(true);
    expect(complete.isNumberComplete).toBe(true);
  });

  it('removes the toxic warning after all four materials are complete', () => {
    const collection = new Set(['A17', 'B17', 'C17', 'D17']);
    const state = getMaterialDisplayState(17, 'A', collection);
    expect(state).toMatchObject({ displayName: '酸', isDuplicateRisk: false, isNumberComplete: true });
    expect(isCardToxic(createNormalCard(17, 'A'), collection)).toBe(false);
  });

  it('recalculates from the current value, material, and collection', () => {
    const collection = new Set(['A17']);
    expect(getMaterialDisplayState(17, 'A', collection).isDuplicateRisk).toBe(true);
    expect(getMaterialDisplayState(18, 'A', collection).isDuplicateRisk).toBe(false);
    expect(getMaterialDisplayState(17, 'B', collection).isDuplicateRisk).toBe(false);
  });
});
