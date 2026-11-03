/**
 * Turning a solid plus a list of face values into a three.js mesh.
 *
 * The numbers live in a single canvas atlas, one cell per face, and each
 * face's UVs are mapped into its own cell. That keeps a die to one draw call
 * and one texture however many faces it has, and it means relabelling a die
 * is a texture change rather than a geometry rebuild.
 *
 * Faces may be triangles, quads, pentagons or kites, so each is fanned into
 * triangles from its first vertex, and UVs come from the vertex's real
 * position in the face plane rather than from an assumed regular polygon --
 * the d10's kites are not regular and would otherwise distort.
 */

import { BufferAttribute, BufferGeometry, CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';

import { faceCentroids, faceNormals } from './diceShapes';

const CELL_PADDING = 0.92;

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalise(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/** An in-plane basis for a face, used for both UVs and label orientation. */
function faceBasis(normal, vertices, face, centroid) {
  const first = subtract(vertices[face[0]], centroid);
  const axisU = normalise(subtract(first, normal.map((value) => value * dot(normal, first))));
  return { axisU, axisV: cross(normal, axisU) };
}

/**
 * Draw the numbers into a square atlas.
 *
 * 6 and 9 get an underline, as they do on a real die, because on a d6 and a
 * d10 they are otherwise the same glyph upside down.
 */
export function drawFaceAtlas(faceValues, { columns, cellPixels, body, ink, size }) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;

  canvas.width = columns * cellPixels;
  canvas.height = columns * cellPixels;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = body;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = ink;
  context.strokeStyle = ink;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  faceValues.forEach((value, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const centreX = (column + 0.5) * cellPixels;
    const centreY = (row + 0.5) * cellPixels;

    // Longer numbers need to be smaller to stay inside a triangular face.
    const digits = String(value).length;
    const scale = digits > 2 ? 0.42 : digits > 1 ? 0.52 : 0.66;
    context.font = `600 ${Math.round(cellPixels * scale)}px Manrope, Inter, system-ui, sans-serif`;

    // A d20's faces are triangles, so the glyph sits a little low of centre
    // to stay off the apex.
    const offsetY = size === 20 || size === 8 || size === 4 ? cellPixels * 0.06 : 0;
    context.fillText(String(value), centreX, centreY + offsetY);

    if (value === 6 || value === 9) {
      const width = cellPixels * 0.17;
      const underlineY = centreY + offsetY + cellPixels * scale * 0.62;
      context.lineWidth = Math.max(2, cellPixels * 0.025);
      context.beginPath();
      context.moveTo(centreX - width, underlineY);
      context.lineTo(centreX + width, underlineY);
      context.stroke();
    }
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Build the geometry for a solid, with each face's UVs pointing at its own
 * atlas cell. Face order matches the solid's face order, so face i shows
 * faceValues[i].
 */
export function buildDieGeometry(solid, columns) {
  const normals = faceNormals(solid);
  const centroids = faceCentroids(solid);

  const positions = [];
  const normalData = [];
  const uvs = [];

  solid.faces.forEach((face, faceIndex) => {
    const normal = normals[faceIndex];
    const centroid = centroids[faceIndex];
    const { axisU, axisV } = faceBasis(normal, solid.vertices, face, centroid);

    // Project the face's vertices into its plane, then normalise by the
    // furthest one so any face shape fills its cell without distortion.
    const planar = face.map((vertexIndex) => {
      const offset = subtract(solid.vertices[vertexIndex], centroid);
      return [dot(offset, axisU), dot(offset, axisV)];
    });
    const reach = Math.max(...planar.map(([u, v]) => Math.hypot(u, v))) || 1;

    const column = faceIndex % columns;
    const row = Math.floor(faceIndex / columns);
    const cell = 1 / columns;

    const cellUv = planar.map(([u, v]) => [
      (column + 0.5) * cell + (u / reach) * cell * 0.5 * CELL_PADDING,
      // Canvas rows run downwards while UV v runs upwards.
      1 - ((row + 0.5) * cell - (v / reach) * cell * 0.5 * CELL_PADDING),
    ]);

    // Fan the polygon into triangles from its first vertex.
    for (let corner = 1; corner < face.length - 1; corner += 1) {
      [0, corner, corner + 1].forEach((pick) => {
        const vertex = solid.vertices[face[pick]];
        positions.push(vertex[0], vertex[1], vertex[2]);
        normalData.push(normal[0], normal[1], normal[2]);
        uvs.push(cellUv[pick][0], cellUv[pick][1]);
      });
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normalData), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  return geometry;
}

/** Atlas grid width for a face count. */
export function atlasColumns(faceCount) {
  return Math.ceil(Math.sqrt(faceCount));
}
