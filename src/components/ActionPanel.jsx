import { ATTRIBUTE_NAMES } from '../game/constants.js';
const label = (card) => `${ATTRIBUTE_NAMES[card.attribute]} ${card.value}`;
export default function ActionPanel({ selectedCards, preview, message }) {
  return <div className="action-hint"><div className="action-hint-selection">{selectedCards.length === 0 && <strong>选择一张卡片</strong>}{selectedCards.length === 1 && <strong>{label(selectedCards[0])}</strong>}{selectedCards.length === 2 && <strong>{label(selectedCards[0])} <i>＋</i> {label(selectedCards[1])}</strong>}<small>{selectedCards.length ? '材料顺序由格子序号决定' : message}</small></div><div className="action-hint-options">{preview ? Object.values(preview).map((text) => <span key={text}>{text}</span>) : <span>{message}</span>}</div></div>;
}
