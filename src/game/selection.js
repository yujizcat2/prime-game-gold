export function getNextSelection(selected, index) {
  const current = Array.isArray(selected) ? selected : [];
  if (index === current[0]) return [];
  if (index === current[1]) return [current[0]];
  if (current.length === 0) return [index];
  return [current[0], index];
}
