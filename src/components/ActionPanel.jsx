import { getMaterialDisplayState, isCardToxic } from '../game/collectionState.js';
const label = (card, collection) => `${getMaterialDisplayState(card.value, card.attribute, collection).displayName} ${card.value}`;
export default function ActionPanel({ selectedCards, preview, message, collection }) {
  const hasToxicCard = selectedCards.some((card) => isCardToxic(card, collection));
  return <div className="action-hint"><div className="action-hint-selection">{selectedCards.length === 0 && <strong>选择一张卡片</strong>}{selectedCards.length === 1 && <strong>{label(selectedCards[0], collection)}</strong>}{selectedCards.length === 2 && <strong>{label(selectedCards[0], collection)} <i>＋</i> {label(selectedCards[1], collection)}</strong>}<small>{hasToxicCard ? '⚠ 毒卡：仅可处理同数，或更小且可约分的普通卡。四系完成后解除。' : selectedCards.length ? '材料顺序由格子序号决定' : message}</small></div><div className="action-hint-options">{preview ? Object.values(preview).map((text) => <span key={text}>{text}</span>) : <span>{message}</span>}</div></div>;
}
