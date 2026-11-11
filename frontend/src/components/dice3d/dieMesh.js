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
const DEFAULT_GLOW = 'rgba(242, 137, 47, 1)';

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

function polygonAreaCentroid(points) {
  // Area-weighted centre of a planar polygon given in 2D. For a kite this
  // sits towards the wide end, where a real die prints its number.
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const crossed = x0 * y1 - x1 * y0;
    area += crossed;
    cx += (x0 + x1) * crossed;
    cy += (y0 + y1) * crossed;
  }
  if (Math.abs(area) < 1e-12) return [0, 0];
  return [cx / (3 * area), cy / (3 * area)];
}

function distanceToSegmentLine([px, py], [ax, ay], [bx, by]) {
  const length = Math.hypot(bx - ax, by - ay) || 1;
  return Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / length;
}

/**
 * How each face is labelled: where its number sits, which way is "up" for
 * the number, and how much room there is.
 *
 * - The number sits at the face's area centre, not the average of its
 *   corners (they differ on a kite).
 * - "Up" points at a corner for triangles and pentagons, along an edge for
 *   squares (so a d6 reads square to its sides), and at the far tip for a
 *   d10/d100 kite, as on a real die.
 * - `inradius` is the distance from that centre to the nearest edge: the
 *   number is sized to fit inside that circle, so it can never touch an
 *   edge on any shape.
 *
 * The geometry's UVs and the atlas's drawing both use these layouts, so
 * the number is painted exactly where the face is.
 */
export function faceLayouts(solid, { bevel = BEVEL } = {}) {
  const normals = faceNormals(solid);
  const vertexCentroids = faceCentroids(solid);
  const radius = Math.max(...solid.vertices.map((v) => Math.hypot(...v)));
  const inset = Math.max(0, bevel) * radius;

  return solid.faces.map((face, faceIndex) => {
    const normal = normals[faceIndex];
    const origin = vertexCentroids[faceIndex];
    // A provisional basis, only to find the area centre in the plane.
    const tempU = normalise(subtract(subtract(solid.vertices[face[0]], origin), normal.map((value) => value * dot(normal, subtract(solid.vertices[face[0]], origin)))));
    const tempV = cross(normal, tempU);
    const flat = face.map((vertexIndex) => {
      const offset = subtract(solid.vertices[vertexIndex], origin);
      return [dot(offset, tempU), dot(offset, tempV)];
    });
    const [ax, ay] = polygonAreaCentroid(flat);
    const centre = add(origin, add(scaleVector(tempU, ax), scaleVector(tempV, ay)));

    // Which way is up for the number.
    let target;
    if (face.length === 4) {
      const lengths = face.map((vertexIndex, i) => Math.hypot(...subtract(solid.vertices[vertexIndex], solid.vertices[face[(i + 1) % 4]])));
      const square = Math.max(...lengths) - Math.min(...lengths) < 1e-6;
      if (square) {
        target = scaleVector(add(solid.vertices[face[0]], solid.vertices[face[1]]), 0.5);
      } else {
        // Kite: the tip is the corner furthest from the centre.
        target = face
          .map((vertexIndex) => solid.vertices[vertexIndex])
          .reduce((best, vertex) => (Math.hypot(...subtract(vertex, centre)) > Math.hypot(...subtract(best, centre)) ? vertex : best));
      }
    } else {
      target = solid.vertices[face[0]];
    }
    const towards = subtract(target, centre);
    const axisV = normalise(subtract(towards, normal.map((value) => value * dot(normal, towards))));
    const axisU = cross(axisV, normal);

    const planar = (point) => {
      const offset = subtract(point, centre);
      return [dot(offset, axisU), dot(offset, axisV)];
    };
    const corners = face.map((vertexIndex) => planar(solid.vertices[vertexIndex]));
    // The visible face is inset by the bevel; the glow follows that edge.
    const insetCorners = face.map((vertexIndex) => {
      const vertex = solid.vertices[vertexIndex];
      const toCentre = subtract(origin, vertex);
      const distance = Math.hypot(...toCentre) || 1;
      return planar(add(vertex, scaleVector(toCentre, Math.min(0.45, inset / distance))));
    });
    const reach = Math.max(...corners.map(([u, v]) => Math.hypot(u, v))) || 1;
    const inradius = Math.min(...corners.map((corner, i) => distanceToSegmentLine([0, 0], corner, corners[(i + 1) % corners.length])));

    return { face, normal, centre, axisU, axisV, reach, inradius, corners, insetCorners };
  });
}

/**
 * The value at each vertex of a d4, from the value of each face.
 *
 * A real d4 prints the same number at one corner of each of the three
 * faces meeting there, and is read from the corner pointing up. The scene
 * reads a d4 from the face it lands on, so each corner takes the value of
 * the face opposite it: whatever face ends up underneath, its value is the
 * number at the top corner.
 */
export function d4VertexValues(solid, faceValues) {
  const values = new Array(solid.vertices.length).fill(null);
  solid.faces.forEach((face, faceIndex) => {
    const opposite = solid.vertices.findIndex((unused, vertexIndex) => !face.includes(vertexIndex));
    values[opposite] = faceValues[faceIndex];
  });
  return values;
}

/** How a value is printed: a percentile tens die shows 00, 10 ... 90. */
export function labelFor(value, size) {
  if (Number(size) === 100) return Number(value) === 0 ? '00' : String(value);
  return String(value);
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
export function drawFaceAtlas(faceValues, {
  columns, cellPixels, body, ink, size, corners = 4, layouts = null, solid = null, glow = DEFAULT_GLOW,
}) {
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
  const d4Values = Number(size) === 4 && layouts && solid ? d4VertexValues(solid, faceValues) : null;

  // Engraved numeral: a darker lip below each stroke, a faint highlight
  // above, then the ink. 6 and 9 get an underline where a lone digit could
  // be read upside down.
  const engrave = (text, x, y, glyphPx, rotation = 0) => {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.font = `700 ${glyphPx}px Manrope, Inter, system-ui, sans-serif`;
    const depth = Math.max(1, glyphPx * 0.045);
    const paint = (colour, dx, dy) => {
      context.fillStyle = colour;
      context.strokeStyle = colour;
      context.fillText(text, dx, dy);
      if (text === '6' || text === '9') {
        const width = glyphPx * 0.3;
        const underlineY = dy + glyphPx * 0.6;
        context.lineWidth = Math.max(2, glyphPx * 0.07);
        context.beginPath();
        context.moveTo(dx - width, underlineY);
        context.lineTo(dx + width, underlineY);
        context.stroke();
      }
    };
    paint(highlight, -depth * 0.6, -depth * 0.6);
    paint(lip, depth, depth);
    paint(ink, 0, 0);
    context.restore();
  };

  // The biggest font size whose text box fits inside a circle of radius r.
  const fitGlyph = (text, radiusPx) => {
    let glyphPx = Math.max(8, Math.floor(radiusPx * 1.5));
    for (let guard = 0; guard < 40; guard += 1) {
      context.font = `700 ${glyphPx}px Manrope, Inter, system-ui, sans-serif`;
      const width = context.measureText(text).width || glyphPx * 0.6 * text.length;
      const height = glyphPx * ((text === '6' || text === '9') ? 0.95 : 0.74);
      if (Math.hypot(width / 2, height / 2) <= radiusPx) break;
      glyphPx = Math.floor(glyphPx * 0.92);
    }
    return glyphPx;
  };

  faceValues.forEach((value, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const centreX = (column + 0.5) * cellPixels;
    const centreY = (row + 0.5) * cellPixels;
    const layout = layouts?.[index];

    if (!layout) {
      // Legacy sizing, kept for callers that do not pass layouts.
      const digits = String(value).length;
      const fit = digits > 2 ? 0.62 : digits > 1 ? 0.8 : 1;
      const scale = (kite ? KITE_SCALE : (GLYPH_SCALE[corners] || 0.46)) * fit;
      engrave(labelFor(value, size), centreX, centreY, Math.round(cellPixels * scale));
      return;
    }

    // Face units to pixels: the face's furthest corner reaches CELL_PADDING
    // of the way to the cell edge, matching the UVs in buildDieGeometry.
    const unit = (cellPixels * 0.5 * CELL_PADDING) / layout.reach;
    const toPixel = ([u, v]) => [centreX + u * unit, centreY - v * unit];

    // Inner glow: a soft orange light along the visible edge, clipped to the
    // face so it only falls inwards -- the same look as the sheet's boxes.
    if (glow) {
      const edge = layout.insetCorners.map(toPixel);
      context.save();
      context.beginPath();
      edge.forEach(([x, y], i) => (i ? context.lineTo(x, y) : context.moveTo(x, y)));
      context.closePath();
      context.clip();
      context.strokeStyle = glow;
      context.shadowColor = glow;
      context.shadowBlur = layout.inradius * unit * 0.35;
      context.lineJoin = 'round';
      context.globalAlpha = 0.55;
      context.lineWidth = layout.inradius * unit * 0.22;
      context.stroke();
      context.globalAlpha = 0.9;
      context.shadowBlur = 0;
      context.lineWidth = Math.max(1.5, layout.inradius * unit * 0.05);
      context.stroke();
      context.restore();
    }

    if (d4Values) {
      // A d4 face carries the value of each corner, near that corner and
      // upright towards it, like a printed d4.
      layout.face.forEach((vertexIndex, cornerIndex) => {
        const [u, v] = layout.corners[cornerIndex];
        const at = [u * 0.5, v * 0.5];
        const [x, y] = toPixel(at);
        const rotation = Math.atan2(u, v); // canvas: rotate so "up" faces the corner
        const text = labelFor(d4Values[vertexIndex], size);
        engrave(text, x, y, fitGlyph(text, layout.inradius * unit * 0.42), rotation);
      });
      return;
    }

    const text = labelFor(value, size);
    engrave(text, centreX, centreY, fitGlyph(text, layout.inradius * unit * 0.86));
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
export function buildDieGeometry(solid, columns, { bevel = BEVEL, edgeColor = [1, 1, 1], layouts = null } = {}) {
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
    // Labelled faces map from their label centre and upright axes (see
    // faceLayouts), so the number lands centred and the right way up.
    const layout = layouts?.[faceIndex];
    const basis = layout || faceBasis(normal, solid.vertices, face, centroid);
    const { axisU, axisV } = basis;
    const origin = layout ? layout.centre : centroid;

    // UVs are measured from the ORIGINAL corners, so the numeral keeps its
    // size and place; the inset corners simply sample slightly inside it.
    const planarOf = (point) => {
      const offset = subtract(point, origin);
      return [dot(offset, axisU), dot(offset, axisV)];
    };
    const reach = layout ? layout.reach : (Math.max(...face.map((vertexIndex) => Math.hypot(...planarOf(solid.vertices[vertexIndex])))) || 1);
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
