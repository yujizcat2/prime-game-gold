import {
  ADDITION_ATTRIBUTE, MAX_NORMAL_VALUE, X_WRAP_AMOUNT, X_WRAP_THRESHOLD,
} from './constants.js';
import { createNormalCard, createXCard } from './cards.js';

export const pairKey = (a, b) => [a.id, b.id].sort().join('|');

export function canAdd(a, b, usedPairs) {
  if (!a || !b || a.id === b.id || a.kind !== 'normal' || b.kind !== 'normal') return false;
  if (usedPairs.has(pairKey(a, b))) return false;
  if (a.parents.includes(b.id) || b.parents.includes(a.id)) return false;
  return true;
}

export function addNormalCards(first, second) {
  const value = first.value + second.value;
  const parents = [first.id, second.id];
  const parentSnapshot = [first, second].map(({ value: parentValue, attribute }) => ({ value: parentValue, attribute }));
  if (value > MAX_NORMAL_VALUE) return createXCard(value, parents, parentSnapshot);
  return createNormalCard(value, ADDITION_ATTRIBUTE[first.attribute][second.attribute], parents, parentSnapshot);
}

// Normal addition follows the original game's board behavior: both source cards
// stay in place and a newly identified child enters the first empty cell.
export function addNormalToBoard(board, firstIndex, secondIndex, usedPairs) {
  const first = board[firstIndex];
  const second = board[secondIndex];
  const targetIndex = board.findIndex((card) => card === null);
  if (targetIndex === -1 || !canAdd(first, second, usedPairs)) return null;

  const result = addNormalCards(first, second);
  const nextBoard = [...board];
  nextBoard[targetIndex] = result;
  return {
    board: nextBoard,
    result,
    targetIndex,
    usedPairs: new Set(usedPairs).add(pairKey(first, second)),
  };
}

export function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

export function processCards(a, b) {
  if (!a || !b || a.id === b.id || a.kind !== 'normal' || b.kind !== 'normal') return null;
  const divisor = gcd(a.value, b.value);
  if (divisor <= 1) return null;
  return {
    first: a.value / divisor === 1 ? null : { ...a, value: a.value / divisor },
    second: b.value / divisor === 1 ? null : { ...b, value: b.value / divisor },
    collections: [a.value / divisor === 1 ? a : null, b.value / divisor === 1 ? b : null].filter(Boolean),
  };
}

export function canAbsorb(x, normal) {
  return Boolean(x && normal && x.kind === 'x' && normal.kind === 'normal'
    && !x.absorbedValues.includes(normal.value));
}

export function absorb(x, normal) {
  const value = x.value + normal.value;
  if (value > X_WRAP_THRESHOLD) {
    return createNormalCard(value - X_WRAP_AMOUNT, normal.attribute, [x.id, normal.id], x.parentSnapshot);
  }
  return { ...x, value, absorbedValues: [...x.absorbedValues, normal.value] };
}

export function settleCollection(collection, life, score, card) {
  const key = `${card.attribute}${card.value}`;
  if (collection.has(key)) return { collection, life: life - 10, score, isNew: false };
  const attributesOwned = ['A', 'B', 'C', 'D'].filter((attr) => collection.has(`${attr}${card.value}`)).length;
  const next = new Set(collection);
  next.add(key);
  return { collection: next, life: life + (5 - attributesOwned), score: score + card.value, isNew: true };
}
