import { DICE_SHAPES, SUPPORTED_SIDES, canRenderSides, faceCentroids, faceNormals, shapeForSides } from './diceShapes';

const EXPECTED = {
  4: { faces: 4, cornersPerFace: 3 },
  6: { faces: 6, cornersPerFace: 4 },
  8: { faces: 8, cornersPerFace: 3 },
  10: { faces: 10, cornersPerFace: 4 },
  12: { faces: 12, cornersPerFace: 5 },
  20: { faces: 20, cornersPerFace: 3 },
  100: { faces: 10, cornersPerFace: 4 },
};

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe.each(SUPPORTED_SIDES)('the d%s solid', (sides) => {
  const solid = DICE_SHAPES[sides].build();
  const normals = faceNormals(solid);
  const centroids = faceCentroids(solid);

  test('has one face per value', () => {
    expect(solid.faces).toHaveLength(EXPECTED[sides].faces);
    expect(DICE_SHAPES[sides].values).toHaveLength(EXPECTED[sides].faces);
  });

  test('has the right polygon for its shape', () => {
    // A d10 read as kites rather than triangles is the difference between a
    // real trapezohedron and the bipyramid some web dice settle for.
    solid.faces.forEach((face) => {
      expect(face).toHaveLength(EXPECTED[sides].cornersPerFace);
    });
  });

  test('is planar to floating-point precision', () => {
    // A face even 1e-3 out of plane tilts its normal, which is what decides
    // the number read off a settled die.
    solid.faces.forEach((face, index) => {
      face.forEach((vertexIndex) => {
        const offset = solid.vertices[vertexIndex].map((value, axis) => value - centroids[index][axis]);
        expect(Math.abs(dot(normals[index], offset))).toBeLessThan(1e-9);
      });
    });
  });

  test('winds every face so its normal points outwards', () => {
    normals.forEach((normal, index) => {
      expect(dot(normal, centroids[index])).toBeGreaterThan(0);
    });
  });

  test('uses every vertex, and no face twice', () => {
    const used = new Set(solid.faces.flat());
    expect(used.size).toBe(solid.vertices.length);

    const signatures = solid.faces.map((face) => [...face].sort((a, b) => a - b).join(','));
    expect(new Set(signatures).size).toBe(solid.faces.length);
  });

  test('gives every face a distinct direction', () => {
    normals.forEach((normal, index) => {
      normals.slice(index + 1).forEach((other) => {
        expect(dot(normal, other)).toBeLessThan(0.9999);
      });
    });
  });
});

describe('shape lookup', () => {
  test('covers the dice the roller offers', () => {
    [4, 6, 8, 10, 12, 20, 100].forEach((sides) => {
      expect(canRenderSides(sides)).toBe(true);
    });
  });

  test('declines a die it has no solid for, rather than inventing one', () => {
    // A homebrew d7 is a legal roll in the engine; the caller falls back to
    // the flat overlay instead of showing a made-up shape.
    expect(canRenderSides(7)).toBe(false);
    expect(shapeForSides(7)).toBeNull();
  });

  test('reads a d4 from the face it rests on', () => {
    expect(DICE_SHAPES[4].readFace).toBe('down');
    expect(DICE_SHAPES[20].readFace).toBe('up');
  });

  test('reads a d100 tens die as 00 to 90', () => {
    expect(DICE_SHAPES[100].values).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });
});
