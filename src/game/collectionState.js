import { ATTRIBUTE_NAMES, ATTRIBUTES } from './constants.js';

export function getNumberCollectionState(value, collection = new Set()) {
  const materials = ATTRIBUTES.map((attribute) => ({
    attribute,
    name: ATTRIBUTE_NAMES[attribute],
    collected: collection.has(`${attribute}${value}`),
  }));

  return {
    materials,
    isNumberComplete: materials.every((material) => material.collected),
  };
}

export function getMaterialDisplayState(value, attribute, collection = new Set()) {
  const numberState = getNumberCollectionState(value, collection);
  const isCollected = collection.has(`${attribute}${value}`);
  const isDuplicateRisk = isCollected && !numberState.isNumberComplete;

  return {
    ...numberState,
    isDuplicateRisk,
    displayName: `${isDuplicateRisk ? '毒' : ''}${ATTRIBUTE_NAMES[attribute]}`,
  };
}
