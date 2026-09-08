const items = [
  ['combine', '搭配'],
  ['reduce', '处理'],
  ['collect', '收藏'],
];

export default function ActionOpportunities({ opportunities }) {
  return (
    <section className="action-opportunities" aria-label="行动机会">
      <strong className="action-opportunities-title">行动机会</strong>
      <div className="action-opportunities-items">
        {items.map(([key, label]) => (
          <span
            className={opportunities[key] === 0 ? 'is-empty' : ''}
            key={key}
          >
            {label} <b>{opportunities[key]}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
