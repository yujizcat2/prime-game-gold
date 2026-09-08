import { describe, expect, it } from 'vitest';
import { createNormalCard } from './cards.js';
import { getBoardActionOpportunities } from './actionOpportunities.js';

describe('getBoardActionOpportunities', () => {
  it('counts legal pairs and only new collection opportunities', () => {
    const two = createNormalCard(2, 'A');
    const four = createNormalCard(4, 'B');
    const board = [two, four, null];

    expect(getBoardActionOpportunities(board, {
      collection: new Set(),
      usedPairs: new Set(),
    })).toEqual({ combine: 1, reduce: 1, collect: 1 });

    expect(getBoardActionOpportunities(board, {
      collection: new Set(['A2', 'B2', 'C2', 'D2']),
      usedPairs: new Set(),
    })).toEqual({ combine: 1, reduce: 1, collect: 0 });
  });

  it('does not count combinations when the board has no empty slot', () => {
    const board = [
      createNormalCard(2, 'A'),
      createNormalCard(3, 'B'),
    ];

    expect(getBoardActionOpportunities(board, {
      collection: new Set(),
      usedPairs: new Set(),
    })).toEqual({ combine: 0, reduce: 0, collect: 0 });
  });
});
