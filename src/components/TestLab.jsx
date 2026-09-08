import {
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  rankTestResults,
  runTestGame,
  summarizeTestResults,
} from '../game/testSimulation.js';

function formatNumber(
  value,
  digits = 1
) {
  if (
    !Number.isFinite(value)
  ) {
    return '0';
  }

  return value.toFixed(
    digits
  );
}

export default function TestLab({
  onClose,
}) {
  const [
    mode,
    setMode,
  ] = useState('random');

  const [
    gameCount,
    setGameCount,
  ] = useState(10);

  const [
    maxSteps,
    setMaxSteps,
  ] = useState(1000);

  const [
    results,
    setResults,
  ] = useState([]);

  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    selectedGame,
    setSelectedGame,
  ] = useState(null);

  const stopRef =
    useRef(false);

  const summary =
    useMemo(
      () =>
        summarizeTestResults(
          results
        ),
      [results]
    );

  const ranked =
    useMemo(
      () =>
        rankTestResults(
          results
        ),
      [results]
    );

  const modeName =
    mode === 'collection'
      ? 'Collection AI'
      : 'Random AI';

  async function startTest() {
    if (running) {
      return;
    }

    stopRef.current =
      false;

    setRunning(true);
    setResults([]);
    setSelectedGame(null);
    setProgress(0);

    const nextResults =
      [];

    for (
      let i = 0;
      i < gameCount;
      i += 1
    ) {
      if (
        stopRef.current
      ) {
        break;
      }

      const result =
        runTestGame({
          maxSteps,
          mode,
        });

      nextResults.push(
        result
      );

      setProgress(
        i + 1
      );

      /*
       * Collection AI 比 Random
       * 计算量明显更大。
       * 每局都给浏览器一次刷新机会。
       */
      if (
        mode === 'collection' ||
        (i + 1) % 10 === 0
      ) {
        setResults([
          ...nextResults,
        ]);

        await new Promise(
          (resolve) => {
            setTimeout(
              resolve,
              0
            );
          }
        );
      }
    }

    setResults([
      ...nextResults,
    ]);

    setRunning(false);
  }

  function stopTest() {
    stopRef.current =
      true;
  }

  return (
    <div className="test-lab-overlay">
      <section className="test-lab">
        <header className="test-lab-header">
          <div>
            <small>
              DEVELOPER TEST
            </small>

            <h2>
              Test Lab
            </h2>
          </div>

          <button
            className="test-close"
            onClick={onClose}
            disabled={running}
          >
            ×
          </button>
        </header>

        <section className="test-controls">
          <label>
            AI

            <select
              value={mode}
              disabled={running}
              onChange={(
                event
              ) =>
                setMode(
                  event.target.value
                )
              }
            >
              <option value="random">
                Random AI
              </option>

              <option value="collection">
                Collection AI
              </option>
            </select>
          </label>

          <label>
            局数

            <select
              value={gameCount}
              disabled={running}
              onChange={(
                event
              ) =>
                setGameCount(
                  Number(
                    event.target.value
                  )
                )
              }
            >
              <option value={1}>
                1
              </option>

              <option value={10}>
                10
              </option>

              <option value={100}>
                100
              </option>

              <option value={1000}>
                1000
              </option>
            </select>
          </label>

          <label>
            单局上限

            <select
              value={maxSteps}
              disabled={running}
              onChange={(
                event
              ) =>
                setMaxSteps(
                  Number(
                    event.target.value
                  )
                )
              }
            >
              <option value={100}>
                100 Step
              </option>

              <option value={500}>
                500 Step
              </option>

              <option value={1000}>
                1000 Step
              </option>

              <option value={5000}>
                5000 Step
              </option>
            </select>
          </label>

          {!running ? (
            <button
              className="test-run"
              onClick={startTest}
            >
              开始 {modeName}
            </button>
          ) : (
            <button
              className="test-stop"
              onClick={stopTest}
            >
              停止
            </button>
          )}
        </section>

        <div className="test-progress">
          {running
            ? `${modeName} 正在测试 ${progress} / ${gameCount}`
            : results.length
              ? `${modeName} 已完成 ${results.length} 局`
              : '尚未运行'}
        </div>

        {results.length > 0 && (
          <>
            <section className="test-summary">
              <h3>
                总体报告 · {modeName}
              </h3>

              <div className="test-summary-grid">
                <div>
                  <small>
                    Games
                  </small>
                  <b>
                    {summary.games}
                  </b>
                </div>

                <div>
                  <small>
                    平均 Step
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageSteps
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    平均收藏
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageCollection
                    )}{' '}
                    / 400
                  </b>
                </div>

                <div>
                  <small>
                    平均分数
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageScore
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    平均新收藏
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageNew
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    平均重复
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageDuplicates
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    重复率
                  </small>
                  <b>
                    {formatNumber(
                      summary.duplicateRate
                    )}
                    %
                  </b>
                </div>

                <div>
                  <small>
                    平均相加
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageCombine
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    平均处理
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageProcess
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    平均吸收
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageAbsorb
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    平均产生 X
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageXCreated
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    平均盘面总和
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageBoardSum
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    平均最终盘面
                  </small>
                  <b>
                    {formatNumber(
                      summary.averageFinalBoardSum
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    最大数字
                  </small>
                  <b>
                    {summary.maxNumberSeen}
                  </b>
                </div>
              </div>

              <div className="test-end-reasons">
                <span>
                  400/400：
                  <b>
                    {summary.completed}
                  </b>
                </span>

                <span>
                  无合法动作：
                  <b>
                    {summary.deadBoards}
                  </b>
                </span>

                <span>
                  步数上限：
                  <b>
                    {summary.stepLimits}
                  </b>
                </span>
              </div>
            </section>

            <section className="test-ranking">
              <div>
                <h3>
                  最好 10 局
                </h3>

                {ranked.best.map(
                  (result) => (
                    <button
                      key={
                        `best-${result.gameNumber}`
                      }
                      onClick={() =>
                        setSelectedGame(
                          result
                        )
                      }
                    >
                      <b>
                        #{result.gameNumber}
                      </b>

                      <span>
                        收藏{' '}
                        {result.collection}/400
                      </span>

                      <span>
                        分数{' '}
                        {result.score}
                      </span>

                      <span>
                        Step{' '}
                        {result.steps}
                      </span>
                    </button>
                  )
                )}
              </div>

              <div>
                <h3>
                  最差 10 局
                </h3>

                {ranked.worst.map(
                  (result) => (
                    <button
                      key={
                        `worst-${result.gameNumber}`
                      }
                      onClick={() =>
                        setSelectedGame(
                          result
                        )
                      }
                    >
                      <b>
                        #{result.gameNumber}
                      </b>

                      <span>
                        收藏{' '}
                        {result.collection}/400
                      </span>

                      <span>
                        分数{' '}
                        {result.score}
                      </span>

                      <span>
                        Step{' '}
                        {result.steps}
                      </span>
                    </button>
                  )
                )}
              </div>
            </section>
          </>
        )}

        {selectedGame && (
          <section className="test-game-detail">
            <header>
              <div>
                <h3>
                  Game #
                  {selectedGame.gameNumber}
                </h3>

                <small>
                  {selectedGame.endReason}
                </small>
              </div>

              <button
                onClick={() =>
                  setSelectedGame(
                    null
                  )
                }
              >
                关闭详情
              </button>
            </header>

            <div className="test-detail-stats">
              <span>
                收藏{' '}
                {selectedGame.collection}/400
              </span>

              <span>
                分数{' '}
                {selectedGame.score}
              </span>

              <span>
                Step{' '}
                {selectedGame.steps}
              </span>

              <span>
                新收藏{' '}
                {selectedGame.newCollections}
              </span>

              <span>
                重复{' '}
                {selectedGame.duplicates}
              </span>

              <span>
                相加{' '}
                {selectedGame.combine}
              </span>

              <span>
                处理{' '}
                {selectedGame.process}
              </span>

              <span>
                吸收{' '}
                {selectedGame.absorb}
              </span>

              <span>
                X{' '}
                {selectedGame.xCreated}
              </span>

              <span>
                最终盘面总和{' '}
                {selectedGame.finalBoardSum}
              </span>

              <span>
                最大数字{' '}
                {selectedGame.maxNumberSeen}
              </span>
            </div>

            <div className="test-history">
              {selectedGame.history.length
                ? selectedGame.history.map(
                    (
                      line,
                      index
                    ) => (
                      <div
                        key={index}
                      >
                        {line}
                      </div>
                    )
                  )
                : (
                  <p>
                    本局没有执行动作。
                  </p>
                )}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
