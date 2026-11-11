/**
 * Where each die face's number goes, the d4's corner numbers, and the
 * percentile pair a d100 is thrown as.
 */
import { DICE_SHAPES, faceNormals } from './diceShapes';
import { d4VertexValues, faceLayouts, labelFor } from './dieMesh';
import { expandPercentileDice, specForDie } from './diceTrayScene';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v) => Math.hypot(...v);

function insidePolygon([x, y], corners) {
  // Convex polygon: the point is on the same side of every edge.
  let sign = 0;
  for (let i = 0; i < corners.length; i += 1) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[(i + 1) % corners.length];
    const side = Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax));
    if (side === 0) continue;
    if (sign && side !== sign) return false;
    sign = side;
  }
  return true;
}

describe('every number sits centred inside its face, the right way up', () => {
  test.each([4, 6, 8, 10, 12, 20, 100])('d%s', (sides) => {
    const solid = DICE_SHAPES[sides].build();
    const normals = faceNormals(solid);
    faceLayouts(solid).forEach((layout, index) => {
      // The label centre lies in the face's plane and inside the face.
      const offset = sub(layout.centre, solid.vertices[layout.face[0]]);
      expect(Math.abs(dot(offset, normals[index]))).toBeLessThan(1e-9);
      expect(insidePolygon([0, 0], layout.corners)).toBe(true);
      // Room for a number, and the upright axes are a proper in-plane basis.
      expect(layout.inradius).toBeGreaterThan(0.05);
      expect(Math.abs(dot(layout.axisU, layout.axisV))).toBeLessThan(1e-9);
      expect(Math.abs(dot(layout.axisV, normals[index]))).toBeLessThan(1e-9);
      expect(len(layout.axisU)).toBeCloseTo(1);
    });
  });

  test('d10 and d100 numbers point at the kite tip, as on a real die', () => {
    [10, 100].forEach((sides) => {
      const solid = DICE_SHAPES[sides].build();
      faceLayouts(solid).forEach((layout) => {
        const tip = layout.corners.reduce((best, c) => (Math.hypot(...c) > Math.hypot(...best) ? c : best));
        expect(tip[0]).toBeCloseTo(0, 6); // straight up the number's axis
        expect(tip[1]).toBeGreaterThan(0);
      });
    });
  });

  test('d6 numbers sit square to the edges', () => {
    faceLayouts(DICE_SHAPES[6].build()).forEach((layout) => {
      const [[u0, v0], [u1, v1]] = layout.corners;
      expect(v0).toBeCloseTo(v1, 9); // the top edge is horizontal for the number
      expect(u0).not.toBeCloseTo(u1, 3);
    });
  });
});

describe('the d4 is read from the corner pointing up', () => {
  test('each corner shows the value of the face opposite it, so the face underneath names the top corner', () => {
    const solid = DICE_SHAPES[4].build();
    const faceValues = [3, 1, 4, 2];
    const corners = d4VertexValues(solid, faceValues);
    solid.faces.forEach((face, faceIndex) => {
      const top = solid.vertices.findIndex((unused, vertex) => !face.includes(vertex));
      expect(corners[top]).toBe(faceValues[faceIndex]);
    });
    expect([...corners].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('d100 is thrown as a tens die and a units die', () => {
  test.each([
    [37, 30, 7], [40, 40, 0], [5, 0, 5], [100, 0, 0], [1, 0, 1], [99, 90, 9],
  ])('%s is %s + %s', (total, tens, units) => {
    const [tensDie, unitsDie] = expandPercentileDice([{ sides: 100, result: total }]);
    expect(tensDie).toMatchObject({ sides: 100, result: tens, percentile: 'tens' });
    expect(unitsDie).toMatchObject({ sides: 10, result: units, percentile: 'units' });
    // Both can be thrown in 3D; before, anything but a multiple of ten fell back to the flat card.
    expect(specForDie(tensDie)).not.toBeNull();
    expect(specForDie(unitsDie)).not.toBeNull();
  });

  test('other dice pass through untouched', () => {
    const dice = [{ sides: 20, result: 13 }, { sides: 6, result: 2, dropped: true }];
    expect(expandPercentileDice(dice)).toEqual(dice);
  });

  test('the tens die prints 00 for zero', () => {
    expect(labelFor(0, 100)).toBe('00');
    expect(labelFor(70, 100)).toBe('70');
    expect(labelFor(0, 10)).toBe('0');
  });
});
