export const ATTRIBUTES = ['A', 'B', 'C', 'D'];

export const ATTRIBUTE_NAMES = {
  A: '金', B: '银', C: '铜', D: '铁', X: '熔体',
};

// Rows are the first selection; columns are the second selection.
export const ADDITION_ATTRIBUTE = {
  A: { A: 'A', B: 'C', C: 'D', D: 'B' },
  B: { A: 'D', B: 'B', C: 'A', D: 'C' },
  C: { A: 'B', B: 'D', C: 'C', D: 'A' },
  D: { A: 'C', B: 'A', C: 'B', D: 'D' },
};

export const BOARD_SIZE = 9;
export const MAX_NORMAL_VALUE = 101;
export const X_WRAP_THRESHOLD = 201;
export const X_WRAP_AMOUNT = 200;
