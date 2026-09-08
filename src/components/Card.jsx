import { ATTRIBUTE_NAMES } from '../game/constants.js';
import { getMaterialDisplayState } from '../game/collectionState.js';

export default function Card({
  card,
  index,
  selectedRole,
  candidate,
  preview = false,
  animation,
  collection,
  onSelect,
  onPreviewAdd,
  disabled,
}) {
  const isSource =
    animation?.type === 'add' &&
    animation.phase === 'source' &&
    animation.indexes.includes(index);

  const isCreated =
    animation?.type === 'add' &&
    animation.phase === 'created' &&
    animation.targetIndex === index;

  const isCompress =
    ['process', 'absorb'].includes(animation?.type) &&
    animation.phase === 'compress' &&
    animation.indexes.includes(index);

  const isExit =
    animation?.type === 'process' &&
    animation.phase === 'exit' &&
    animation.exiting.includes(index);

  const isSettle =
    animation?.phase === 'settle' &&
    (
      animation.indexes.includes(index) ||
      animation.targetIndex === index
    );

  const collectionState = card.kind === 'normal'
    ? getMaterialDisplayState(card.value, card.attribute, collection)
    : null;

  const classes = [
    'board-piece',
    `board-piece--${card.attribute}`,
    preview ? 'board-piece--preview' : '',
    selectedRole ? 'board-piece--selected' : '',
    candidate?.add ? 'board-piece--combine-candidate' : '',
    candidate?.process ? 'board-piece--reduce-candidate' : '',
    candidate?.collect ? 'board-piece--collection-candidate' : '',
    candidate?.absorb ? 'board-piece--absorb-candidate' : '',
    collectionState?.isDuplicateRisk ? 'board-piece--duplicate-risk' : '',
    collectionState?.isNumberComplete ? 'board-piece--number-complete' : '',
    isSource ? 'board-piece--combine-source' : '',
    isCompress ? 'board-piece--reduce-compress' : '',
    isExit ? 'board-piece--reduce-auto-exit' : '',
    isSettle
      ? (
          animation.type === 'absorb'
            ? 'board-piece--absorb-settle'
            : 'board-piece--reduce-settle'
        )
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const source =
    card.parentSnapshot?.length === 2
      ? card.parentSnapshot
          .map(
            (parent) =>
              `${ATTRIBUTE_NAMES[parent.attribute]}${parent.value}`
          )
          .join(' + ')
      : '原生';

  const content = (
    <>
      <span className="board-piece-type-bar" />

      <strong className="board-piece-number">
        {card.value}
      </strong>

      <span className="board-piece-attribute">
        {collectionState?.displayName ?? ATTRIBUTE_NAMES[card.attribute]}
        {collectionState?.isDuplicateRisk && (
          <b className="board-piece-warning" aria-label="重复收藏风险">⚠</b>
        )}
      </span>

      {collectionState && (
        <span
          className={`board-piece-collection-progress ${
            collectionState.isNumberComplete ? 'is-complete' : ''
          }`}
          aria-label={`${card.value}的四系收藏进度`}
        >
          {collectionState.materials.map((material) => (
            <i
              className={material.collected ? 'is-collected' : ''}
              key={material.attribute}
              title={`${card.value}${material.name}${material.collected ? '已收藏' : '未收藏'}`}
            >
              {material.name}
            </i>
          ))}
          {collectionState.isNumberComplete && <em aria-label="四系完成">✓</em>}
        </span>
      )}

      <small className="board-piece-source">
        {source}
      </small>

      {Boolean(selectedRole) && (
        <>
          <span className="board-piece-selection-role">
            {selectedRole === 1
              ? '主卡'
              : '第二张'}
          </span>

          <span className="board-piece-selected-ring" />
        </>
      )}

      {(
        candidate?.add ||
        candidate?.process ||
        candidate?.collect ||
        candidate?.absorb
      ) && (
        <span className="candidate-markers">
          {candidate.add && (
            <i className="marker-add">
              ＋
            </i>
          )}

          {candidate.process && (
            <i className="marker-process">
              ÷
            </i>
          )}

          {candidate.collect && (
            <i
              className="marker-collect"
              aria-label="处理后可获得收藏"
            >
              ★
            </i>
          )}

          {candidate.absorb && (
            <i className="marker-absorb">
              ◉
            </i>
          )}
        </span>
      )}
    </>
  );

  return (
    <div
      className={`board-piece-wrapper ${
        preview
          ? 'board-piece-wrapper--preview'
          : ''
      } ${
        isCreated
          ? 'board-piece-wrapper--created'
          : ''
      }`}
    >
      {preview ? (
        <button
          type="button"
          className={classes}
          disabled={disabled}
          aria-label={`即将相加，生成${collectionState?.displayName ?? ATTRIBUTE_NAMES[card.attribute]} ${card.value}`}
          onClick={(event) => {
            event.stopPropagation();
            onPreviewAdd?.();
          }}
        >
          {content}

          <span className="board-preview-action">
            即将相加 +{card.value}
          </span>
        </button>
      ) : (
        <button
          className={classes}
          onClick={onSelect}
          disabled={disabled}
          aria-label={`${collectionState?.displayName ?? ATTRIBUTE_NAMES[card.attribute]} ${card.value}${collectionState?.isDuplicateRisk ? '，重复收藏风险' : ''}`}
        >
          {content}
        </button>
      )}
    </div>
  );
}
