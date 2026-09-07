import Card from './Card.jsx';
export default function Board({ board, selected, candidates, preview, animation, onSelect, onAdd, disabled }) {
  return <div className="board" aria-label="3×3 棋盘">{board.map((card, index) => {
    const previewCard = !card && preview?.targetIndex === index ? preview.card : null;
    return <div className={`board-cell ${card || previewCard ? 'board-cell--occupied' : 'board-cell--empty'}`} key={index}>{card ? <Card card={card} index={index} selectedRole={selected.indexOf(index) + 1 || 0} candidate={candidates[index]} animation={animation} onSelect={() => onSelect(index)} disabled={disabled} /> : previewCard ? <Card card={previewCard} index={index} preview onPreviewAdd={onAdd} disabled={disabled} /> : <span className="board-empty-dot" />}</div>;
  })}</div>;
}
