import { ATTRIBUTE_NAMES, ATTRIBUTES } from '../game/constants.js';

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

  const classes = [
    'board-piece',
    `board-piece--${card.attribute}`,
    preview ? 'board-piece--preview' : '',
    selectedRole ? 'board-piece--selected' : '',
    candidate?.add ? 'board-piece--combine-candidate' : '',
    candidate?.process ? 'board-piece--reduce-candidate' : '',
    candidate?.absorb ? 'board-piece--absorb-candidate' : '',
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

  /*
   * ============================================================
   * 收藏状态角标
   * ============================================================
   *
   * ×
   * 当前 数字 + 当前系 已收藏
   *
   * △
   * 当前系没收藏，
   * 但同一个数字的其他系至少一个已收藏
   *
   * X 不参与收藏角标
   * ============================================================
   */

  let collectionMarker = null;

  if (
    card.kind === 'normal' &&
    collection
  ) {
    const exactKey =
      `${card.attribute}${card.value}`;

    const exactCollected =
      collection.has(exactKey);

    if (exactCollected) {
      collectionMarker = '×';
    } else {
      const otherAttributeCollected =
        ATTRIBUTES.some(
          (attribute) =>
            attribute !== card.attribute &&
            collection.has(
              `${attribute}${card.value}`
            )
        );

      if (otherAttributeCollected) {
        collectionMarker = '△';
      }
    }
  }

  const content = (
    <>
      <span className="board-piece-type-bar" />

      {collectionMarker && (
        <span
          className={`board-piece-collection-marker ${
            collectionMarker === '×'
              ? 'board-piece-collection-marker--exact'
              : 'board-piece-collection-marker--related'
          }`}
          aria-label={
            collectionMarker === '×'
              ? '该属性数字已收藏'
              : '该数字其他属性已收藏'
          }
        >
          {collectionMarker}
        </span>
      )}

      <strong className="board-piece-number">
        {card.value}
      </strong>

      <span className="board-piece-attribute">
        {ATTRIBUTE_NAMES[card.attribute]}
      </span>

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
          aria-label={`即将相加，生成${ATTRIBUTE_NAMES[card.attribute]} ${card.value}`}
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
          aria-label={`${ATTRIBUTE_NAMES[card.attribute]} ${card.value}`}
        >
          {content}
        </button>
      )}
    </div>
  );
}