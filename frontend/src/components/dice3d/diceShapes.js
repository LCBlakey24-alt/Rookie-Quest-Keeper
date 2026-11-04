/**
 * Polyhedron data for the physical dice set.
 *
 * Each solid is described by its vertices alone. The faces are then derived
 * from the convex hull, because hand-written face lists are easy to get
 * subtly wrong: an early version of this file had two non-planar
 * dodecahedron faces and two vertices used the wrong number of times, which
 * would have made "which face is pointing up" quietly incorrect. Deriving
 * them makes that class of mistake impossible, and the derivation is checked
 * by diceShapes.test.js for every die.
 *
 * One description serves three jobs -- the render mesh, the cannon-es
 * collision hull, and reading the settled face -- so what you see, what
 * collides and what is read can never drift apart.
 *
 * Vertices are unit-ish coordinates about the origin. Scaling happens once,
 * in the scene, so the hull and the mesh are always scaled together.
 */

// Golden ratio, which places the vertices of the icosahedron, the
// dodecahedron and the d10's waist.
const PHI = (1 + Math.sqrt(5)) / 2;

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalise(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * Derive a convex solid's faces from its vertices.
 *
 * A plane through three vertices is a face when every other vertex lies on
 * one side of it. The vertices lying in that plane are the face, and sorting
 * them by angle about the outward normal gives a counter-clockwise winding
 * seen from outside -- which is what makes the computed normals point out.
 */
function facesFromHull(vertices, tolerance = 1e-9) {
  const seen = new Map();

  for (let i = 0; i < vertices.length; i += 1) {
    for (let j = i + 1; j < vertices.length; j += 1) {
      for (let k = j + 1; k < vertices.length; k += 1) {
        const normal = cross(subtract(vertices[j], vertices[i]), subtract(vertices[k], vertices[i]));
        if (Math.hypot(...normal) < tolerance) continue; // collinear

        const unit = normalise(normal);
        const offset = dot(unit, vertices[i]);

        let above = 0;
        let below = 0;
        const onPlane = [];
        vertices.forEach((vertex, index) => {
          const distance = dot(unit, vertex) - offset;
          if (distance > tolerance) above += 1;
          else if (distance < -tolerance) below += 1;
          else onPlane.push(index);
        });

        // A supporting plane has everything on one side. If the solid sits
        // below the plane the normal already points out; otherwise flip it.
        if (above > 0 && below > 0) continue;
        const outward = above > 0 ? unit.map((value) => -value) : unit;

        const key = [...onPlane].sort((a, b) => a - b).join(',');
        if (seen.has(key)) continue;

        // Sort the face's vertices by angle in the face plane.
        const origin = vertices[onPlane[0]];
        const axisU = normalise(subtract(origin, outward.map((value) => value * dot(outward, origin))));
        const axisV = cross(outward, axisU);
        const wound = [...onPlane].sort((left, right) => {
          const a = vertices[left];
          const b = vertices[right];
          return Math.atan2(dot(a, axisV), dot(a, axisU)) - Math.atan2(dot(b, axisV), dot(b, axisU));
        });

        seen.set(key, wound);
      }
    }
  }

  return [...seen.values()];
}

function tetrahedronVertices() {
  return [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
}

function cubeVertices() {
  return [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];
}

function octahedronVertices() {
  return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
}

function dodecahedronVertices() {
  const r = 1 / PHI;
  return [
    [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
    [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
    [0, -r, -PHI], [0, -r, PHI], [0, r, -PHI], [0, r, PHI],
    [-r, -PHI, 0], [-r, PHI, 0], [r, -PHI, 0], [r, PHI, 0],
    [-PHI, 0, -r], [PHI, 0, -r], [-PHI, 0, r], [PHI, 0, r],
  ];
}

function icosahedronVertices() {
  return [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
  ];
}

/**
 * A pentagonal trapezohedron: the real ten-sided die, with ten kite faces
 * rather than the ten triangles of the bipyramid some web dice settle for.
 *
 * The kites are planar at exactly one waist height. Requiring an apex, its
 * two same-side equatorial neighbours and the opposite-side tip to be
 * coplanar gives h = (2 - PHI) / (2 + PHI) for apexes at z = +/-1. The
 * widely copied 0.105 is that value rounded, and it leaves the faces about
 * 1e-3 out of plane -- enough to tilt the face normals and so to misread
 * which face settled upwards.
 */
function trapezohedronVertices() {
  const waist = (2 - PHI) / (2 + PHI);
  const vertices = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10;
    vertices.push([Math.cos(angle), Math.sin(angle), index % 2 === 0 ? waist : -waist]);
  }
  vertices.push([0, 0, 1]);
  vertices.push([0, 0, -1]);
  return vertices;
}

function solidFrom(vertexBuilder) {
  const vertices = vertexBuilder();
  return { vertices, faces: facesFromHull(vertices) };
}

const BUILDERS = {
  4: tetrahedronVertices,
  6: cubeVertices,
  8: octahedronVertices,
  10: trapezohedronVertices,
  12: dodecahedronVertices,
  20: icosahedronVertices,
  100: trapezohedronVertices,
};

// Hull derivation is O(n^3) in the vertex count. That is trivial at these
// sizes, but the result never changes, so each solid is built once.
const solidCache = new Map();

function solidForSides(sides) {
  if (!solidCache.has(sides)) solidCache.set(sides, solidFrom(BUILDERS[sides]));
  return solidCache.get(sides);
}

function sequence(count) {
  return Array.from({ length: count }, (unused, index) => index + 1);
}

/**
 * How each die is read.
 *
 * Everything but the d4 is read from the face pointing up.
 *
 * A tetrahedron has no upward face -- it rests on one, with a vertex up --
 * so a d4 is read from the face against the table, like a bottom-read
 * physical d4. A consequence worth knowing: the number is underneath, so
 * the player cannot read a d4's result off the die in the tray, only from
 * the result panel. Reading it from above is not an option, because the
 * three upward faces of a resting tetrahedron are tied, and picking one
 * would be arbitrary. Apex-numbered d4s, which carry the value at all three
 * corners of each face, would show it; that needs three labels per face
 * rather than one and is not done here.
 *
 * A d100 is the tens die of a percentile pair and reads 10, 20 ... 100.
 */
export const DICE_SHAPES = {
  4: { sides: 4, values: sequence(4), readFace: 'down' },
  6: { sides: 6, values: sequence(6), readFace: 'up' },
  8: { sides: 8, values: sequence(8), readFace: 'up' },
  10: { sides: 10, values: sequence(10), readFace: 'up' },
  12: { sides: 12, values: sequence(12), readFace: 'up' },
  20: { sides: 20, values: sequence(20), readFace: 'up' },
  100: { sides: 100, values: sequence(10).map((value) => value * 10), readFace: 'up' },
};

Object.keys(BUILDERS).forEach((key) => {
  DICE_SHAPES[key].build = () => solidForSides(Number(key));
});

export const SUPPORTED_SIDES = Object.keys(DICE_SHAPES).map(Number).sort((a, b) => a - b);

/** The shape a die with this many sides is rolled as, or null. */
export function shapeForSides(sides) {
  return DICE_SHAPES[Number(sides)] || null;
}

/**
 * True when the app can show this die as a real polyhedron.
 *
 * Anything else -- a homebrew d7, say -- is still a legal roll in the
 * engine, so the caller falls back to the flat overlay rather than inventing
 * a shape for it.
 */
export function canRenderSides(sides) {
  return Boolean(shapeForSides(sides));
}

/** The outward unit normal of each face, in face order. */
export function faceNormals({ vertices, faces }) {
  return faces.map((face) => {
    const [a, b, c] = [vertices[face[0]], vertices[face[1]], vertices[face[2]]];
    return normalise(cross(subtract(b, a), subtract(c, a)));
  });
}

/** The centroid of each face, in face order. */
export function faceCentroids({ vertices, faces }) {
  return faces.map((face) => {
    const sum = face.reduce(
      (acc, index) => [
        acc[0] + vertices[index][0],
        acc[1] + vertices[index][1],
        acc[2] + vertices[index][2],
      ],
      [0, 0, 0],
    );
    return [sum[0] / face.length, sum[1] / face.length, sum[2] / face.length];
  });
}
