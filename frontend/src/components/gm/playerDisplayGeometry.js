/**
 * Geometry for a map painted with object-fit: contain.
 * Percent-based token coordinates must be relative to the visible image,
 * not the full letterboxed panel (especially on portrait TVs).
 */
export function containedImageBounds(frameWidth, frameHeight, imageWidth, imageHeight) {
  const width = Number(frameWidth);
  const height = Number(frameHeight);
  const intrinsicWidth = Number(imageWidth);
  const intrinsicHeight = Number(imageHeight);
  if (![width, height, intrinsicWidth, intrinsicHeight].every(v => Number.isFinite(v) && v > 0)) {
    return null;
  }
  const scale = Math.min(width / intrinsicWidth, height / intrinsicHeight);
  const fittedWidth = intrinsicWidth * scale;
  const fittedHeight = intrinsicHeight * scale;
  return {
    left: (width - fittedWidth) / 2,
    top: (height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
  };
}
