/**
 * The dice tower: a tube the dice are dropped into, two baffles that tumble
 * them on the way down, and a ramp that pours them out onto the ordinary
 * tray floor in front of it.
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
export function towerBoxes() {
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
  BAFFLES.forEach((baffle) => {
    const plank = bafflePlank(baffle);
    boxes.push({ part: 'baffle', centre: plank.centre, half: [halfW, wall / 2, plank.length / 2], rotationX: plank.rotationX });
  });
  const ramp = rampPlank();
  boxes.push({ part: 'ramp', centre: ramp.centre, half: [halfW, wall / 2, ramp.length / 2], rotationX: ramp.rotationX });
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
export function addTowerColliders(world) {
  const towerMaterial = new CANNON.Material('tower');
  const diceMaterial = new CANNON.Material('tower-die');
  world.addContactMaterial(new CANNON.ContactMaterial(towerMaterial, diceMaterial, {
    friction: TOWER_FRICTION,
    restitution: TOWER_RESTITUTION,
  }));
  towerBoxes().forEach(({ centre, half, rotationX = 0 }) => {
    const body = new CANNON.Body({ mass: 0, material: towerMaterial, shape: new CANNON.Box(new CANNON.Vec3(...half)) });
    body.position.set(...centre);
    if (rotationX) body.quaternion.setFromEuler(rotationX, 0, 0);
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

export function towerStart(index, random) {
  const [slotX, slotZ] = LAYER_SLOTS[index % LAYER_SLOTS.length];
  const layer = Math.floor(index / LAYER_SLOTS.length);
  const middleZ = (TOWER.back + TOWER.front) / 2;
  return {
    position: [
      slotX + (random() - 0.5) * 0.18,
      FIRST_LAYER_Y + layer * LAYER_GAP + random() * 0.3,
      // Over the back baffle, so the first bounce sends them forwards.
      middleZ - 0.65 + slotZ + (random() - 0.5) * 0.18,
    ],
    velocity: [(random() - 0.5) * 0.8, -1 - random(), (random() - 0.5) * 0.6],
    spin: [(random() - 0.5) * 16, (random() - 0.5) * 16, (random() - 0.5) * 16],
  };
}

/** The tallest stack of dice the tube is built for; larger pools use the tray. */
export const TOWER_MAX_DICE = 8;

/** Did this die come out of the tower and into the tray? */
export function inTray([x, z]) {
  return z > TOWER.front + 0.2 && Math.abs(x) < TRAY_HALF && z < TRAY_HALF;
}
