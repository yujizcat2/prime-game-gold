import { beforeEach, describe, expect, it } from 'vitest';
import { createNormalCard, createXCard, resetCardIdsForTest } from './cards.js';
import { getProcessLegality } from './rules.js';
import {
  choosePoisonCollectionAction,
  createBoardFunctionalFingerprint,
  createBoardLineageFingerprint,
  createBoardLineageStructureFingerprint,
  createFullSimulationFingerprint,
  createLoopDetector,
  getLegalTestActions,
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

it('includes both absorb and gcd process actions for an eligible X pair', () => {
  const actions = getLegalTestActions(stateWith([
    createXCard(120),
    createNormalCard(8, 'A'),
  ]));

  expect(actions).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'absorb' }),
    expect.objectContaining({ type: 'process' }),
  ]));
});

describe('simulation fingerprints', () => {
  const fingerprintState = (board, overrides = {}) => ({
    ...stateWith(board),
    ...overrides,
  });

  it('matches identical positioned values and materials but not moved cards', () => {
    const first = fingerprintState([createNormalCard(9, 'D'), null, createNormalCard(18, 'D')]);
    const same = fingerprintState([createNormalCard(9, 'D'), null, createNormalCard(18, 'D')]);
    const moved = fingerprintState([null, createNormalCard(9, 'D'), createNormalCard(18, 'D')]);
    expect(createBoardFunctionalFingerprint(first)).toBe(createBoardFunctionalFingerprint(same));
    expect(createBoardFunctionalFingerprint(first)).not.toBe(createBoardFunctionalFingerprint(moved));
  });

  it('distinguishes parent structure and exact card instances separately', () => {
    const base = createNormalCard(12, 'C', ['parent-1'], [{ value: 5, attribute: 'A' }, { value: 7, attribute: 'B' }]);
    const newInstance = { ...base, id: 'different-card-id' };
    const newParent = { ...newInstance, parents: ['parent-2'] };
    const first = fingerprintState([base]);
    const sameStructure = fingerprintState([newInstance]);
    const differentStructure = fingerprintState([newParent]);

    expect(createBoardFunctionalFingerprint(first)).toBe(createBoardFunctionalFingerprint(differentStructure));
    expect(createBoardLineageStructureFingerprint(first)).toBe(createBoardLineageStructureFingerprint(sameStructure));
    expect(createBoardLineageFingerprint(first)).not.toBe(createBoardLineageFingerprint(sameStructure));
    expect(createBoardLineageStructureFingerprint(first)).not.toBe(createBoardLineageStructureFingerprint(differentStructure));
  });

  it('detects a seven-step functional period', () => {
    const detector = createLoopDetector();
    const state = fingerprintState([createNormalCard(9, 'D')]);
    detector.record(state, 10);
    detector.record(state, 17);
    expect(detector.snapshot().functional).toMatchObject({
      firstLoop: { firstStep: 10, repeatStep: 17, period: 7 },
      shortestPeriod: 7,
      repeatCount: 1,
    });
  });

  it('excludes telemetry from the full-state fingerprint', () => {
    const card = createNormalCard(9, 'D');
    const first = fingerprintState([card], { steps: 10, score: 20, history: ['a'] });
    const later = fingerprintState([card], { steps: 99, score: 999, history: ['a', 'b'] });
    expect(createFullSimulationFingerprint(first)).toBe(createFullSimulationFingerprint(later));
  });
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

describe('simulation telemetry reporting', () => {
  it('records speed and authoritative action opportunities for every state', () => {
    const result = runTestGame({ mode: 'poison-collection', maxSteps: 1, random: () => 0 });
    expect(result.telemetry).toHaveLength(result.steps + 1);
    expect(result.telemetry[0]).toMatchObject({
      step: 0,
      currentScore: 0,
      currentSpeed: 0,
    });
    expect(result.telemetry[0].totalActionOpportunities).toBe(
      result.telemetry[0].combineOpportunities + result.telemetry[0].reduceOpportunities
    );
    expect(result.speed).toBe(result.steps === 0 ? 0 : result.score / result.steps);
    expect(result.collectionSpeed).toBe(
      result.steps === 0 ? 0 : result.newCollections / result.steps
    );
  });

  it('averages per-game speeds and reports step percentiles', () => {
    const base = {
      collection: 0,
      newCollections: 0,
      duplicates: 0,
      toxicCreated: 0,
      toxicRemoved: 0,
      finalToxic: 0,
      completedNumbers: 0,
      combine: 0,
      process: 0,
      absorb: 0,
      xCreated: 0,
      finalBoardSum: 0,
      averageBoardSum: 0,
      maxNumberSeen: 0,
      averageCombineOpportunities: 0,
      averageReduceOpportunities: 0,
      averageCollectOpportunities: 0,
      averageTotalActionOpportunities: 0,
      minimumTotalActionOpportunities: 0,
      collectionSpeed: 0,
      loops: {
        functional: { firstLoop: null },
        lineageStructure: { firstLoop: null },
        lineageInstance: { firstLoop: null },
        fullState: { firstLoop: null },
      },
      endReason: '步数上限',
    };
    const summary = summarizeTestResults([
      { ...base, steps: 2, score: 20, speed: 10 },
      { ...base, steps: 10, score: 20, speed: 2 },
    ]);
    expect(summary.averageSpeed).toBe(6);
    expect(summary.averageSpeed).not.toBe(summary.averageScore / summary.averageSteps);
    expect(summary.medianSteps).toBe(6);
    expect(summary.p25Steps).toBe(4);
    expect(summary.p75Steps).toBe(8);
    expect(summary.p90Steps).toBeCloseTo(9.2);
  });
});
