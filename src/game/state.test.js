import { describe, expect, it } from 'vitest';
import { createInitialState } from './state.js';

const occupiedIndexes = (board) => board
  .map((card, index) => card ? index : null)
  .filter((index) => index !== null);

describe('initial game board', () => {
  it('places one card of each material in the corner layout', () => {
    const state = createInitialState(() => 0);
    const cards = state.board.filter(Boolean);

    expect(occupiedIndexes(state.board)).toEqual([0, 2, 6, 8]);
    expect(cards.map((card) => card.attribute).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(cards.every((card) => card.value === 2)).toBe(true);
  });

  it('uses the diamond layout and allows independently repeated values', () => {
    const values = [0.75, 0, 0, 0, 0.625, 0.625, 0.625, 0.625];
    let call = 0;
    const state = createInitialState(() => values[call++]);
    const cards = state.board.filter(Boolean);

    expect(occupiedIndexes(state.board)).toEqual([1, 3, 5, 7]);
    expect(cards.map((card) => card.attribute).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(cards.map((card) => card.value)).toEqual([7, 7, 7, 7]);
    expect(state.board[4]).toBeNull();
  });
});
