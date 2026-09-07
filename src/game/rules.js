import {
  ADDITION_ATTRIBUTE,
  MAX_NORMAL_VALUE,
  X_WRAP_AMOUNT,
  X_WRAP_THRESHOLD,
} from './constants.js';

import {
  createNormalCard,
  createXCard,
} from './cards.js';


/*
 * ============================================================
 * 卡片配对 key
 * ============================================================
 *
 * 同一对具体卡片只能相加一次。
 * 顺序不影响“是否已经使用过”。
 * ============================================================
 */

export const pairKey = (a, b) =>
  [a.id, b.id]
    .sort()
    .join('|');


/*
 * ============================================================
 * 是否可以相加
 * ============================================================
 */

export function canAdd(
  a,
  b,
  usedPairs
) {
  if (
    !a ||
    !b ||
    a.id === b.id ||
    a.kind !== 'normal' ||
    b.kind !== 'normal'
  ) {
    return false;
  }

  /*
   * 这一对具体卡已经相加过。
   */
  if (
    usedPairs.has(
      pairKey(a, b)
    )
  ) {
    return false;
  }

  /*
   * 子卡不能与直接父母再次相加。
   */
  if (
    a.parents.includes(b.id) ||
    b.parents.includes(a.id)
  ) {
    return false;
  }

  return true;
}


/*
 * ============================================================
 * 两张普通卡相加
 * ============================================================
 *
 * 数字：
 * a + b
 *
 * <= 101：
 * 根据有序属性表生成 ABCD。
 *
 * > 101：
 * 生成 X。
 * ============================================================
 */

export function addNormalCards(
  first,
  second
) {
  const value =
    first.value +
    second.value;

  const parents = [
    first.id,
    second.id,
  ];

  const parentSnapshot =
    [first, second].map(
      ({
        value: parentValue,
        attribute,
      }) => ({
        value: parentValue,
        attribute,
      })
    );

  /*
   * 超过101生成熔体。
   */
  if (
    value >
    MAX_NORMAL_VALUE
  ) {
    return createXCard(
      value,
      parents,
      parentSnapshot
    );
  }

  /*
   * 普通结果。
   */
  return createNormalCard(
    value,

    ADDITION_ATTRIBUTE[
      first.attribute
    ][
      second.attribute
    ],

    parents,
    parentSnapshot
  );
}


/*
 * ============================================================
 * 将相加结果加入棋盘
 * ============================================================
 *
 * 父母不消失。
 * 新卡进入第一个空格。
 * ============================================================
 */

export function addNormalToBoard(
  board,
  firstIndex,
  secondIndex,
  usedPairs
) {
  const first =
    board[firstIndex];

  const second =
    board[secondIndex];

  const targetIndex =
    board.findIndex(
      (card) =>
        card === null
    );

  /*
   * 没空格或不允许相加。
   */
  if (
    targetIndex === -1 ||
    !canAdd(
      first,
      second,
      usedPairs
    )
  ) {
    return null;
  }

  const result =
    addNormalCards(
      first,
      second
    );

  const nextBoard =
    [...board];

  nextBoard[
    targetIndex
  ] = result;

  return {
    board:
      nextBoard,

    result,

    targetIndex,

    usedPairs:
      new Set(
        usedPairs
      ).add(
        pairKey(
          first,
          second
        )
      ),
  };
}


/*
 * ============================================================
 * 最大公约数
 * ============================================================
 */

export function gcd(
  a,
  b
) {
  let x =
    Math.abs(a);

  let y =
    Math.abs(b);

  while (y) {
    [
      x,
      y,
    ] = [
      y,
      x % y,
    ];
  }

  return x;
}


/*
 * ============================================================
 * 两张普通卡处理
 * ============================================================
 *
 * gcd > 1 才可以处理。
 *
 * 两张卡同时除以 gcd。
 *
 * 如果结果为1：
 * 卡片从棋盘消失。
 *
 * 收藏规则：
 *
 * 1. 如果原始两个数字不同：
 *    哪张变成1，就收藏哪张处理前的卡。
 *
 * 2. 如果原始两个数字完全相同：
 *    两张仍然正常变成1并消失，
 *    但不产生任何收藏。
 *
 * 例如：
 *
 * 15 ↔ 5
 * gcd = 5
 * → 3 / 1
 * → 收藏5
 *
 * 15 ↔ 15
 * gcd = 15
 * → 1 / 1
 * → 两张消失
 * → 不收藏
 * ============================================================
 */

export function processCards(
  a,
  b
) {
  if (
    !a ||
    !b ||
    a.id === b.id ||
    a.kind !== 'normal' ||
    b.kind !== 'normal'
  ) {
    return null;
  }

  const divisor =
    gcd(
      a.value,
      b.value
    );

  if (
    divisor <= 1
  ) {
    return null;
  }


  const firstValue =
    a.value /
    divisor;

  const secondValue =
    b.value /
    divisor;


  /*
   * 关键新规则：
   *
   * 处理前数字完全相同，
   * 则此次处理不产生收藏。
   */
  const sameValue =
    a.value ===
    b.value;


  const firstResult =
    firstValue === 1
      ? null
      : {
          ...a,
          value:
            firstValue,
        };


  const secondResult =
    secondValue === 1
      ? null
      : {
          ...b,
          value:
            secondValue,
        };


  /*
   * 同数：
   * 双消，但没有收藏。
   */
  if (
    sameValue
  ) {
    return {
      first:
        firstResult,

      second:
        secondResult,

      collections: [],
    };
  }


  /*
   * 不同数字：
   * 保持原收藏规则。
   */
  const collections =
    [
      firstValue === 1
        ? a
        : null,

      secondValue === 1
        ? b
        : null,
    ].filter(Boolean);


  return {
    first:
      firstResult,

    second:
      secondResult,

    collections,
  };
}


/*
 * ============================================================
 * X 是否可以吸收普通卡
 * ============================================================
 *
 * 同一个具体 X：
 * 同一数字一生只能吸收一次。
 *
 * 属性不影响这个限制。
 * ============================================================
 */

export function canAbsorb(
  x,
  normal
) {
  return Boolean(
    x &&
    normal &&
    x.kind === 'x' &&
    normal.kind === 'normal' &&
    !x.absorbedValues.includes(
      normal.value
    )
  );
}


/*
 * ============================================================
 * X 吸收
 * ============================================================
 *
 * X + 普通卡：
 * 普通卡保留。
 *
 * 如果结果 <= 201：
 * X 数字增加。
 *
 * 如果结果 > 201：
 * -200，
 * X 转回普通卡，
 * 属性继承被吸收卡。
 * ============================================================
 */

export function absorb(
  x,
  normal
) {
  const value =
    x.value +
    normal.value;


  /*
   * 超过201，
   * X 回到普通状态。
   */
  if (
    value >
    X_WRAP_THRESHOLD
  ) {
    return createNormalCard(
      value -
        X_WRAP_AMOUNT,

      normal.attribute,

      [
        x.id,
        normal.id,
      ],

      x.parentSnapshot
    );
  }


  /*
   * X继续存在。
   */
  return {
    ...x,

    value,

    absorbedValues: [
      ...x.absorbedValues,
      normal.value,
    ],
  };
}


/*
 * ============================================================
 * 收藏结算
 * ============================================================
 *
 * 首次：
 * 同数字已有属性数量：
 *
 * 0个 → +5 Life
 * 1个 → +4
 * 2个 → +3
 * 3个 → +2
 *
 * 分数 += 数字。
 *
 * 重复：
 * -10 Life
 * 0 Score
 * ============================================================
 */

export function settleCollection(
  collection,
  life,
  score,
  card
) {
  const key =
    `${card.attribute}` +
    `${card.value}`;


  /*
   * 完全重复。
   */
  if (
    collection.has(
      key
    )
  ) {
    return {
      collection,

      life:
        life - 10,

      score,

      isNew:
        false,
    };
  }


  /*
   * 已经拥有该数字的几个其他属性。
   */
  const attributesOwned =
    [
      'A',
      'B',
      'C',
      'D',
    ].filter(
      (attribute) =>
        collection.has(
          `${attribute}${card.value}`
        )
    ).length;


  const next =
    new Set(
      collection
    );


  next.add(
    key
  );


  return {
    collection:
      next,

    life:
      life +
      (
        5 -
        attributesOwned
      ),

    score:
      score +
      card.value,

    isNew:
      true,
  };
}