import { beforeEach, describe, expect, it } from 'vitest';
import { createNormalCard, createXCard, resetCardIdsForTest } from './cards.js';
import { absorb, addNormalCards, addNormalToBoard, canAbsorb, canAdd, pairKey, processCards, settleCollection } from './rules.js';
import { getNextSelection } from './selection.js';
import { createCombineHistoryRecord } from './combineHistory.js';

beforeEach(resetCardIdsForTest);

describe('normal addition', () => {
  it('uses ordered attributes and creates X above 101', () => {
    expect(addNormalCards(createNormalCard(7, 'A'), createNormalCard(12, 'B')).attribute).toBe('C');
    expect(addNormalCards(createNormalCard(12, 'B'), createNormalCard(7, 'A')).attribute).toBe('D');
    expect(addNormalCards(createNormalCard(70, 'A'), createNormalCard(40, 'A')).kind).toBe('x');
  });
  it('shares a pair opportunity between both orders and blocks direct parents', () => {
    const a = createNormalCard(7, 'A'); const b = createNormalCard(12, 'B');
    expect(canAdd(b, a, new Set([pairKey(a, b)]))).toBe(false);
    expect(canAdd(createNormalCard(3, 'C', [a.id]), a, new Set())).toBe(false);
  });
  it('keeps both parents and places a new child in the first empty cell', () => {
    const a = createNormalCard(7, 'A'); const b = createNormalCard(12, 'B');
    const board = [a, null, b, null, null, null, null, null, null];
    const countBefore = board.filter(Boolean).length;
    const outcome = addNormalToBoard(board, 0, 2, new Set());
    expect(outcome.targetIndex).toBe(1);
    expect(outcome.board[0]).toBe(a);
    expect(outcome.board[2]).toBe(b);
    expect(outcome.board[1]).toMatchObject({ value: 19, attribute: 'C', parents: [a.id, b.id] });
    expect(outcome.board[1].parentSnapshot).toEqual([{ value: 7, attribute: 'A' }, { value: 12, attribute: 'B' }]);
    expect(outcome.board[1].id).not.toBe(a.id);
    expect(outcome.board[1].id).not.toBe(b.id);
    expect(countBefore).toBe(2);
    expect(outcome.board.filter(Boolean).length).toBe(3);
    expect(canAdd(a, b, outcome.usedPairs)).toBe(false);
    expect(canAdd(outcome.board[1], a, outcome.usedPairs)).toBe(false);
  });
  it('cannot add on a full board because the child needs a new cell', () => {
    const board = Array.from({ length: 9 }, (_, i) => createNormalCard(i + 2, 'A'));
    expect(addNormalToBoard(board, 0, 1, new Set())).toBeNull();
  });
});

it('processes by GCD and collects the pre-process card that becomes 1', () => {
  const a = createNormalCard(35, 'A'); const b = createNormalCard(5, 'B');
  const result = processCards(a, b);
  expect(result.first.value).toBe(7); expect(result.second).toBeNull(); expect(result.collections[0]).toBe(b);
});

it('binds absorbed values to one X and wraps above 201', () => {
  const x = createXCard(120); const seven = createNormalCard(7, 'A');
  const changed = absorb(x, seven);
  expect(canAbsorb(changed, createNormalCard(7, 'D'))).toBe(false);
  const wrapped = absorb(createXCard(190), createNormalCard(17, 'B'));
  expect(wrapped).toMatchObject({ kind: 'normal', value: 7, attribute: 'B' });
});

it('keeps an X parent snapshot through absorption and wrapping', () => {
  const a = createNormalCard(73, 'A'); const b = createNormalCard(47, 'C');
  const x = addNormalCards(a, b);
  const snapshot = x.parentSnapshot;
  const absorbed = absorb(x, createNormalCard(17, 'B'));
  expect(absorbed.parentSnapshot).toBe(snapshot);
  const wrapped = absorb({ ...x, value: 190 }, createNormalCard(17, 'B'));
  expect(wrapped.parentSnapshot).toEqual(snapshot);
});

it('stores an immutable ordered combine history snapshot', () => {
  const first = createNormalCard(7, 'A'); const second = createNormalCard(12, 'B');
  const child = addNormalCards(first, second);
  const record = createCombineHistoryRecord(first, second, child, 4);
  first.value = 70; second.attribute = 'D'; child.value = 99;
  expect(record).toMatchObject({ step: 4, parent1: { value: 7, attribute: 'A' }, parent2: { value: 12, attribute: 'B' }, child: { value: 19, attribute: 'C' } });
  expect(Object.isFrozen(record)).toBe(true);
});

it('records an over-101 result as X without reordering its parents', () => {
  const first = createNormalCard(73, 'A'); const second = createNormalCard(47, 'C');
  const record = createCombineHistoryRecord(first, second, addNormalCards(first, second), 9);
  expect(record).toMatchObject({ parent1: { value: 73, attribute: 'A' }, parent2: { value: 47, attribute: 'C' }, child: { value: 120, attribute: 'X' } });
});

it('settles new and duplicate collections', () => {
  const card = createNormalCard(37, 'D');
  const first = settleCollection(new Set(), 100, 0, card);
  expect(first).toMatchObject({ life: 105, score: 37, isNew: true });
  expect(settleCollection(first.collection, first.life, first.score, card)).toMatchObject({ life: 95, score: 37, isNew: false });
});

it('reaches the fixed score 20,600 for all 400 unique targets', () => {
  let state = { collection: new Set(), life: 100, score: 0 };
  for (let value = 2; value <= 101; value += 1) {
    for (const attribute of ['A', 'B', 'C', 'D']) {
      state = settleCollection(state.collection, state.life, state.score, createNormalCard(value, attribute));
    }
  }
  expect(state.collection.size).toBe(400);
  expect(state.score).toBe(20600);
});

it('keeps the first selection while replacing or cancelling the second', () => {
  expect(getNextSelection([], 2)).toEqual([2]);
  expect(getNextSelection([2], 5)).toEqual([2, 5]);
  expect(getNextSelection([2, 5], 7)).toEqual([2, 7]);
  expect(getNextSelection([2, 5], 5)).toEqual([2]);
  expect(getNextSelection([2, 5], 2)).toEqual([]);
});
