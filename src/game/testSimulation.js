import { ATTRIBUTE_NAMES } from './constants.js';
import { createInitialState } from './state.js';
import {
  absorb,
  addNormalToBoard,
  canAbsorb,
  canAdd,
  gcd,
  processCards,
  settleCollection,
} from './rules.js';


/*
 * ============================================================
 * 基础工具
 * ============================================================
 */

function replaceTwo(
  board,
  i,
  first,
  j,
  second
) {
  return board.map((card, index) => {
    if (index === i) return first;
    if (index === j) return second;
    return card;
  });
}


function cardLabel(card) {
  if (!card) {
    return '空';
  }

  if (card.kind === 'x') {
    return `熔体${card.value}`;
  }

  return (
    `${ATTRIBUTE_NAMES[card.attribute]}` +
    `${card.value}`
  );
}


function boardSum(board) {
  return board.reduce(
    (sum, card) =>
      sum + (card?.value ?? 0),
    0
  );
}


function boardMax(board) {
  return board.reduce(
    (max, card) =>
      Math.max(
        max,
        card?.value ?? 0
      ),
    0
  );
}


function occupiedCount(board) {
  return board.filter(Boolean).length;
}


function emptyCount(board) {
  return board.filter(
    (card) => card === null
  ).length;
}


function collectionKey(card) {
  return `${card.attribute}${card.value}`;
}


/*
 * ============================================================
 * 合法动作
 * ============================================================
 */

export function getLegalTestActions(state) {
  const actions = [];

  const {
    board,
    usedPairs,
  } = state;

  const hasEmpty =
    board.some(
      (card) => card === null
    );

  for (
    let i = 0;
    i < board.length;
    i += 1
  ) {
    const first =
      board[i];

    if (!first) {
      continue;
    }

    for (
      let j = 0;
      j < board.length;
      j += 1
    ) {
      if (i === j) {
        continue;
      }

      const second =
        board[j];

      if (!second) {
        continue;
      }


      /*
       * 相加有方向。
       */
      if (
        hasEmpty &&
        first.kind === 'normal' &&
        second.kind === 'normal' &&
        canAdd(
          first,
          second,
          usedPairs
        )
      ) {
        actions.push({
          type: 'add',
          firstIndex: i,
          secondIndex: j,
        });
      }


      /*
       * X 吸收有方向。
       */
      if (
        canAbsorb(
          first,
          second
        )
      ) {
        actions.push({
          type: 'absorb',
          firstIndex: i,
          secondIndex: j,
        });
      }


      /*
       * GCD 处理无方向区别。
       */
      if (
        i < j &&
        first.kind === 'normal' &&
        second.kind === 'normal' &&
        gcd(
          first.value,
          second.value
        ) > 1
      ) {
        actions.push({
          type: 'process',
          firstIndex: i,
          secondIndex: j,
        });
      }
    }
  }

  return actions;
}


/*
 * ============================================================
 * 权威动作模拟
 * ============================================================
 */

function applyAction(
  state,
  action,
  stats = null,
  recordStats = false
) {
  const first =
    state.board[
      action.firstIndex
    ];

  const second =
    state.board[
      action.secondIndex
    ];

  if (!first || !second) {
    return null;
  }


  /*
   * ------------------------------------------------
   * 相加
   * ------------------------------------------------
   */

  if (action.type === 'add') {
    const outcome =
      addNormalToBoard(
        state.board,
        action.firstIndex,
        action.secondIndex,
        state.usedPairs
      );

    if (!outcome) {
      return null;
    }

    const next = {
      ...state,

      board:
        outcome.board,

      usedPairs:
        outcome.usedPairs,

      steps:
        state.steps + 1,
    };

    if (
      recordStats &&
      stats
    ) {
      stats.combine += 1;

      if (
        outcome.result.kind === 'x'
      ) {
        stats.xCreated += 1;
      }

      stats.history.push(
        `Step ${next.steps} 相加 ` +
        `${cardLabel(first)} + ` +
        `${cardLabel(second)} → ` +
        `${cardLabel(outcome.result)}`
      );
    }

    return {
      state: next,
      newCollections: 0,
      duplicateCollections: 0,
      freedCells: 0,
    };
  }


  /*
   * ------------------------------------------------
   * 处理
   * ------------------------------------------------
   */

  if (
    action.type === 'process'
  ) {
    const result =
      processCards(
        first,
        second
      );

    if (!result) {
      return null;
    }

    let life =
      state.life;

    let score =
      state.score;

    let collection =
      state.collection;

    let newCollections = 0;
    let duplicateCollections = 0;

    const collectionTexts = [];

    for (
      const card
      of result.collections
    ) {
      const settled =
        settleCollection(
          collection,
          life,
          score,
          card
        );

      collection =
        settled.collection;

      life =
        settled.life;

      score =
        settled.score;

      if (
        settled.isNew
      ) {
        newCollections += 1;

        collectionTexts.push(
          `${cardLabel(card)} NEW`
        );
      } else {
        duplicateCollections += 1;

        collectionTexts.push(
          `${cardLabel(card)} DUP`
        );
      }
    }


    const beforeOccupied =
      occupiedCount(
        state.board
      );


    const nextBoard =
      replaceTwo(
        state.board,
        action.firstIndex,
        result.first,
        action.secondIndex,
        result.second
      );


    const afterOccupied =
      occupiedCount(
        nextBoard
      );


    const freedCells =
      beforeOccupied -
      afterOccupied;


    const next = {
      ...state,

      board:
        nextBoard,

      life,

      score,

      collection,

      steps:
        state.steps + 1,
    };


    if (
      recordStats &&
      stats
    ) {
      stats.process += 1;

      stats.newCollections +=
        newCollections;

      stats.duplicates +=
        duplicateCollections;


      const afterFirst =
        result.first
          ? cardLabel(
              result.first
            )
          : '消失';


      const afterSecond =
        result.second
          ? cardLabel(
              result.second
            )
          : '消失';


      let text =
        `Step ${next.steps} 处理 ` +
        `${cardLabel(first)} ↔ ` +
        `${cardLabel(second)} → ` +
        `${afterFirst} / ` +
        `${afterSecond}`;


      if (
        collectionTexts.length
      ) {
        text +=
          ` 收藏: ` +
          collectionTexts.join(
            '、'
          );
      }


      stats.history.push(
        text
      );
    }


    return {
      state: next,
      newCollections,
      duplicateCollections,
      freedCells,
    };
  }


  /*
   * ------------------------------------------------
   * X 吸收
   * ------------------------------------------------
   */

  if (
    action.type === 'absorb'
  ) {
    if (
      !canAbsorb(
        first,
        second
      )
    ) {
      return null;
    }


    const result =
      absorb(
        first,
        second
      );


    const next = {
      ...state,

      board:
        replaceTwo(
          state.board,
          action.firstIndex,
          result,
          action.secondIndex,
          second
        ),

      steps:
        state.steps + 1,
    };


    if (
      recordStats &&
      stats
    ) {
      stats.absorb += 1;

      stats.history.push(
        `Step ${next.steps} 吸收 ` +
        `${cardLabel(first)} ← ` +
        `${cardLabel(second)} → ` +
        `${cardLabel(result)}`
      );
    }


    return {
      state: next,
      newCollections: 0,
      duplicateCollections: 0,
      freedCells: 0,
    };
  }


  return null;
}


/*
 * ============================================================
 * Collection AI V3
 *
 * Depth 3
 * Beam 10
 * Action Limit 12
 *
 * 核心：
 *
 * 不仅看已有收藏，
 * 还理解“倍数收割关系”。
 * ============================================================
 */

const COLLECTION_SEARCH_DEPTH = 3;
const COLLECTION_BEAM_WIDTH = 10;
const COLLECTION_ACTION_LIMIT = 12;


/*
 * ============================================================
 * 盘面结构分析
 * ============================================================
 *
 * 一次扫描直接得到 AI 所需的大部分指标。
 *
 * 避免像 D4 一样在评价函数里
 * 多次重复枚举全部合法动作。
 * ============================================================
 */

function analyzeBoard(state) {
  const board =
    state.board;

  let processPairs = 0;

  let harvestPairs = 0;

  let newHarvests = 0;

  let duplicateHarvests = 0;

  let normalCount = 0;

  let xCount = 0;


  const values =
    new Set();


  for (
    const card
    of board
  ) {
    if (!card) {
      continue;
    }

    values.add(
      card.value
    );

    if (
      card.kind === 'normal'
    ) {
      normalCount += 1;
    } else {
      xCount += 1;
    }
  }


  /*
   * ----------------------------------------------
   * 分析所有普通卡关系
   * ----------------------------------------------
   */

  for (
    let i = 0;
    i < board.length;
    i += 1
  ) {
    const first =
      board[i];

    if (
      !first ||
      first.kind !== 'normal'
    ) {
      continue;
    }


    for (
      let j = i + 1;
      j < board.length;
      j += 1
    ) {
      const second =
        board[j];


      if (
        !second ||
        second.kind !== 'normal'
      ) {
        continue;
      }


      const divisor =
        gcd(
          first.value,
          second.value
        );


      if (
        divisor <= 1
      ) {
        continue;
      }


      processPairs += 1;


      /*
       * 如果除以 gcd 后为1，
       * 就会发生收藏。
       *
       * 本质上等价于：
       * 较小数整除较大数，
       * 或者两个数完全相同。
       */


      const firstHarvest =
        first.value /
        divisor === 1;


      const secondHarvest =
        second.value /
        divisor === 1;


      if (
        firstHarvest ||
        secondHarvest
      ) {
        harvestPairs += 1;
      }


      if (
        firstHarvest
      ) {
        if (
          state.collection.has(
            collectionKey(
              first
            )
          )
        ) {
          duplicateHarvests += 1;
        } else {
          newHarvests += 1;
        }
      }


      if (
        secondHarvest
      ) {
        if (
          state.collection.has(
            collectionKey(
              second
            )
          )
        ) {
          duplicateHarvests += 1;
        } else {
          newHarvests += 1;
        }
      }
    }
  }


  return {
    occupied:
      occupiedCount(
        board
      ),

    empty:
      emptyCount(
        board
      ),

    sum:
      boardSum(
        board
      ),

    distinctValues:
      values.size,

    processPairs,

    harvestPairs,

    newHarvests,

    duplicateHarvests,

    normalCount,

    xCount,
  };
}


/*
 * ============================================================
 * 合法动作数量
 * ============================================================
 *
 * 这里单独统计一次。
 * ============================================================
 */

function countActionTypes(
  actions
) {
  let add = 0;
  let process = 0;
  let absorb = 0;


  for (
    const action
    of actions
  ) {
    if (
      action.type === 'add'
    ) {
      add += 1;
    } else if (
      action.type === 'process'
    ) {
      process += 1;
    } else if (
      action.type === 'absorb'
    ) {
      absorb += 1;
    }
  }


  return {
    add,
    process,
    absorb,
    total:
      actions.length,
  };
}


/*
 * ============================================================
 * 长期状态评价
 * ============================================================
 */

function evaluateCollectionState(
  state
) {
  if (
    state.collection.size >= 400
  ) {
    return 1000000000;
  }


  if (
    state.life <= 0
  ) {
    return -1000000000;
  }


  const actions =
    getLegalTestActions(
      state
    );


  if (
    actions.length === 0
  ) {
    return (
      state.collection.size *
        20000 -
      10000000
    );
  }


  const structure =
    analyzeBoard(
      state
    );


  const actionCounts =
    countActionTypes(
      actions
    );


  let value = 0;


  /*
   * ------------------------------------------------
   * 1. 已获得收藏
   * ------------------------------------------------
   *
   * 最终目标。
   */

  value +=
    state.collection.size *
    20000;


  /*
   * ------------------------------------------------
   * 2. NEW 收割关系
   * ------------------------------------------------
   *
   * 这是 V3 最重要的新指标。
   *
   * 说明当前盘面已经构造出了
   * 可以直接变成新收藏的数学关系。
   */

  value +=
    structure.newHarvests *
    3200;


  /*
   * ------------------------------------------------
   * 3. DUP 收割关系
   * ------------------------------------------------
   */

  value -=
    structure.duplicateHarvests *
    750;


  /*
   * ------------------------------------------------
   * 4. 普通 GCD 关系
   * ------------------------------------------------
   *
   * 没有直接收藏，
   * 但能改变数字结构。
   */

  value +=
    structure.processPairs *
    280;


  /*
   * ------------------------------------------------
   * 5. 合法动作空间
   * ------------------------------------------------
   */

  value +=
    Math.min(
      actionCounts.total,
      35
    ) *
    55;


  /*
   * 处理动作尤其重要。
   */

  value +=
    Math.min(
      actionCounts.process,
      12
    ) *
    130;


  /*
   * ------------------------------------------------
   * 6. 空格
   * ------------------------------------------------
   *
   * 不再认为空格越多越好。
   *
   * 目标大致是盘面保持
   * 6～8张卡。
   */

  if (
    structure.empty === 1
  ) {
    value += 1900;
  } else if (
    structure.empty === 2
  ) {
    value += 2200;
  } else if (
    structure.empty === 3
  ) {
    value += 1700;
  } else if (
    structure.empty === 0
  ) {
    /*
     * 满盘但仍有处理关系，
     * 并不是绝对坏事。
     */

    if (
      structure.processPairs > 0
    ) {
      value -= 700;
    } else {
      value -= 6000;
    }
  } else {
    /*
     * 空位太多意味着关系网络太稀疏。
     */

    value -=
      (
        structure.empty - 3
      ) *
      500;
  }


  /*
   * ------------------------------------------------
   * 7. 卡数量
   * ------------------------------------------------
   */

  if (
    structure.occupied >= 6 &&
    structure.occupied <= 8
  ) {
    value += 1200;
  }


  if (
    structure.occupied <= 3
  ) {
    value -= 2500;
  }


  /*
   * ------------------------------------------------
   * 8. 数字多样性
   * ------------------------------------------------
   */

  value +=
    structure.distinctValues *
    220;


  /*
   * ------------------------------------------------
   * 9. 数字成长
   * ------------------------------------------------
   *
   * 防止 വീണ്ടും出现 D2 的
   * “盘面总和28”问题。
   *
   * 但不鼓励无限追求大数字。
   */

  value +=
    Math.min(
      structure.sum,
      420
    ) *
    6;


  /*
   * ------------------------------------------------
   * 10. X
   * ------------------------------------------------
   *
   * X 本身不是目标。
   *
   * 但有少量价值，
   * 因为它提供不同的数字转换通道。
   */

  value +=
    structure.xCount *
    350;


  /*
   * ------------------------------------------------
   * 11. 生命
   * ------------------------------------------------
   */

  value +=
    state.life *
    65;


  /*
   * 生命进入危险区。
   */

  if (
    state.life < 40
  ) {
    value -=
      (40 - state.life) *
      500;
  }


  if (
    state.life < 20
  ) {
    value -=
      (20 - state.life) *
      1400;
  }


  return value;
}


/*
 * ============================================================
 * 动作快速评价
 * ============================================================
 *
 * 用来从大量动作里挑12个进入搜索。
 * ============================================================
 */

function quickActionScore(
  state,
  action
) {
  const outcome =
    applyAction(
      state,
      action,
      null,
      false
    );


  if (!outcome) {
    return -Infinity;
  }


  const next =
    outcome.state;


  if (
    next.life <= 0
  ) {
    return -1000000000;
  }


  const structure =
    analyzeBoard(
      next
    );


  let score = 0;


  /*
   * 当前直接获得 NEW。
   */

  score +=
    outcome.newCollections *
    4200;


  /*
   * 当前 DUP。
   */

  score -=
    outcome.duplicateCollections *
    3200;


  /*
   * 腾格。
   */

  score +=
    outcome.freedCells *
    1200;


  /*
   * 下一状态的 NEW 收割关系。
   */

  score +=
    structure.newHarvests *
    1000;


  /*
   * 普通处理关系。
   */

  score +=
    structure.processPairs *
    120;


  /*
   * 数字多样性。
   */

  score +=
    structure.distinctValues *
    80;


  /*
   * 保持合理盘面密度。
   */

  if (
    structure.occupied >= 6 &&
    structure.occupied <= 8
  ) {
    score += 600;
  }


  /*
   * 盘面太空。
   */

  if (
    structure.occupied <= 3
  ) {
    score -= 800;
  }


  /*
   * 满盘且无任何处理关系。
   */

  if (
    structure.empty === 0 &&
    structure.processPairs === 0
  ) {
    score -= 100000;
  }


  /*
   * 数字成长。
   */

  score +=
    Math.min(
      structure.sum,
      400
    ) *
    2;


  return score;
}


/*
 * ============================================================
 * 候选动作选择
 * ============================================================
 *
 * 不简单只拿总排名前12。
 *
 * 尽量让 add / process / absorb
 * 都保留一定候选，
 * 防止某一类动作被完全裁掉。
 * ============================================================
 */

function getCollectionCandidateActions(
  state
) {
  const actions =
    getLegalTestActions(
      state
    );


  if (
    actions.length <=
    COLLECTION_ACTION_LIMIT
  ) {
    return actions;
  }


  const scored =
    actions.map(
      (action) => ({
        action,

        score:
          quickActionScore(
            state,
            action
          ),
      })
    );


  const byType = {
    add: [],
    process: [],
    absorb: [],
  };


  for (
    const item
    of scored
  ) {
    byType[
      item.action.type
    ].push(
      item
    );
  }


  for (
    const key
    of Object.keys(
      byType
    )
  ) {
    byType[key].sort(
      (a, b) =>
        b.score -
        a.score
    );
  }


  /*
   * 先保证各类型一些名额。
   */

  const chosen = [];


  chosen.push(
    ...byType.process.slice(
      0,
      5
    )
  );


  chosen.push(
    ...byType.add.slice(
      0,
      5
    )
  );


  chosen.push(
    ...byType.absorb.slice(
      0,
      2
    )
  );


  /*
   * 去重复。
   */

  const unique =
    new Map();


  for (
    const item
    of chosen
  ) {
    const key =
      `${item.action.type}:` +
      `${item.action.firstIndex}:` +
      `${item.action.secondIndex}`;

    unique.set(
      key,
      item
    );
  }


  /*
   * 如果还不足12个，
   * 从全局高分动作补。
   */

  if (
    unique.size <
    COLLECTION_ACTION_LIMIT
  ) {
    scored
      .sort(
        (a, b) =>
          b.score -
          a.score
      );


    for (
      const item
      of scored
    ) {
      if (
        unique.size >=
        COLLECTION_ACTION_LIMIT
      ) {
        break;
      }


      const key =
        `${item.action.type}:` +
        `${item.action.firstIndex}:` +
        `${item.action.secondIndex}`;


      if (
        !unique.has(
          key
        )
      ) {
        unique.set(
          key,
          item
        );
      }
    }
  }


  return [
    ...unique.values(),
  ]
    .sort(
      (a, b) =>
        b.score -
        a.score
    )
    .slice(
      0,
      COLLECTION_ACTION_LIMIT
    )
    .map(
      (item) =>
        item.action
    );
}


/*
 * ============================================================
 * Collection Beam Search
 * ============================================================
 */

function chooseCollectionAction(
  state,
  random
) {
  const rootActions =
    getCollectionCandidateActions(
      state
    );


  if (
    !rootActions.length
  ) {
    return null;
  }


  let beam = [];


  /*
   * 第一层。
   */

  for (
    const action
    of rootActions
  ) {
    const outcome =
      applyAction(
        state,
        action,
        null,
        false
      );


    if (!outcome) {
      continue;
    }


    beam.push({
      state:
        outcome.state,

      firstAction:
        action,

      score:
        evaluateCollectionState(
          outcome.state
        ),
    });
  }


  if (
    !beam.length
  ) {
    return rootActions[
      Math.floor(
        random() *
        rootActions.length
      )
    ];
  }


  beam.sort(
    (a, b) =>
      b.score -
      a.score
  );


  beam =
    beam.slice(
      0,
      COLLECTION_BEAM_WIDTH
    );


  /*
   * 继续搜索到 Depth 3。
   */

  for (
    let depth = 1;
    depth <
    COLLECTION_SEARCH_DEPTH;
    depth += 1
  ) {
    const expanded = [];


    for (
      const node
      of beam
    ) {
      /*
       * 完成、死亡或死局：
       * 不继续展开。
       */

      if (
        node.state.collection.size >= 400 ||
        node.state.life <= 0
      ) {
        expanded.push(
          node
        );

        continue;
      }


      const actions =
        getCollectionCandidateActions(
          node.state
        );


      if (
        !actions.length
      ) {
        expanded.push(
          node
        );

        continue;
      }


      for (
        const action
        of actions
      ) {
        const outcome =
          applyAction(
            node.state,
            action,
            null,
            false
          );


        if (!outcome) {
          continue;
        }


        expanded.push({
          state:
            outcome.state,

          firstAction:
            node.firstAction,

          score:
            evaluateCollectionState(
              outcome.state
            ),
        });
      }
    }


    if (
      !expanded.length
    ) {
      break;
    }


    /*
     * 直接保留最高10个。
     *
     * V3 不再做复杂状态去重，
     * 避免隐藏父母/usedPairs
     * 被错误合并。
     */

    expanded.sort(
      (a, b) =>
        b.score -
        a.score
    );


    beam =
      expanded.slice(
        0,
        COLLECTION_BEAM_WIDTH
      );
  }


  if (
    !beam.length
  ) {
    return rootActions[
      Math.floor(
        random() *
        rootActions.length
      )
    ];
  }


  beam.sort(
    (a, b) =>
      b.score -
      a.score
  );


  const bestScore =
    beam[0].score;


  const bestNodes =
    beam.filter(
      (node) =>
        node.score ===
        bestScore
    );


  return bestNodes[
    Math.floor(
      random() *
      bestNodes.length
    )
  ].firstAction;
}


/*
 * ============================================================
 * Random AI
 * ============================================================
 */

function chooseRandomAction(
  state,
  random
) {
  const actions =
    getLegalTestActions(
      state
    );


  if (
    !actions.length
  ) {
    return null;
  }


  return actions[
    Math.floor(
      random() *
      actions.length
    )
  ];
}


/*
 * ============================================================
 * 单局测试
 * ============================================================
 */

export function runTestGame({
  maxSteps = 1000,
  random = Math.random,
  mode = 'random',
} = {}) {
  let state =
    createInitialState(
      random
    );


  const stats = {
    combine: 0,

    process: 0,

    absorb: 0,

    xCreated: 0,

    newCollections: 0,

    duplicates: 0,

    boardSumTotal: 0,

    boardSumSamples: 0,

    maxNumberSeen:
      boardMax(
        state.board
      ),

    history: [],
  };


  while (
    state.life > 0 &&
    state.collection.size < 400 &&
    state.steps < maxSteps
  ) {
    let action;


    if (
      mode === 'collection'
    ) {
      action =
        chooseCollectionAction(
          state,
          random
        );
    } else {
      action =
        chooseRandomAction(
          state,
          random
        );
    }


    if (!action) {
      break;
    }


    const outcome =
      applyAction(
        state,
        action,
        stats,
        true
      );


    if (!outcome) {
      break;
    }


    state =
      outcome.state;


    const currentBoardSum =
      boardSum(
        state.board
      );


    stats.boardSumTotal +=
      currentBoardSum;


    stats.boardSumSamples +=
      1;


    stats.maxNumberSeen =
      Math.max(
        stats.maxNumberSeen,
        boardMax(
          state.board
        )
      );
  }


  /*
   * ==========================================================
   * 结束原因
   * ==========================================================
   */

  const legalAtEnd =
    getLegalTestActions(
      state
    );


  let endReason =
    '无合法动作';


  if (
    state.collection.size >= 400
  ) {
    endReason =
      '完成400';
  } else if (
    state.life <= 0
  ) {
    endReason =
      '生命归零';
  } else if (
    state.steps >= maxSteps
  ) {
    endReason =
      '步数上限';
  } else if (
    legalAtEnd.length === 0
  ) {
    endReason =
      '无合法动作';
  }


  const finalBoardSum =
    boardSum(
      state.board
    );


  const occupied =
    occupiedCount(
      state.board
    );


  return {
    mode,

    steps:
      state.steps,

    collection:
      state.collection.size,

    score:
      state.score,

    life:
      state.life,

    newCollections:
      stats.newCollections,

    duplicates:
      stats.duplicates,

    combine:
      stats.combine,

    process:
      stats.process,

    absorb:
      stats.absorb,

    xCreated:
      stats.xCreated,

    finalBoardSum,

    finalBoardAverage:
      occupied > 0
        ? finalBoardSum /
          occupied
        : 0,

    averageBoardSum:
      stats.boardSumSamples > 0
        ? stats.boardSumTotal /
          stats.boardSumSamples
        : finalBoardSum,

    maxNumberSeen:
      stats.maxNumberSeen,

    endReason,

    history:
      stats.history,
  };
}


/*
 * ============================================================
 * 兼容旧调用
 * ============================================================
 */

export function runRandomTestGame(
  options = {}
) {
  return runTestGame({
    ...options,
    mode: 'random',
  });
}


/*
 * ============================================================
 * 汇总
 * ============================================================
 */

function average(
  results,
  field
) {
  if (
    !results.length
  ) {
    return 0;
  }


  return (
    results.reduce(
      (sum, result) =>
        sum +
        result[field],
      0
    ) /
    results.length
  );
}


export function summarizeTestResults(
  results
) {
  const totalCollectionEvents =
    results.reduce(
      (sum, result) =>
        sum +
        result.newCollections +
        result.duplicates,
      0
    );


  const totalDuplicates =
    results.reduce(
      (sum, result) =>
        sum +
        result.duplicates,
      0
    );


  const endReasons = {};


  for (
    const result
    of results
  ) {
    endReasons[
      result.endReason
    ] =
      (
        endReasons[
          result.endReason
        ] ?? 0
      ) + 1;
  }


  return {
    games:
      results.length,

    averageSteps:
      average(
        results,
        'steps'
      ),

    averageCollection:
      average(
        results,
        'collection'
      ),

    averageScore:
      average(
        results,
        'score'
      ),

    averageLife:
      average(
        results,
        'life'
      ),

    averageNew:
      average(
        results,
        'newCollections'
      ),

    averageDuplicates:
      average(
        results,
        'duplicates'
      ),

    duplicateRate:
      totalCollectionEvents > 0
        ? (
            totalDuplicates /
            totalCollectionEvents
          ) *
          100
        : 0,

    averageCombine:
      average(
        results,
        'combine'
      ),

    averageProcess:
      average(
        results,
        'process'
      ),

    averageAbsorb:
      average(
        results,
        'absorb'
      ),

    averageXCreated:
      average(
        results,
        'xCreated'
      ),

    averageFinalBoardSum:
      average(
        results,
        'finalBoardSum'
      ),

    averageBoardSum:
      average(
        results,
        'averageBoardSum'
      ),

    maxNumberSeen:
      results.length
        ? Math.max(
            ...results.map(
              (result) =>
                result.maxNumberSeen
            )
          )
        : 0,

    completed:
      endReasons[
        '完成400'
      ] ?? 0,

    deaths:
      endReasons[
        '生命归零'
      ] ?? 0,

    deadBoards:
      endReasons[
        '无合法动作'
      ] ?? 0,

    stepLimits:
      endReasons[
        '步数上限'
      ] ?? 0,
  };
}


/*
 * ============================================================
 * 排名
 * ============================================================
 */

export function rankTestResults(
  results
) {
  const ranked =
    results
      .map(
        (
          result,
          index
        ) => ({
          ...result,

          gameNumber:
            index + 1,
        })
      )
      .sort(
        (a, b) => {
          if (
            b.collection !==
            a.collection
          ) {
            return (
              b.collection -
              a.collection
            );
          }


          if (
            b.score !==
            a.score
          ) {
            return (
              b.score -
              a.score
            );
          }


          return (
            a.steps -
            b.steps
          );
        }
      );


  return {
    best:
      ranked.slice(
        0,
        10
      ),

    worst:
      [...ranked]
        .reverse()
        .slice(
          0,
          10
        ),
  };
}