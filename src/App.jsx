import { useEffect, useMemo, useRef, useState } from 'react';
import ActionPanel from './components/ActionPanel.jsx';
import ActionOpportunities from './components/ActionOpportunities.jsx';
import Board from './components/Board.jsx';
import CollectionPanel from './components/CollectionPanel.jsx';
import CombineHistoryPanel from './components/CombineHistoryPanel.jsx';
import Hud from './components/Hud.jsx';
import TestLab from './components/TestLab.jsx';
import { ATTRIBUTE_NAMES, getMaterialResult } from './game/constants.js';
import { createInitialState } from './game/state.js';
import {
  absorb,
  addNormalToBoard,
  canAbsorb,
  canAdd,
  gcd,
  getProcessLegality,
  processCards,
  settleCollection,
} from './game/rules.js';
import { getNextSelection } from './game/selection.js';
import { createCombineHistoryRecord } from './game/combineHistory.js';
import { getBoardActionOpportunities } from './game/actionOpportunities.js';

const replaceTwo = (board, i, first, j, second) =>
  board.map((card, index) =>
    index === i ? first : index === j ? second : card
  );

const CELL_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

export default function App() {
  const [game, setGame] = useState(() => createInitialState());
  const [hasStarted, setHasStarted] = useState(false);
  const [animation, setAnimation] = useState(null);

  const [showCollection, setShowCollection] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTestLab, setShowTestLab] = useState(false);

  const timers = useRef([]);

  const selectedCards = game.selected
    .map((index) => game.board[index])
    .filter(Boolean);

  const orderedSelectedIndexes = useMemo(
    () => [...game.selected].sort((a, b) => a - b),
    [game.selected]
  );
  const orderedSelectedCards = useMemo(
    () => orderedSelectedIndexes
      .map((index) => game.board[index])
      .filter(Boolean),
    [game.board, orderedSelectedIndexes]
  );

  const actionOpportunities = useMemo(
    () => getBoardActionOpportunities(game.board, game),
    [game.board, game.collection, game.usedPairs]
  );

  const later = (callback, delay) => {
    timers.current.push(
      window.setTimeout(callback, delay)
    );
  };

  const clearTimers = () => {
    timers.current.forEach(
      window.clearTimeout
    );

    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const candidates = useMemo(() => {
    const result = {};

    if (
      game.selected.length !== 1 ||
      animation
    ) {
      return result;
    }

    const first =
      game.board[game.selected[0]];

    game.board.forEach(
      (card, index) => {
        if (
          !card ||
          index === game.selected[0]
        ) {
          return;
        }

        const processResult =
          processCards(
            first,
            card,
            game.collection
          );

        result[index] = {
          add:
            game.board.some(
              (slot) => slot === null
            ) &&
            canAdd(
              first,
              card,
              game.usedPairs
            ),

          process:
            Boolean(
              processResult
            ),

          collect:
            Boolean(
              processResult
                ?.collections
                ?.length
            ),

          absorb:
            canAbsorb(
              first,
              card
            ),
        };
      }
    );

    return result;
  }, [
    animation,
    game.board,
    game.selected,
    game.usedPairs,
  ]);

  const preview = useMemo(() => {
    if (
      selectedCards.length !== 2
    ) {
      return null;
    }

    const [first, second] = orderedSelectedCards;
    const [firstIndex, secondIndex] = orderedSelectedIndexes;
    const [absorbFirst, absorbSecond] = selectedCards;

    const output = {};

    if (
      game.board.some(
        (slot) => slot === null
      ) &&
      canAdd(
        first,
        second,
        game.usedPairs
      )
    ) {
      const value =
        first.value +
        second.value;

      const positionLabel =
        `${CELL_NUMBERS[firstIndex]} ${ATTRIBUTE_NAMES[first.attribute]}` +
        ` + ${CELL_NUMBERS[secondIndex]} ${ATTRIBUTE_NAMES[second.attribute]}`;

      output.add = value > 101
        ? `${positionLabel} → 琉璃 ${value}`
        : `${positionLabel} → ${ATTRIBUTE_NAMES[getMaterialResult(first.attribute, second.attribute)]} ${value}`;
    }

    const processLegality = getProcessLegality(first, second, game.collection);
    const divisor = processLegality.allowed
      ? gcd(first.value, second.value)
      : 1;

    if (
      divisor > 1
    ) {
      output.process =
        `处理 → ` +
        `${ATTRIBUTE_NAMES[first.attribute]}` +
        `${first.value / divisor}` +
        ` / ` +
        `${ATTRIBUTE_NAMES[second.attribute]}` +
        `${second.value / divisor}`;
    }

    if (!processLegality.allowed && processLegality.reason.startsWith('⚠')) {
      output.warning = processLegality.reason;
    }

    if (
      canAbsorb(
        absorbFirst,
        absorbSecond
      )
    ) {
      output.absorb =
        absorbFirst.value +
          absorbSecond.value >
        201
          ? `吸收 → ${
              ATTRIBUTE_NAMES[absorbSecond.attribute]
            }${
              absorbFirst.value +
              absorbSecond.value -
              200
            }`
          : `吸收 → 琉璃 ${
              absorbFirst.value +
              absorbSecond.value
            }`;
    }

    return output;
  }, [
    game.board,
    game.collection,
    game.usedPairs,
    orderedSelectedCards,
    orderedSelectedIndexes,
  ]);

  const boardPreview = useMemo(() => {
    if (
      selectedCards.length !== 2 ||
      !preview?.add
    ) {
      return null;
    }

    const [first, second] = orderedSelectedCards;

    const value =
      first.value +
      second.value;

    return {
      targetIndex:
        game.board.findIndex(
          (card) =>
            card === null
        ),

      card:
        value > 101
          ? {
              kind: 'x',
              attribute: 'X',
              value,
              parentSnapshot: [
                first,
                second,
              ],
            }
          : {
              kind: 'normal',

              attribute:
                getMaterialResult(
                  first.attribute,
                  second.attribute
                ),

              value,

              parentSnapshot: [
                first,
                second,
              ],
            },
    };
  }, [
    game.board,
    preview,
    orderedSelectedCards,
  ]);

  function select(index) {
    if (
      animation ||
      !game.board[index]
    ) {
      return;
    }

    setGame((current) => ({
      ...current,

      selected:
        getNextSelection(
          current.selected,
          index
        ),
    }));
  }

  function runAdd() {
    if (
      animation ||
      game.selected.length !== 2
    ) {
      return;
    }

    const outcome =
      addNormalToBoard(
        game.board,
        game.selected[0],
        game.selected[1],
        game.usedPairs
      );

    if (!outcome) {
      return setGame(
        (current) => ({
          ...current,

          message:
            game.board.every(Boolean)
              ? '棋盘已满，无法生成新卡。'
              : '这两张卡不能相加。',
        })
      );
    }

    clearTimers();

    const historyRecord =
      createCombineHistoryRecord(
        orderedSelectedCards[0],
        orderedSelectedCards[1],
        outcome.result,
        game.steps + 1
      );

    setAnimation({
      type: 'add',
      phase: 'source',
      indexes: [
        ...game.selected,
      ],
      targetIndex:
        outcome.targetIndex,
    });

    later(() => {
      setGame((current) => ({
        ...current,

        board:
          outcome.board,

        selected: [],

        usedPairs:
          outcome.usedPairs,

        combineHistory: [
          ...current.combineHistory,
          historyRecord,
        ],

        steps:
          current.steps + 1,

        message:
          `生成 ` +
          `${ATTRIBUTE_NAMES[outcome.result.attribute]}` +
          `${outcome.result.value}`,
      }));

      setAnimation({
        type: 'add',
        phase: 'created',
        indexes: [
          ...game.selected,
        ],
        targetIndex:
          outcome.targetIndex,
      });
    }, 140);

    later(() => {
      setAnimation(null);
    }, 560);
  }

  function runProcess() {
    if (
      animation ||
      game.selected.length !== 2
    ) {
      return;
    }

    if (
      canAbsorb(
        selectedCards[0],
        selectedCards[1]
      )
    ) {
      return runAbsorb();
    }

    const legality = getProcessLegality(
      selectedCards[0],
      selectedCards[1],
      game.collection
    );

    const result =
      processCards(
        selectedCards[0],
        selectedCards[1],
        game.collection
      );

    if (!result) {
      return setGame(
        (current) => ({
          ...current,

          message:
            legality.reason,
        })
      );
    }

    const indexes = [
      ...game.selected,
    ];

    const exiting = [
      !result.first
        ? indexes[0]
        : null,

      !result.second
        ? indexes[1]
        : null,
    ].filter(
      (x) => x !== null
    );

    clearTimers();

    setAnimation({
      type: 'process',
      phase: 'compress',
      indexes,
      exiting: [],
    });

    later(() => {
      setAnimation({
        type: 'process',

        phase:
          exiting.length
            ? 'exit'
            : 'settle',

        indexes,
        exiting,
      });
    }, 150);

    const commitDelay =
      exiting.length
        ? 570
        : 150;

    later(() => {
      setGame((current) => {
        let { score, collection } = current;

        result.collections.forEach(
          (card) => {
            const settled = settleCollection(
              collection,
              current.life,
              score,
              card
            );
            score = settled.score;
            collection = settled.collection;
          }
        );

        return {
          ...current,

          board:
            replaceTwo(
              current.board,
              indexes[0],
              result.first,
              indexes[1],
              result.second
            ),

          selected: [],

          score,
          collection,

          steps:
            current.steps + 1,

          message:
            result.collections.length
              ? `收藏 ${
                  result.collections
                    .map(
                      (card) =>
                        `${ATTRIBUTE_NAMES[card.attribute]}${card.value}`
                    )
                    .join('、')
                }`
              : '处理完成',
        };
      });

      if (
        !exiting.length
      ) {
        setAnimation({
          type: 'process',
          phase: 'settle',
          indexes,
          exiting: [],
        });
      }
    }, commitDelay);

    later(() => {
      setAnimation(null);
    }, exiting.length
      ? 590
      : 450);
  }

  function runAbsorb() {
    if (
      animation ||
      game.selected.length !== 2 ||
      !canAbsorb(
        selectedCards[0],
        selectedCards[1]
      )
    ) {
      return;
    }

    const indexes = [
      ...game.selected,
    ];

    const result =
      absorb(
        selectedCards[0],
        selectedCards[1]
      );

    clearTimers();

    setAnimation({
      type: 'absorb',
      phase: 'compress',
      indexes,
      targetIndex:
        indexes[0],
    });

    later(() => {
      setGame((current) => ({
        ...current,

        board:
          replaceTwo(
            current.board,
            indexes[0],
            result,
            indexes[1],
            selectedCards[1]
          ),

        selected: [],

        steps:
          current.steps + 1,

        message:
          result.kind === 'x'
            ? `琉璃变为 琉璃${result.value}`
            : `琉璃循环为 ${
                ATTRIBUTE_NAMES[result.attribute]
              }${result.value}`,
      }));

      setAnimation({
        type: 'absorb',
        phase: 'settle',
        indexes,
        targetIndex:
          indexes[0],
      });
    }, 140);

    later(() => {
      setAnimation(null);
    }, 460);
  }

  function restartGame() {
    clearTimers();
    setAnimation(null);
    setGame(
      createInitialState()
    );
  }

  function startGame() {
    restartGame();
    setHasStarted(true);
  }

  if (!hasStarted) {
    return (
      <div className="start-page">
        <div className="start-page-accent" aria-hidden="true" />

        <main className="start-panel">
          <p className="start-subtitle">CRYSTAL PALACE</p>
          <h1>炼晶新宫</h1>
          <button className="start-button" onClick={startGame}>
            开始游戏
          </button>
          <button
            className="start-test-lab"
            onClick={() => setShowTestLab(true)}
          >
            TestLab
          </button>
        </main>

        {showTestLab && (
          <TestLab onClose={() => setShowTestLab(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="game-page">
      <main className="game-shell">
        <header className="game-header">
          <div>
            <div className="game-header-kicker">
              CRYSTAL PALACE
            </div>

            <h1>
              炼晶新宫
            </h1>
          </div>

          <div className="header-actions">
            <button
              className="history-trigger"
              onClick={() =>
                setShowHistory(true)
              }
            >
              合成历史

              <span>
                {game.combineHistory.length}
              </span>
            </button>

            <button
              className="collection-trigger"
              onClick={() =>
                setShowCollection(true)
              }
            >
              收藏册
            </button>
          </div>
        </header>

        <Hud
          game={game}
        />

        <ActionOpportunities opportunities={actionOpportunities} />

        <section className="game-info-row">
          <ActionPanel
            selectedCards={
              selectedCards
            }
            preview={preview}
            message={
              game.message
            }
            collection={game.collection}
          />
        </section>

        <section className="game-board-section">
          <div className="game-board">
            <Board
              board={
                game.board
              }
              selected={
                game.selected
              }
              candidates={
                candidates
              }
              preview={
                boardPreview
              }
              animation={
                animation
              }
              collection={
                game.collection
              }
              onSelect={
                select
              }
              onAdd={
                runAdd
              }
              disabled={
                Boolean(
                  animation
                )
              }
            />

            <div className="game-board-actions">
              <button
                className={
                  `action-button ` +
                  `action-button--add ` +
                  `${
                    preview?.add
                      ? 'is-active'
                      : ''
                  }`
                }
                disabled={
                  !preview?.add ||
                  Boolean(
                    animation
                  )
                }
                onClick={
                  runAdd
                }
              >
                <span>
                  ＋
                </span>

                相加
              </button>

              <button
                className={
                  `action-button ` +
                  `action-button--process ` +
                  `${
                    preview?.process ||
                    preview?.absorb
                      ? 'is-active'
                      : ''
                  }`
                }
                disabled={
                  (!preview?.process &&
                    !preview?.absorb) ||
                  Boolean(
                    animation
                  )
                }
                onClick={
                  runProcess
                }
              >
                <span>
                  ÷
                </span>

                处理
              </button>

            </div>
          </div>
        </section>

        <button
          className="restart-button"
          onClick={
            restartGame
          }
        >
          重新开始
        </button>
      </main>

      {showHistory && (
        <CombineHistoryPanel
          history={
            game.combineHistory
          }
          onClose={() =>
            setShowHistory(
              false
            )
          }
        />
      )}

      {showCollection && (
        <CollectionPanel
          collection={
            game.collection
          }
          onClose={() =>
            setShowCollection(
              false
            )
          }
        />
      )}

    </div>
  );
}
