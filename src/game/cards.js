let nextId = 1;

const id = () => `card-${nextId++}`;

const freezeParentSnapshot = (snapshot = []) => Object.freeze(
  snapshot.map((parent) => Object.freeze({ value: parent.value, attribute: parent.attribute })),
);

export function createNormalCard(value, attribute, parents = [], parentSnapshot = []) {
  return { id: id(), kind: 'normal', value, attribute, parents: [...parents], parentSnapshot: freezeParentSnapshot(parentSnapshot) };
}

export function createXCard(value, parents = [], parentSnapshot = []) {
  return {
    id: id(), kind: 'x', value, attribute: 'X', parents: [...parents], parentSnapshot: freezeParentSnapshot(parentSnapshot), absorbedValues: [],
  };
}

export function resetCardIdsForTest() {
  nextId = 1;
}
