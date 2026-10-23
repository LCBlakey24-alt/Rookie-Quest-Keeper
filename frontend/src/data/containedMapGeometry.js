// Match the visible pixels of an image rendered with object-fit: contain.
// Tokens use 0–100% map coordinates and must not cover the letterbox margins.
export function getContainedMapRect(containerWidth, containerHeight, imageWidth, imageHeight) {
  const values = [containerWidth, containerHeight, imageWidth, imageHeight].map(Number);
  if (values.some(value => !Number.isFinite(value) || value <= 0)) return null;

  const [boxWidth, boxHeight, mapWidth, mapHeight] = values;
  const scale = Math.min(boxWidth / mapWidth, boxHeight / mapHeight);
  const width = mapWidth * scale;
  const height = mapHeight * scale;
  return {
    left: (boxWidth - width) / 2,
    top: (boxHeight - height) / 2,
    width,
    height,
  };
}
