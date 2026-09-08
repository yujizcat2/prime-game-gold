import { expect, it } from 'vitest';
import { runTestGame, summarizeTestResults } from './testSimulation.js';

it('does not use or report life as a simulation terminal condition', () => {
  const result = runTestGame({ maxSteps: 0, random: () => 0 });
  const summary = summarizeTestResults([result]);

  expect(result.endReason).toBe('步数上限');
  expect(result).not.toHaveProperty('life');
  expect(summary).not.toHaveProperty('averageLife');
  expect(summary).not.toHaveProperty('deaths');
});
