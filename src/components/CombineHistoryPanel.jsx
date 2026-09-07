import { ATTRIBUTE_NAMES } from '../game/constants.js';

const cardLabel = (card) => `${ATTRIBUTE_NAMES[card.attribute]}${card.value}`;

export default function CombineHistoryPanel({ history, onClose }) {
  return <div className="history-overlay" onClick={onClose} role="presentation"><section className="history-dialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="合成历史">
    <header><div><small>COMBINE HISTORY</small><h2>合成历史</h2></div><button onClick={onClose} aria-label="关闭">×</button></header>
    {history.length === 0 ? <p className="history-empty">还没有合成记录</p> : <ol className="history-list">{[...history].reverse().map((record) => <li key={record.id}><b>Step {record.step}</b><span>{cardLabel(record.parent1)} + {cardLabel(record.parent2)} → {cardLabel(record.child)}</span></li>)}</ol>}
  </section></div>;
}
