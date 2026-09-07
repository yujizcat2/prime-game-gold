const snapshotCard = (card) => Object.freeze({
  id: card.id,
  value: card.value,
  attribute: card.attribute,
});

export function createCombineHistoryRecord(first, second, child, step) {
  return Object.freeze({
    id: `combine-${child.id}`,
    step,
    parent1: snapshotCard(first),
    parent2: snapshotCard(second),
    child: snapshotCard(child),
  });
}
