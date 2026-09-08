import { beforeEach, describe, expect, it } from 'vitest';
import { createNormalCard, createXCard, resetCardIdsForTest } from './cards.js';
import { absorb, addNormalCards, addNormalToBoard, canAbsorb, canAdd, canProcessCards, getProcessLegality, pairKey, processCards, settleCollection } from './rules.js';
import { getNextSelection } from './selection.js';
import { createCombineHistoryRecord } from './combineHistory.js';
import { getMaterialResult } from './constants.js';

beforeEach(resetCardIdsForTest);

describe('normal addition', () => {
  it('implements all 12 ordered material combinations', () => {
    expect([
      ['A', 'B', 'C'], ['B', 'A', 'D'],
      ['A', 'C', 'D'], ['C', 'A', 'B'],
      ['A', 'D', 'B'], ['D', 'A', 'C'],
      ['B', 'C', 'A'], ['C', 'B', 'D'],
      ['B', 'D', 'C'], ['D', 'B', 'A'],
      ['C', 'D', 'A'], ['D', 'C', 'B'],
    ].map(([first, second, result]) =>
      getMaterialResult(first, second) === result
    ).every(Boolean)).toBe(true);
  });

  it('uses ordered attributes and creates X above 101', () => {
    expect(addNormalCards(createNormalCard(7, 'A'), createNormalCard(12, 'B')).attribute).toBe('C');
    expect(addNormalCards(createNormalCard(12, 'B'), createNormalCard(7, 'A')).attribute).toBe('D');
    expect(addNormalCards(createNormalCard(70, 'A'), createNormalCard(40, 'A')).kind).toBe('x');
  });
  it('uses board position rather than click order for material order', () => {
    const acid = createNormalCard(7, 'A');
    const alkali = createNormalCard(5, 'B');
    const board = [acid, null, null, null, null, null, null, alkali, null];
    const forward = addNormalToBoard(board, 0, 7, new Set());
    const reverseClick = addNormalToBoard(board, 7, 0, new Set());

    expect(forward.result).toMatchObject({ value: 12, attribute: 'C' });
    expect(reverseClick.result).toMatchObject({ value: 12, attribute: 'C' });

    const swappedBoard = [alkali, null, null, null, null, null, null, acid, null];
    expect(addNormalToBoard(swappedBoard, 7, 0, new Set()).result.attribute).toBe('D');
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

describe('toxic card processing', () => {
  const card = (value, attribute) => createNormalCard(value, attribute);

  it('keeps ordinary processing unchanged', () => {
    expect(canProcessCards(card(18, 'A'), card(24, 'B'), new Set())).toBe(true);
  });

  it('allows equal values with one or two toxic cards in either order', () => {
    const collection = new Set(['A18', 'B18']);
    const toxicAcid = card(18, 'A');
    const toxicBase = card(18, 'B');
    const normal = card(18, 'C');
    expect(canProcessCards(toxicAcid, normal, collection)).toBe(true);
    expect(canProcessCards(normal, toxicAcid, collection)).toBe(true);
    expect(canProcessCards(toxicAcid, toxicBase, collection)).toBe(true);
  });

  it('allows a smaller reducible normal card in either order', () => {
    const collection = new Set(['A18']);
    const toxic = card(18, 'A');
    const smaller = card(6, 'C');
    expect(canProcessCards(toxic, smaller, collection)).toBe(true);
    expect(canProcessCards(smaller, toxic, collection)).toBe(true);
  });

  it('rejects a larger normal card in either order with a specific reason', () => {
    const collection = new Set(['A18']);
    const toxic = card(18, 'A');
    const larger = card(24, 'C');
    expect(canProcessCards(toxic, larger, collection)).toBe(false);
    expect(canProcessCards(larger, toxic, collection)).toBe(false);
    expect(processCards(toxic, larger, collection)).toBeNull();
    expect(processCards(larger, toxic, collection)).toBeNull();
    expect(getProcessLegality(toxic, larger, collection).reason).toContain('毒卡不能');
  });

  it('rejects two toxic cards with different values', () => {
    const collection = new Set(['A18', 'C6']);
    expect(getProcessLegality(card(18, 'A'), card(6, 'C'), collection)).toMatchObject({
      allowed: false,
      reason: '⚠ 两张毒卡仅允许同数处理',
    });
  });

  it('removes restrictions after all four materials are complete', () => {
    const complete = new Set(['A18', 'B18', 'C18', 'D18']);
    expect(canProcessCards(card(18, 'A'), card(24, 'C'), complete)).toBe(true);
  });
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
  expect(first).toMatchObject({ life: 100, score: 37, isNew: true });
  expect(settleCollection(first.collection, first.life, first.score, card)).toMatchObject({ life: 100, score: 37, isNew: false });
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
