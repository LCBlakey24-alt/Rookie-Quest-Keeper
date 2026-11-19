/**
 * The dice tower: a tube the dice are dropped into, two baffles that tumble
 * them on the way down, and a ramp that pours them out onto the ordinary
 * tray floor in front of it.
 *
 * Four shapes share that base (walls, glass front, ramp and mouth) and
 * differ only above it:
 *   classic -- two baffles
 *   spiral  -- a helix ramp round a central pole, inside a round wall
 *   funnel  -- a cone the dice swirl down, then one baffle
 *   pegs    -- rows of bars and wall deflectors the dice bounce between
 * Every shape pours out of the same mouth onto the same tray, so the rest
 * of the scene (reading faces, the camera, the reveal) is shared.
 *
 * Only physics and fixed dimensions live here. The tower's looks are
 * built by towerSkins.js around these same dimensions, so every design
 * shares one animation: same tube, same baffles, same tray, same drop.
 *
 * Coordinates match diceTrayScene: the tray floor is y = 0, the tray runs
 * from -TRAY_HALF to +TRAY_HALF in x and z, and the camera looks from +z.
 * The tower stands behind the tray (negative z) and opens into the middle
 * of its back wall.
 */

import * as CANNON from 'cannon-es';

export const TRAY_HALF = 3.5;

export const TOWER = Object.freeze({
  /** Inside width of the tube (x). */
  width: 4.2,
  /** Inside depth of the tube (z), front face at the tray's back wall. */
  depth: 4.0,
  /** Height of the tube's top edge. */
  top: 14.5,
  /** Height of the mouth the dice leave through at the bottom front. */
  mouth: 3.4,
  /** Wall thickness used for every collider (and the visual panels). */
  wall: 0.3,
  /** Tray wall height, so a lively die cannot hop out of the tray. */
  trayWall: 7.5,
  /** z of the tube's front face (the tray's back wall). */
  get front() { return -TRAY_HALF; },
  /** z of the tube's back face. */
  get back() { return -TRAY_HALF - this.depth; },
});

/*
 * Baffles, top to bottom. Each is a plank fixed to one wall, sloping down
 * towards the other, and stopping short of it by more than a die's width
 * (dice are about 1.8 across), so nothing can wedge in the gap.
 *
 *   from: the wall it is fixed to ('back' or 'front')
 *   y:    height where it meets that wall
 *   reach: share of the tube's depth it covers
 *   tilt: slope in radians
 */
export const BAFFLES = Object.freeze([
  { from: 'back', y: 10.8, reach: 0.46, tilt: 0.72 },
  { from: 'front', y: 7.0, reach: 0.46, tilt: 0.72 },
]);

/** The ramp under the tube, sloping forward out of the mouth. */
export const RAMP = Object.freeze({ backY: 3.9, frontY: 0.7 });

/** The tower's throw takes longer than the tray's, so its limits do too. */
export const TOWER_LIMITS = Object.freeze({ maxSteps: 960, quickSteps: 520 });

/** The tower shapes, and the rig name the scene uses for each. */
export const TOWER_SHAPES = Object.freeze(['classic', 'spiral', 'funnel', 'pegs']);
export function towerRigFor(shape) {
  return !shape || shape === 'classic' ? 'tower' : `tower:${shape}`;
}
export function isTowerRig(rig) {
  return typeof rig === 'string' && (rig === 'tower' || rig.startsWith('tower:'));
}
export function towerShapeOf(rig) {
  const shape = isTowerRig(rig) && rig.includes(':') ? rig.split(':')[1] : 'classic';
  return TOWER_SHAPES.includes(shape) ? shape : 'classic';
}

/*
 * The inside of the tube: the back wall's face is TOWER.back, the glass
 * front's inner face is TOWER.front - wall. The new shapes are centred on
 * this, so nothing they add reaches into the glass.
 */
const INNER_FRONT = TOWER.front - TOWER.wall;
export const TOWER_MID_Z = (INNER_FRONT + TOWER.back) / 2;
const MID_Z = TOWER_MID_Z;

/** Spiral: a helix ramp round a pole, inside a ring wall. Angles run so the helix ends at the front. */
const HELIX_TURNS = 1.0;
export const HELIX = Object.freeze({
  top: 12.0, bottom: 5.0, turns: HELIX_TURNS, segments: 44, inner: 0.2, outer: 1.8, pole: 0.15,
  start: Math.PI / 2 - HELIX_TURNS * Math.PI * 2,
});

/** Funnel: a cone from the rim down to a hole, then the lower (front) baffle. */
export const FUNNEL = Object.freeze({ rimY: 10.5, holeY: 9.75, rim: 1.8, hole: 1.15, panels: 20 });

/** Pegs: bars across the tube (A rows) and deflectors on both walls (B rows). */
export const PEG_ROWS = Object.freeze([
  { kind: 'bar', y: 11.2 },
  { kind: 'deflect', y: 9.6 },
  { kind: 'bar', y: 8.0 },
  { kind: 'deflect', y: 6.4 },
]);
export const PEG_RADIUS = 0.15;
const DEFLECT_REACH = 0.5;

/** Quaternion [x, y, z, w] for a rotation whose local x, y, z axes are the given unit vectors. */
export function basisQuaternion(ax, ay, az) {
  const [m00, m10, m20] = ax; const [m01, m11, m21] = ay; const [m02, m12, m22] = az;
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
  return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
}
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit3 = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); };

/** A ring of upright boxes of radius r round the tube's axis, from y0 to y1. */
function ringWall(r, y0, y1, count = 20) {
  const half = [0.05, (y1 - y0) / 2, Math.PI * r / count + 0.04];
  return Array.from({ length: count }, (unused, i) => {
    const angle = ((i + 0.5) / count) * Math.PI * 2;
    // Local x points outwards; rotate about y.
    const quaternion = [0, Math.sin(-angle / 2), 0, Math.cos(-angle / 2)];
    return { part: 'ring', centre: [Math.cos(angle) * r, (y0 + y1) / 2, MID_Z + Math.sin(angle) * r], half, quaternion };
  });
}

function helixBoxes() {
  const { top, bottom, turns, segments, inner, outer, start } = HELIX;
  const step = (turns * Math.PI * 2) / segments;
  const drop = (top - bottom) / segments;
  const mid = (inner + outer) / 2;
  const slope = Math.atan(drop / (step * 1.2));
  const boxes = [];
  for (let k = 0; k < segments; k += 1) {
    const angle = start + (k + 0.5) * step;
    const tangent = [-Math.sin(angle), 0, Math.cos(angle)];
    const radial = [Math.cos(angle), 0, Math.sin(angle)];
    const along = unit3([tangent[0] * Math.cos(slope), -Math.sin(slope), tangent[2] * Math.cos(slope)]);
    const up = unit3(cross3(along, radial));
    const side = cross3(along, up);
    boxes.push({
      part: 'helix',
      centre: [Math.cos(angle) * mid, top - (k + 0.5) * drop, MID_Z + Math.sin(angle) * mid],
      half: [(step * outer) / 2 + 0.04, 0.07, (outer - inner) / 2],
      quaternion: basisQuaternion(along, up, side),
    });
  }
  return [...boxes, ...ringWall(HELIX.outer + 0.05, bottom - 0.4, top + 1.2)];
}

function funnelBoxes() {
  const { rimY, holeY, rim, hole, panels } = FUNNEL;
  const beta = Math.atan((rimY - holeY) / (rim - hole));
  const length = Math.hypot(rim - hole, rimY - holeY);
  const mid = (rim + hole) / 2;
  const boxes = [];
  for (let i = 0; i < panels; i += 1) {
    const angle = ((i + 0.5) / panels) * Math.PI * 2;
    const inward = [-Math.cos(angle) * Math.cos(beta), -Math.sin(beta), -Math.sin(angle) * Math.cos(beta)];
    const tangent = [-Math.sin(angle), 0, Math.cos(angle)];
    const normal = unit3(cross3(tangent, inward));
    boxes.push({
      part: 'funnel',
      centre: [Math.cos(angle) * mid, (rimY + holeY) / 2, MID_Z + Math.sin(angle) * mid],
      half: [length / 2, 0.05, (Math.PI * rim) / panels + 0.05],
      quaternion: basisQuaternion(inward, normal, cross3(inward, normal)),
    });
  }
  return [...boxes, ...ringWall(rim + 0.03, rimY - 0.1, rimY + 1.6)];
}

function pegDeflectors() {
  const { wall, front, back } = TOWER;
  const halfW = TOWER.width / 2;
  const length = DEFLECT_REACH * Math.SQRT2;
  return PEG_ROWS.filter((row) => row.kind === 'deflect').flatMap((row) => [
    // Back wall: the inner (+z) end lower.
    { part: 'deflector', centre: [0, row.y, back + DEFLECT_REACH / 2], half: [halfW, wall / 2, length / 2], rotationX: Math.PI / 4 },
    // Front (glass) wall: the inner (-z) end lower.
    { part: 'deflector', centre: [0, row.y, INNER_FRONT - DEFLECT_REACH / 2], half: [halfW, wall / 2, length / 2], rotationX: -Math.PI / 4 },
  ]);
}

/**
 * Round colliders: the pegs' bars, across the tube along x.
 * { centre, radius, length, axis: 'x' | 'y' }.
 */
export function towerCylinders(shape = 'classic') {
  if (shape === 'pegs') {
    return PEG_ROWS.filter((row) => row.kind === 'bar').map((row) => ({ part: 'peg', centre: [0, row.y, MID_Z], radius: PEG_RADIUS, length: TOWER.width, axis: 'x' }));
  }
  // The spiral's glowing core is drawn but is not a collider: a d4 (the
  // biggest die) only just fits between a pole and the wall and could wedge.
  // The gap in the helix's middle is far narrower than any die.
  return [];
}

/** Where a baffle plank sits: centre, length and rotation about x. */
export function bafflePlank(baffle) {
  const { depth, front, back } = TOWER;
  const length = depth * baffle.reach;
  // Run along z from the wall it is fixed to, dropping as it goes.
  const dz = Math.cos(baffle.tilt) * length;
  const dy = Math.sin(baffle.tilt) * length;
  const fromBack = baffle.from === 'back';
  const startZ = fromBack ? back : front;
  const endZ = fromBack ? startZ + dz : startZ - dz;
  return {
    centre: [0, baffle.y - dy / 2, (startZ + endZ) / 2],
    length,
    // Rotating +x tips the +z end down: a back baffle falls forwards.
    rotationX: fromBack ? baffle.tilt : -baffle.tilt,
  };
}

/** The ramp plank, from the back wall at backY down to the mouth. */
export function rampPlank() {
  const { depth, front, back } = TOWER;
  const drop = RAMP.backY - RAMP.frontY;
  return {
    centre: [0, (RAMP.backY + RAMP.frontY) / 2, (front + back) / 2],
    length: Math.hypot(depth, drop),
    rotationX: Math.atan2(drop, depth),
  };
}

/**
 * Every solid box of the rig as { centre, half: [x, y, z], rotationX }.
 * The physics and the visible base are both built from this one list, so
 * what is seen is exactly what the dice hit.
 */
export function towerBoxes(shape = 'classic') {
  const { width, depth, top, mouth, wall, trayWall, front, back } = TOWER;
  const halfW = width / 2;
  const sideSpan = TRAY_HALF - halfW;
  const boxes = [
    // The tray's back wall, either side of the tube.
    { part: 'tray-back', centre: [-(halfW + sideSpan / 2), trayWall / 2, front - wall / 2], half: [sideSpan / 2, trayWall / 2, wall / 2] },
    { part: 'tray-back', centre: [halfW + sideSpan / 2, trayWall / 2, front - wall / 2], half: [sideSpan / 2, trayWall / 2, wall / 2] },
    // The tube's front, above the mouth. It is the glass the viewer looks through.
    { part: 'front', centre: [0, (mouth + top) / 2, front - wall / 2], half: [halfW + wall, (top - mouth) / 2, wall / 2] },
    // Sides and back.
    { part: 'side', centre: [-(halfW + wall / 2), top / 2, (front + back) / 2], half: [wall / 2, top / 2, depth / 2] },
    { part: 'side', centre: [halfW + wall / 2, top / 2, (front + back) / 2], half: [wall / 2, top / 2, depth / 2] },
    { part: 'back', centre: [0, top / 2, back - wall / 2], half: [halfW + wall, top / 2, wall / 2] },
  ];
  const baffles = shape === 'classic' ? BAFFLES : shape === 'funnel' ? BAFFLES.filter((b) => b.from === 'front') : [];
  baffles.forEach((baffle) => {
    const plank = bafflePlank(baffle);
    boxes.push({ part: 'baffle', centre: plank.centre, half: [halfW, wall / 2, plank.length / 2], rotationX: plank.rotationX });
  });
  const ramp = rampPlank();
  boxes.push({ part: 'ramp', centre: ramp.centre, half: [halfW, wall / 2, ramp.length / 2], rotationX: ramp.rotationX });
  if (shape === 'spiral') boxes.push(...helixBoxes());
  if (shape === 'funnel') boxes.push(...funnelBoxes());
  if (shape === 'pegs') boxes.push(...pegDeflectors());
  return boxes;
}

/*
 * The inside of a tower is smooth and slippery, so dice slide off a baffle
 * instead of resting on it. This only applies where a die meets the tower;
 * the tray floor keeps the tray's own grip, so dice still settle there.
 */
export const TOWER_FRICTION = 0.04;
export const TOWER_RESTITUTION = 0.3;

/**
 * Add the tower to a physics world that already has the tray floor and its
 * front and side walls. Returns the material dice need so the tower's
 * slippery contact applies to them.
 */
export function addTowerColliders(world, shape = 'classic') {
  const towerMaterial = new CANNON.Material('tower');
  const diceMaterial = new CANNON.Material('tower-die');
  world.addContactMaterial(new CANNON.ContactMaterial(towerMaterial, diceMaterial, {
    friction: TOWER_FRICTION,
    restitution: TOWER_RESTITUTION,
  }));
  towerBoxes(shape).forEach(({ centre, half, rotationX = 0, quaternion }) => {
    const body = new CANNON.Body({ mass: 0, material: towerMaterial, shape: new CANNON.Box(new CANNON.Vec3(...half)) });
    body.position.set(...centre);
    if (quaternion) body.quaternion.set(...quaternion);
    else if (rotationX) body.quaternion.setFromEuler(rotationX, 0, 0);
    world.addBody(body);
  });
  towerCylinders(shape).forEach(({ centre, radius, length, axis }) => {
    // cannon-es cylinders stand along y; a bar across the tube is turned onto x.
    const body = new CANNON.Body({ mass: 0, material: towerMaterial, shape: new CANNON.Cylinder(radius, radius, length, 16) });
    body.position.set(...centre);
    if (axis === 'x') body.quaternion.setFromEuler(0, 0, Math.PI / 2);
    world.addBody(body);
  });
  return diceMaterial;
}

/*
 * Dice start at the top of the tube, over its back half so they land on
 * the first baffle. Up to four sit side by side in a layer (two across,
 * two deep); further dice stack in layers above. They are dropped, not
 * thrown: a small sideways nudge and a spin are all the variety needed,
 * because the baffles do the tumbling.
 */
const LAYER_SLOTS = [[-1.0, -0.35], [1.0, 0.35]];
const LAYER_GAP = 2.5;
const FIRST_LAYER_Y = 12.4;

export function towerStart(index, random, shape = 'classic') {
  const spin = [(random() - 0.5) * 16, (random() - 0.5) * 16, (random() - 0.5) * 16];
  if (shape === 'spiral') {
    // Stacked over the top of the helix, nudged along it.
    const angle = HELIX.start + 0.2;
    const r = (HELIX.inner + HELIX.outer) / 2 + 0.25;
    return {
      position: [Math.cos(angle) * r + (random() - 0.5) * 0.1, HELIX.top + 1.3 + index * 1.9, MID_Z + Math.sin(angle) * r + (random() - 0.5) * 0.1],
      velocity: [-Math.sin(angle) * 1.5, -1, Math.cos(angle) * 1.5],
      spin,
    };
  }
  if (shape === 'funnel') {
    // Round the rim, one above another so they reach the hole in turn,
    // sent spinning round the cone.
    const angle = index * 2.4 + random() * 0.4;
    const r = FUNNEL.rim - 0.85;
    const speed = 3 + random();
    return {
      position: [Math.cos(angle) * r, FUNNEL.rimY + 0.9 + index * 1.7, MID_Z + Math.sin(angle) * r],
      velocity: [-Math.sin(angle) * speed, -0.5, Math.cos(angle) * speed],
      spin,
    };
  }
  const [slotX, slotZ] = LAYER_SLOTS[index % LAYER_SLOTS.length];
  const layer = Math.floor(index / LAYER_SLOTS.length);
  const middleZ = (TOWER.back + TOWER.front) / 2;
  return {
    position: [
      slotX + (random() - 0.5) * 0.18,
      FIRST_LAYER_Y + layer * LAYER_GAP + random() * 0.3,
      // Classic: over the back baffle, so the first bounce sends them
      // forwards. Pegs: just off the top bar, so they glance off it.
      (shape === 'pegs' ? MID_Z + 0.35 : middleZ - 0.65) + slotZ + (random() - 0.5) * 0.18,
    ],
    velocity: [(random() - 0.5) * 0.8, -1 - random(), (random() - 0.5) * 0.6],
    spin,
  };
}

/** The tallest stack of dice the tube is built for; larger pools use the tray. */
export const TOWER_MAX_DICE = 8;

/** Did this die come out of the tower and into the tray? */
export function inTray([x, z]) {
  return z > TOWER.front + 0.2 && Math.abs(x) < TRAY_HALF && z < TRAY_HALF;
}
