import { beforeEach, describe, expect, it } from 'vitest';
import { createNormalCard, resetCardIdsForTest } from './cards.js';
import { getProcessLegality } from './rules.js';
import {
  choosePoisonCollectionAction,
  runTestGame,
  scorePoisonCollectionAction,
  summarizeTestResults,
} from './testSimulation.js';

beforeEach(resetCardIdsForTest);

const stateWith = (board, collection = new Set()) => ({
  board: [...board, ...Array(9 - board.length).fill(null)],
  collection,
  usedPairs: new Set(),
  score: 0,
  steps: 0,
  life: 100,
});

it('does not use or report life as a simulation terminal condition', () => {
  const result = runTestGame({ maxSteps: 0, random: () => 0 });
  const summary = summarizeTestResults([result]);

  expect(result.endReason).toBe('步数上限');
  expect(result).not.toHaveProperty('life');
  expect(summary).not.toHaveProperty('averageLife');
  expect(summary).not.toHaveProperty('deaths');
});

describe('Poison Collection AI', () => {
  it('scores a 3/4 to 4/4 collection above an ordinary new collection', () => {
    const state = stateWith([
      createNormalCard(6, 'D'), createNormalCard(18, 'A'),
      createNormalCard(5, 'D'), createNormalCard(15, 'A'),
    ], new Set(['A6', 'B6', 'C6']));
    expect(scorePoisonCollectionAction(state, { type: 'process', firstIndex: 0, secondIndex: 1 }))
      .toBeGreaterThan(scorePoisonCollectionAction(state, { type: 'process', firstIndex: 2, secondIndex: 3 }));
  });

  it('prefers an otherwise similar add that does not create a toxic card', () => {
    const state = stateWith([
      createNormalCard(5, 'A'), createNormalCard(7, 'A'),
      createNormalCard(5, 'B'), createNormalCard(7, 'B'),
    ], new Set(['A12']));
    const toxicAdd = scorePoisonCollectionAction(state, { type: 'add', firstIndex: 0, secondIndex: 1 });
    const safeAdd = scorePoisonCollectionAction(state, { type: 'add', firstIndex: 2, secondIndex: 3 });
    expect(safeAdd).toBeGreaterThan(toxicAdd);
  });

  it('penalizes a newly created toxic card more when it has no process exit', () => {
    const trapped = stateWith(
      [createNormalCard(5, 'A'), createNormalCard(7, 'A')],
      new Set(['A12'])
    );
    const escapable = stateWith(
      [createNormalCard(5, 'A'), createNormalCard(7, 'A'), createNormalCard(6, 'B')],
      new Set(['A12'])
    );
    const action = { type: 'add', firstIndex: 0, secondIndex: 1 };
    expect(scorePoisonCollectionAction(escapable, action))
      .toBeGreaterThan(scorePoisonCollectionAction(trapped, action));
  });

  it('treats a duplicate of a completed number as non-toxic', () => {
    const complete = new Set(['A6', 'B6', 'C6', 'D6']);
    const state = stateWith([
      createNormalCard(6, 'D'), createNormalCard(18, 'A'),
      createNormalCard(5, 'B'), createNormalCard(10, 'C'),
    ], complete);
    expect(scorePoisonCollectionAction(state, { type: 'process', firstIndex: 0, secondIndex: 1 }))
      .toBeGreaterThan(-4200);
  });

  it('rewards removing a toxic card and heavily penalizes a dead board', () => {
    const toxicState = stateWith(
      [
        createNormalCard(18, 'A'), createNormalCard(6, 'C'),
        createNormalCard(5, 'B'), createNormalCard(10, 'D'),
      ],
      new Set(['A18'])
    );
    expect(scorePoisonCollectionAction(toxicState, { type: 'process', firstIndex: 0, secondIndex: 1 }))
      .toBeGreaterThan(0);

    const deadState = stateWith([createNormalCard(6, 'A'), createNormalCard(6, 'B')]);
    expect(scorePoisonCollectionAction(deadState, { type: 'process', firstIndex: 0, secondIndex: 1 }))
      .toBeLessThan(-1000000);
  });

  it('only chooses process actions accepted by the formal poison rule', () => {
    const state = stateWith([
      createNormalCard(18, 'A'), createNormalCard(24, 'B'), createNormalCard(6, 'C'),
    ], new Set(['A18']));
    const action = choosePoisonCollectionAction(state, () => 0);
    if (action.type === 'process') {
      expect(getProcessLegality(
        state.board[action.firstIndex],
        state.board[action.secondIndex],
        state.collection
      ).allowed).toBe(true);
    }
  });

  it('keeps all three modes independently runnable', () => {
    expect(runTestGame({ mode: 'random', maxSteps: 1, random: () => 0 }).mode).toBe('random');
    expect(runTestGame({ mode: 'collection', maxSteps: 1, random: () => 0 }).mode).toBe('collection');
    expect(runTestGame({ mode: 'poison-collection', maxSteps: 1, random: () => 0 }).mode).toBe('poison-collection');
  });
});
