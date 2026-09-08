import { useState } from 'react';
import { ATTRIBUTE_NAMES, ATTRIBUTES, MAX_NORMAL_VALUE } from '../game/constants.js';
import { getNumberCollectionState } from '../game/collectionState.js';

const VALUES = Array.from({ length: MAX_NORMAL_VALUE - 1 }, (_, index) => index + 2);
const PALACE_NAMES = ['第一宫', '第二宫', '第三宫', '第四宫', '第五宫', '第六宫', '第七宫', '第八宫', '第九宫', '第十宫'];

export default function CollectionPanel({ collection, onClose }) {
  const [selectedValue, setSelectedValue] = useState(null);
  const entries = VALUES.map((value) => ({ value, ...getNumberCollectionState(value, collection) }));
  const total = VALUES.length * ATTRIBUTES.length;
  const completed = entries.filter((entry) => entry.isNumberComplete).length;
  const exploring = entries.filter((entry) => {
    const count = entry.materials.filter((material) => material.collected).length;
    return count > 0 && count < ATTRIBUTES.length;
  }).length;
  const undiscovered = VALUES.length - completed - exploring;
  const materialCounts = Object.fromEntries(ATTRIBUTES.map((attribute) => [attribute, VALUES.filter((value) => collection.has(`${attribute}${value}`)).length]));
  const palaces = Array.from({ length: Math.ceil(entries.length / 10) }, (_, index) => entries.slice(index * 10, index * 10 + 10));
  const selected = selectedValue === null ? null : entries.find((entry) => entry.value === selectedValue);

  return (
    <div className="collection-overlay" onClick={onClose} role="presentation">
      <section className="collection-dialog collection-atlas" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="晶宫图鉴">
        <header className="collection-atlas-header">
          <div><small>CRYSTAL ARCHIVE</small><h2>晶宫图鉴</h2></div>
          <button onClick={onClose} aria-label="关闭">×</button>
        </header>

        <section className="collection-overview">
          <div className="collection-total"><strong>{collection.size} <i>/ {total}</i></strong><span>探索度 {((collection.size / total) * 100).toFixed(1)}%</span></div>
          <div className="collection-progress"><i style={{ width: `${(collection.size / total) * 100}%` }} /></div>
          <div className="collection-summary"><span><b>{completed}</b>四系完成</span><span><b>{exploring}</b>探索中</span><span><b>{undiscovered}</b>未发现</span></div>
          <div className="collection-materials">
            {ATTRIBUTES.map((attribute) => (
              <div className={`collection-material collection-material--${attribute}`} key={attribute}>
                <span>{ATTRIBUTE_NAMES[attribute]}</span><b>{materialCounts[attribute]} <i>/ {VALUES.length}</i></b>
                <em><i style={{ width: `${(materialCounts[attribute] / VALUES.length) * 100}%` }} /></em>
              </div>
            ))}
          </div>
        </section>

        <div className="collection-palaces">
          {palaces.map((palace, palaceIndex) => {
            const palaceCollected = palace.reduce((sum, entry) => sum + entry.materials.filter((material) => material.collected).length, 0);
            return (
              <section className="collection-palace" key={palaceIndex}>
                <header><div><b>{PALACE_NAMES[palaceIndex] ?? `第${palaceIndex + 1}宫`}</b><small>{String(palace[0].value).padStart(2, '0')}–{palace.at(-1).value}</small></div><span>{palaceCollected} / {palace.length * ATTRIBUTES.length}</span></header>
                <div className="collection-map">
                  {palace.map((entry) => {
                    const count = entry.materials.filter((material) => material.collected).length;
                    return (
                      <button className={`collection-cell is-progress-${count}`} key={entry.value} onClick={() => setSelectedValue(entry.value)} aria-label={`${entry.value}，已收藏 ${count} / 4`}>
                        {entry.isNumberComplete && <em>✓</em>}<strong>{entry.value}</strong>
                        <span>{entry.materials.map((material) => <i className={`collection-dot collection-dot--${material.attribute} ${material.collected ? 'is-collected' : ''}`} key={material.attribute} title={material.name} />)}</span>
                        <small>{count}/4</small>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {selected && (
          <div className="collection-detail-backdrop" onClick={() => setSelectedValue(null)} role="presentation">
            <section className="collection-detail" onClick={(event) => event.stopPropagation()} role="dialog" aria-label={`${selected.value}收藏详情`}>
              <header><div><small>NUMBER ARCHIVE</small><h3>{selected.value}</h3></div><button onClick={() => setSelectedValue(null)} aria-label="关闭详情">×</button></header>
              <p className="collection-detail-count">收藏进度 <b>{selected.materials.filter((material) => material.collected).length} / 4</b></p>
              <div className="collection-detail-materials">
                {selected.materials.map((material) => <div className={`collection-detail-material collection-detail-material--${material.attribute} ${material.collected ? 'is-collected' : ''}`} key={material.attribute}><i /><b>{material.name}</b><small>{material.collected ? '已收藏' : '未收藏'}</small></div>)}
              </div>
              {selected.isNumberComplete ? (
                <p className="collection-detail-complete">✓ 四系完成<br /><small>{selected.value} 已解除毒化风险</small></p>
              ) : (
                <><p className="collection-detail-missing">还差：{selected.materials.filter((material) => !material.collected).map((material) => `${material.name}${selected.value}`).join('、')}</p><p className="collection-detail-note">完成四系后，{selected.value} 将永久解除毒化风险。<br />重复出现已收藏材料时可能形成毒卡。</p></>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
