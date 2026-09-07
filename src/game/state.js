import { ATTRIBUTES, BOARD_SIZE } from './constants.js';
import { createNormalCard } from './cards.js';

export function createInitialState(random = Math.random) {
  const board = Array(BOARD_SIZE).fill(null);
  for (let i = 0; i < 3; i += 1) {
    const value = 2 + Math.floor(random() * 8);
    const attribute = ATTRIBUTES[Math.floor(random() * ATTRIBUTES.length)];
    board[i] = createNormalCard(value, attribute);
  }
  return { board, selected: [], usedPairs: new Set(), combineHistory: [], collection: new Set(), life: 100, score: 0, steps: 0, message: '依次选择两张卡，然后执行操作。' };
}
