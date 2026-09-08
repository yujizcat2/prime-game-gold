import { ATTRIBUTES, BOARD_SIZE } from './constants.js';
import { createNormalCard } from './cards.js';

export function createInitialState(random = Math.random) {
  const board = Array(BOARD_SIZE).fill(null);
  const positions = random() < 0.5
    ? [0, 2, 6, 8]
    : [1, 3, 5, 7];
  const attributes = [...ATTRIBUTES];

  for (let i = attributes.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(random() * (i + 1));
    [attributes[i], attributes[swapIndex]] = [attributes[swapIndex], attributes[i]];
  }

  positions.forEach((position, index) => {
    const value = 2 + Math.floor(random() * 8);
    board[position] = createNormalCard(value, attributes[index]);
  });
  return { board, selected: [], usedPairs: new Set(), combineHistory: [], collection: new Set(), life: 100, score: 0, steps: 0, message: '依次选择两张卡，然后执行操作。' };
}
