import { canAdd, processCards } from './rules.js';

export function getBoardActionOpportunities(board, gameState) {
  const opportunities = {
    combine: 0,
    reduce: 0,
    collect: 0,
  };
  const collection = gameState.collection ?? new Set();
  const usedPairs = gameState.usedPairs ?? new Set();
  const hasEmptySlot = board.some((card) => card === null);

  for (let firstIndex = 0; firstIndex < board.length; firstIndex += 1) {
    const first = board[firstIndex];
    if (!first) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < board.length; secondIndex += 1) {
      const second = board[secondIndex];
      if (!second) continue;

      if (hasEmptySlot && canAdd(first, second, usedPairs)) {
        opportunities.combine += 1;
      }

      const processResult = processCards(first, second, collection);
      if (!processResult) continue;

      opportunities.reduce += 1;
      opportunities.collect += processResult.collections.filter(
        (card) => !collection.has(`${card.attribute}${card.value}`)
      ).length;
    }
  }

  return opportunities;
}
