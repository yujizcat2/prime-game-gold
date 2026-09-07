import { useEffect, useMemo, useRef, useState } from 'react';
import ActionPanel from './components/ActionPanel.jsx';
import Board from './components/Board.jsx';
import CollectionPanel from './components/CollectionPanel.jsx';
import CombineHistoryPanel from './components/CombineHistoryPanel.jsx';
import Hud from './components/Hud.jsx';
import { ADDITION_ATTRIBUTE } from './game/constants.js';
import { createInitialState } from './game/state.js';
import { absorb, addNormalToBoard, canAbsorb, canAdd, gcd, processCards, settleCollection } from './game/rules.js';
import { getNextSelection } from './game/selection.js';
import { createCombineHistoryRecord } from './game/combineHistory.js';

const replaceTwo = (board, i, first, j, second) => board.map((card, index) => (index === i ? first : index === j ? second : card));
const ADD_LABEL = { A: { A: '金', B: '铜', C: '铁', D: '银' }, B: { A: '铁', B: '银', C: '金', D: '铜' }, C: { A: '银', B: '铁', C: '铜', D: '金' }, D: { A: '铜', B: '金', C: '银', D: '铁' } };

export default function App() {
  const [game, setGame] = useState(() => createInitialState());
  const [animation, setAnimation] = useState(null);
  const [showCollection, setShowCollection] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const timers = useRef([]);
  const selectedCards = game.selected.map((index) => game.board[index]).filter(Boolean);
  const later = (callback, delay) => { timers.current.push(window.setTimeout(callback, delay)); };
  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  const candidates = useMemo(() => {
    const result = {};
    if (game.selected.length !== 1 || animation) return result;
    const first = game.board[game.selected[0]];
    game.board.forEach((card, index) => {
      if (!card || index === game.selected[0]) return;
      result[index] = {
        add: game.board.some((slot) => slot === null) && canAdd(first, card, game.usedPairs),
        process: first.kind === 'normal' && card.kind === 'normal' && gcd(first.value, card.value) > 1,
        absorb: canAbsorb(first, card),
      };
    });
    return result;
  }, [animation, game.board, game.selected, game.usedPairs]);

  const preview = useMemo(() => {
    if (selectedCards.length !== 2) return null;
    const [first, second] = selectedCards;
    const output = {};
    if (game.board.some((slot) => slot === null) && canAdd(first, second, game.usedPairs)) {
      const value = first.value + second.value;
      output.add = value > 101 ? `相加 → 熔体 ${value}` : `相加 → ${ADD_LABEL[first.attribute][second.attribute]} ${value}`;
    }
    const divisor = first.kind === 'normal' && second.kind === 'normal' ? gcd(first.value, second.value) : 1;
    if (divisor > 1) output.process = `处理 → ${first.attribute}${first.value / divisor} / ${second.attribute}${second.value / divisor}`;
    if (canAbsorb(first, second)) output.absorb = first.value + second.value > 201 ? `吸收 → ${second.attribute}${first.value + second.value - 200}` : `吸收 → 熔体 ${first.value + second.value}`;
    return output;
  }, [game.board, game.usedPairs, selectedCards]);

  const boardPreview = useMemo(() => {
    if (selectedCards.length !== 2 || !preview?.add) return null;
    const [first, second] = selectedCards;
    const value = first.value + second.value;
    return {
      targetIndex: game.board.findIndex((card) => card === null),
      card: value > 101
        ? { kind: 'x', attribute: 'X', value, parentSnapshot: [first, second] }
        : { kind: 'normal', attribute: ADDITION_ATTRIBUTE[first.attribute][second.attribute], value, parentSnapshot: [first, second] },
    };
  }, [game.board, preview, selectedCards]);

  function select(index) {
    if (game.life <= 0 || animation || !game.board[index]) return;
    setGame((current) => ({ ...current, selected: getNextSelection(current.selected, index) }));
  }

  function runAdd() {
    if (animation || game.selected.length !== 2) return;
    const outcome = addNormalToBoard(game.board, game.selected[0], game.selected[1], game.usedPairs);
    if (!outcome) return setGame((current) => ({ ...current, message: game.board.every(Boolean) ? '棋盘已满，无法生成新卡。' : '这两张卡不能相加。' }));
    clearTimers();
    const historyRecord = createCombineHistoryRecord(selectedCards[0], selectedCards[1], outcome.result, game.steps + 1);
    setAnimation({ type: 'add', phase: 'source', indexes: [...game.selected], targetIndex: outcome.targetIndex });
    later(() => {
      setGame((current) => ({ ...current, board: outcome.board, selected: [], usedPairs: outcome.usedPairs, combineHistory: [...current.combineHistory, historyRecord], steps: current.steps + 1, message: `生成 ${outcome.result.attribute}${outcome.result.value}` }));
      setAnimation({ type: 'add', phase: 'created', indexes: [...game.selected], targetIndex: outcome.targetIndex });
    }, 140);
    later(() => setAnimation(null), 560);
  }

  function runProcess() {
    if (animation || game.selected.length !== 2) return;
    const result = processCards(selectedCards[0], selectedCards[1]);
    if (!result) return setGame((current) => ({ ...current, message: '最大公约数必须大于 1。' }));
    const indexes = [...game.selected];
    const exiting = [!result.first ? indexes[0] : null, !result.second ? indexes[1] : null].filter((x) => x !== null);
    clearTimers();
    setAnimation({ type: 'process', phase: 'compress', indexes, exiting: [] });
    later(() => setAnimation({ type: 'process', phase: exiting.length ? 'exit' : 'settle', indexes, exiting }), 150);
    const commitDelay = exiting.length ? 570 : 150;
    later(() => {
      setGame((current) => {
        let { life, score, collection } = current;
        result.collections.forEach((card) => { ({ life, score, collection } = settleCollection(collection, life, score, card)); });
        return { ...current, board: replaceTwo(current.board, indexes[0], result.first, indexes[1], result.second), selected: [], life, score, collection, steps: current.steps + 1, message: result.collections.length ? `收藏 ${result.collections.map((card) => `${card.attribute}${card.value}`).join('、')}` : '处理完成' };
      });
      if (!exiting.length) setAnimation({ type: 'process', phase: 'settle', indexes, exiting: [] });
    }, commitDelay);
    later(() => setAnimation(null), exiting.length ? 590 : 450);
  }

  function runAbsorb() {
    if (animation || game.selected.length !== 2 || !canAbsorb(selectedCards[0], selectedCards[1])) return;
    const indexes = [...game.selected];
    const result = absorb(selectedCards[0], selectedCards[1]);
    clearTimers();
    setAnimation({ type: 'absorb', phase: 'compress', indexes, targetIndex: indexes[0] });
    later(() => {
      setGame((current) => ({ ...current, board: replaceTwo(current.board, indexes[0], result, indexes[1], selectedCards[1]), selected: [], steps: current.steps + 1, message: result.kind === 'x' ? `熔体变为 X${result.value}` : `熔体循环为 ${result.attribute}${result.value}` }));
      setAnimation({ type: 'absorb', phase: 'settle', indexes, targetIndex: indexes[0] });
    }, 140);
    later(() => setAnimation(null), 460);
  }

  return <div className="game-page"><main className="game-shell">
    <header className="game-header"><div><div className="game-header-kicker">NUMBER COLLECTION</div><h1>Prime Game Gold</h1></div><div className="header-actions"><button className="history-trigger" onClick={() => setShowHistory(true)}>合成历史 <span>{game.combineHistory.length}</span></button><button className="collection-trigger" onClick={() => setShowCollection(true)}>收藏册</button></div></header>
    <Hud game={game} />
    <section className="game-info-row"><ActionPanel selectedCards={selectedCards} preview={preview} message={game.message} /></section>
    <section className="game-board-section"><div className="game-board">{game.life <= 0 && <div className="game-over">游戏结束</div>}
      <Board board={game.board} selected={game.selected} candidates={candidates} preview={boardPreview} animation={animation} onSelect={select} onAdd={runAdd} disabled={game.life <= 0 || Boolean(animation)} />
      <div className="game-board-actions">
        <button className={`action-button action-button--add ${preview?.add ? 'is-active' : ''}`} disabled={!preview?.add || Boolean(animation)} onClick={runAdd}><span>＋</span>相加</button>
        <button className={`action-button action-button--process ${preview?.process ? 'is-active' : ''}`} disabled={!preview?.process || Boolean(animation)} onClick={runProcess}><span>÷</span>处理</button>
        <button className={`action-button action-button--absorb ${preview?.absorb ? 'is-active' : ''}`} disabled={!preview?.absorb || Boolean(animation)} onClick={runAbsorb}><span>◉</span>吸收</button>
      </div>
    </div></section>
    <button className="restart-button" onClick={() => { clearTimers(); setAnimation(null); setGame(createInitialState()); }}>重新开始</button>
  </main>{showHistory && <CombineHistoryPanel history={game.combineHistory} onClose={() => setShowHistory(false)} />}{showCollection && <CollectionPanel collection={game.collection} onClose={() => setShowCollection(false)} />}</div>;
}
