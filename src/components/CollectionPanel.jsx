import { ATTRIBUTE_NAMES, MAX_NORMAL_VALUE } from '../game/constants.js';
import { getNumberCollectionState } from '../game/collectionState.js';

const VALUES = Array.from({ length: MAX_NORMAL_VALUE - 1 }, (_, index) => index + 2);

export default function CollectionPanel({ collection, onClose }) {
  const entries = VALUES
    .map((value) => ({ value, ...getNumberCollectionState(value, collection) }))
    .map((entry) => ({
      ...entry,
      materials: entry.materials.filter((material) => material.collected),
    }))
    .filter((entry) => entry.materials.length > 0);

  return (
    <div className="collection-overlay" onClick={onClose} role="presentation">
      <section className="collection-dialog collection-atlas" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="收藏">
        <header className="collection-atlas-header">
          <div><small>CRYSTAL ARCHIVE</small><h2>收藏</h2></div>
          <button onClick={onClose} aria-label="关闭">×</button>
        </header>

        <section className="collection-overview">
          <div className="collection-total"><strong>{collection.size}</strong><span>已收藏</span></div>
        </section>

        {entries.length > 0 ? (
          <div className="collection-map">
            {entries.map((entry) => (
              <article className="collection-cell" key={entry.value} aria-label={`${entry.value}：${entry.materials.map((material) => material.name).join('、')}`}>
                <strong>{entry.value}</strong>
                <span>
                  {entry.materials.map((material) => (
                    <i className={`collection-tag collection-tag--${material.attribute}`} key={material.attribute}>
                      {ATTRIBUTE_NAMES[material.attribute]}
                    </i>
                  ))}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="collection-empty">还没有收藏</p>
        )}
      </section>
    </div>
  );
}
