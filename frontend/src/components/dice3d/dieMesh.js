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

import {
  BufferAttribute, BufferGeometry, CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace,
} from 'three';

import { faceCentroids, faceNormals } from './diceShapes';

const CELL_PADDING = 0.9;

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
 * How much of a cell a numeral may occupy, by the face's corner count.
 *
 * The UVs map a face so its corners reach the edge of its square cell, but
 * a triangle inscribed in a square leaves far less usable room than a
 * pentagon does, and much less than a square. Sizing the glyph off the cell
 * rather than off the face is why an early version had numbers bleeding
 * over the edges of the d20 and d8.
 */
const GLYPH_SCALE = { 3: 0.34, 4: 0.5, 5: 0.46 };

// The d10 and d100 have kite faces: four corners, but a kite is long and
// thin, so the square-face allowance let their numerals spill over the
// edges. They get their own, smaller, allowance.
const KITE_SCALE = 0.36;

function shade(hex, amount) {
  const value = parseInt(String(hex).replace('#', ''), 16);
  const channel = (shift) => {
    const c = (value >> shift) & 255;
    return Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  };
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

/**
 * Draw the numbers into a square atlas.
 *
 * The numerals are inked into a shallow engraving, as on a real resin die:
 * a darker lip below each stroke and a faint highlight above it, then the
 * ink. The lip and highlight are tones of the body, never of the ink, so a
 * dye's contrast (held to WCAG AA in diceDyes.test.js) is what the eye
 * reads; they only give the number depth.
 *
 * 6 and 9 get an underline, as they do on a real die, because on a d6 and a
 * d10 they are otherwise the same glyph upside down.
 */
export function drawFaceAtlas(faceValues, { columns, cellPixels, body, ink, size, corners = 4 }) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;

  canvas.width = columns * cellPixels;
  canvas.height = columns * cellPixels;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = body;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const kite = Number(size) === 10 || Number(size) === 100;
  const lip = shade(body, -0.38);
  const highlight = shade(body, 0.45);

  faceValues.forEach((value, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const centreX = (column + 0.5) * cellPixels;
    // A triangular face is widest towards its base, so the glyph sits a
    // little below the cell's centre to stay clear of the apex.
    const centreY = (row + 0.5) * cellPixels + (corners === 3 ? cellPixels * 0.07 : 0);

    // Longer numbers need to be smaller again to stay inside the face.
    const digits = String(value).length;
    const fit = digits > 2 ? 0.62 : digits > 1 ? 0.8 : 1;
    const scale = (kite ? KITE_SCALE : (GLYPH_SCALE[corners] || 0.46)) * fit;
    const glyphPx = Math.round(cellPixels * scale);
    context.font = `700 ${glyphPx}px Manrope, Inter, system-ui, sans-serif`;
    const depth = Math.max(1, glyphPx * 0.045);

    const paint = (colour, dx, dy) => {
      context.fillStyle = colour;
      context.strokeStyle = colour;
      context.fillText(String(value), centreX + dx, centreY + dy);
      if (value === 6 || value === 9) {
        const width = cellPixels * 0.17 * (kite ? 0.8 : 1);
        const underlineY = centreY + dy + glyphPx * 0.62;
        context.lineWidth = Math.max(2, glyphPx * 0.07);
        context.beginPath();
        context.moveTo(centreX + dx - width, underlineY);
        context.lineTo(centreX + dx + width, underlineY);
        context.stroke();
      }
    };
    paint(highlight, -depth * 0.6, -depth * 0.6);
    paint(lip, depth, depth);
    paint(ink, 0, 0);
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // Mipmaps keep small dice in a large pool sharp instead of shimmering.
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  return texture;
}

/**
 * How far each edge is rounded off, as a fraction of the die's radius.
 * Real resin dice are tumbled, so their edges catch the light as soft
 * bevels rather than knife edges; that highlight is most of what makes a
 * rendered die read as an object instead of a paper net.
 */
export const BEVEL = 0.07;

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVector(v, k) {
  return [v[0] * k, v[1] * k, v[2] * k];
}

/**
 * Build the geometry for a solid, with each face's UVs pointing at its own
 * atlas cell. Face order matches the solid's face order, so face i shows
 * faceValues[i].
 *
 * With a bevel, each face is drawn slightly inset within its own plane, and
 * the gaps are closed by a strip along every edge and a cap at every
 * corner. Strip and cap vertices take the normals of the faces they join,
 * so the light rolls smoothly round the edge. Every face stays in its
 * original plane, so the die still lies flat on the face the physics and
 * the face reading say it does; only the visual edge is softened.
 *
 * Strips and caps sample a corner of the atlas that is always plain body
 * colour, and carry a vertex colour so a natural 20 or 1 can tint just its
 * edges.
 */
export function buildDieGeometry(solid, columns, { bevel = BEVEL, edgeColor = [1, 1, 1] } = {}) {
  const normals = faceNormals(solid);
  const centroids = faceCentroids(solid);
  const radius = Math.max(...solid.vertices.map((v) => Math.hypot(...v)));
  const inset = Math.max(0, bevel) * radius;

  const positions = [];
  const normalData = [];
  const uvs = [];
  const colours = [];
  const BODY_UV = [0.004, 0.996]; // top-left corner of the first cell: never inked

  // Push a triangle, flipping it if needed so it faces `outward`.
  const triangle = (points, pointNormals, pointUvs, pointColours, outward) => {
    const facing = dot(cross(subtract(points[1], points[0]), subtract(points[2], points[0])), outward);
    const order = facing >= 0 ? [0, 1, 2] : [0, 2, 1];
    order.forEach((i) => {
      positions.push(...points[i]);
      normalData.push(...pointNormals[i]);
      uvs.push(...pointUvs[i]);
      colours.push(...pointColours[i]);
    });
  };

  // insetCorner[faceIndex][vertexIndex] = that corner pulled into the face.
  const insetCorner = solid.faces.map((face, faceIndex) => {
    const centroid = centroids[faceIndex];
    const map = new Map();
    face.forEach((vertexIndex) => {
      const vertex = solid.vertices[vertexIndex];
      const toCentre = subtract(centroid, vertex);
      const distance = Math.hypot(...toCentre) || 1;
      map.set(vertexIndex, add(vertex, scaleVector(toCentre, Math.min(0.45, inset / distance))));
    });
    return map;
  });

  const white = [1, 1, 1];

  solid.faces.forEach((face, faceIndex) => {
    const normal = normals[faceIndex];
    const centroid = centroids[faceIndex];
    const { axisU, axisV } = faceBasis(normal, solid.vertices, face, centroid);

    // UVs are measured from the ORIGINAL corners, so the numeral keeps its
    // size and place; the inset corners simply sample slightly inside it.
    const planarOf = (point) => {
      const offset = subtract(point, centroid);
      return [dot(offset, axisU), dot(offset, axisV)];
    };
    const reach = Math.max(...face.map((vertexIndex) => Math.hypot(...planarOf(solid.vertices[vertexIndex])))) || 1;
    const column = faceIndex % columns;
    const row = Math.floor(faceIndex / columns);
    const cell = 1 / columns;
    const uvOf = (point) => {
      const [u, v] = planarOf(point);
      return [
        (column + 0.5) * cell + (u / reach) * cell * 0.5 * CELL_PADDING,
        // Canvas rows run downwards while UV v runs upwards.
        1 - ((row + 0.5) * cell - (v / reach) * cell * 0.5 * CELL_PADDING),
      ];
    };

    const corners = face.map((vertexIndex) => insetCorner[faceIndex].get(vertexIndex));
    for (let corner = 1; corner < corners.length - 1; corner += 1) {
      const points = [corners[0], corners[corner], corners[corner + 1]];
      triangle(points, [normal, normal, normal], points.map(uvOf), [white, white, white], normal);
    }
  });

  if (inset > 0) {
    // Edge strips: one quad per edge shared by two faces.
    const edgeFaces = new Map();
    solid.faces.forEach((face, faceIndex) => {
      face.forEach((a, i) => {
        const b = face[(i + 1) % face.length];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!edgeFaces.has(key)) edgeFaces.set(key, { a, b, faces: [] });
        edgeFaces.get(key).faces.push(faceIndex);
      });
    });
    edgeFaces.forEach(({ a, b, faces }) => {
      if (faces.length !== 2) return;
      const [f1, f2] = faces;
      const n1 = normals[f1];
      const n2 = normals[f2];
      const outward = add(n1, n2);
      const quad = [insetCorner[f1].get(a), insetCorner[f1].get(b), insetCorner[f2].get(b), insetCorner[f2].get(a)];
      const quadNormals = [n1, n1, n2, n2];
      const uv = [BODY_UV, BODY_UV, BODY_UV];
      const tint = [edgeColor, edgeColor, edgeColor];
      triangle([quad[0], quad[1], quad[2]], [quadNormals[0], quadNormals[1], quadNormals[2]], uv, tint, outward);
      triangle([quad[0], quad[2], quad[3]], [quadNormals[0], quadNormals[2], quadNormals[3]], uv, tint, outward);
    });

    // Corner caps: close the small polygon left where faces meet at a vertex.
    solid.vertices.forEach((vertex, vertexIndex) => {
      const around = solid.faces
        .map((face, faceIndex) => (face.includes(vertexIndex) ? faceIndex : -1))
        .filter((faceIndex) => faceIndex >= 0);
      if (around.length < 3) return;
      const axis = normalise(vertex);
      const helper = Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = normalise(cross(axis, helper));
      const v = cross(axis, u);
      const ring = around
        .map((faceIndex) => ({ point: insetCorner[faceIndex].get(vertexIndex), normal: normals[faceIndex] }))
        .map((entry) => {
          const offset = subtract(entry.point, vertex);
          return { ...entry, angle: Math.atan2(dot(offset, v), dot(offset, u)) };
        })
        .sort((left, right) => left.angle - right.angle);
      for (let i = 1; i < ring.length - 1; i += 1) {
        const picks = [ring[0], ring[i], ring[i + 1]];
        triangle(
          picks.map((entry) => entry.point),
          picks.map((entry) => entry.normal),
          [BODY_UV, BODY_UV, BODY_UV],
          [edgeColor, edgeColor, edgeColor],
          axis,
        );
      }
    });
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normalData), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3));
  return geometry;
}

/** Atlas grid width for a face count. */
export function atlasColumns(faceCount) {
  return Math.ceil(Math.sqrt(faceCount));
}
