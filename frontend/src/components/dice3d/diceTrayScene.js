/**
 * The 3D dice tray: real polyhedra thrown into a box, bouncing off its
 * walls, settling, and showing the number the dice engine already rolled.
 *
 * How the result and the physics are reconciled
 * ---------------------------------------------
 * data/diceRoller.js owns every result. This scene must never change one.
 * So each throw is simulated twice:
 *
 *   1. A rehearsal runs with nothing on screen, using a seeded generator,
 *      and reports which face each die finished with pointing upwards.
 *   2. The numbers are laid out so that face carries the engine's result.
 *   3. The identical throw is replayed for the viewer.
 *
 * cannon-es is deterministic for a fixed timestep and identical starting
 * conditions, and a fresh world is built for each pass, so the replay
 * matches the rehearsal exactly. The tumble is genuine, nothing snaps
 * around at the end, and the odds stay exactly the engine's.
 *
 * A die that finishes cocked -- wedged on an edge against a wall -- is
 * rethrown with a new seed rather than read, because reading it would be
 * arbitrary.
 */

import * as CANNON from 'cannon-es';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PCFSoftShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion as ThreeQuaternion,
  Scene,
  SRGBColorSpace,
  ShadowMaterial,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three';

import { atlasColumns, buildDieGeometry, drawFaceAtlas, faceLayouts } from './dieMesh';
import { assignFaceValues, faceConfidence, seededRandom, settledFaceIndex } from './diceFaceReading';
import { PERCENTILE_UNITS_VALUES, faceNormals, shapeForSides } from './diceShapes';
import { createStudioScene } from './studioEnvironment';
import { TOWER, TOWER_LIMITS, addTowerColliders, inTray, isTowerRig, towerShapeOf, towerStart } from './diceTowerRig';
import { buildTower } from './towerSkins';

const TRAY_HALF = 3.5;

/*
 * The Rookie mark printed faintly on the tray floor, like a logo on a
 * wrestling mat: the dice tumble over it and their shadows fall across it.
 * It lies under the shadow-catching floor and moves with each throw's
 * framing, so it always sits in the middle of the view.
 */
export const FLOOR_LOGO_URL = '/brand/rqk-hex-logo.png';
export const FLOOR_LOGO_OPACITY = 0.2;
const FLOOR_LOGO_HEIGHT = 4.4;
const FLOOR_LOGO_ASPECT = 598 / 720; // width / height of rqk-hex-logo.png

/** Where the floor logo goes for a throw's framing: centred under the view. */
export function floorLogoPlacement(framing) {
  const [x = 0, , z = 0] = framing?.target || [];
  return {
    position: [x, -0.01, z],
    width: FLOOR_LOGO_HEIGHT * FLOOR_LOGO_ASPECT,
    height: FLOOR_LOGO_HEIGHT,
  };
}
const WALL_HEIGHT = 7.5;
const DIE_RADIUS = 0.9;

// Scaling every solid to the same circumradius makes a tetrahedron look
// tiny and a cube look fat, because a sphere's worth of tetrahedron is far
// less material than a sphere's worth of icosahedron. These multipliers put
// the set back in proportion, the way dice in a real set sit together.
const DIE_BULK = { 4: 1.06, 6: 0.94, 8: 1.0, 10: 0.98, 12: 0.95, 20: 1.0, 100: 0.98 };
const STEP = 1 / 60;
const MAX_STEPS = 600;
const SETTLED_SPEED = 0.05;
/*
 * A throw is over only once every die has stayed still for this many
 * physics steps in a row (0.6 s of simulated time). Stopping at the first
 * instant the dice were slow caught them mid-wobble, so the tray could
 * stop before a die had really come down on a face. The rehearsal and the
 * replay use the same rule, so they stop on the same step.
 */
export const REST_HOLD_STEPS = 36;
/*
 * The replay runs on the clock, not one physics step per screen frame
 * (a 120 Hz phone was playing the throw twice as fast), and a little
 * slower than real time, so the tumble has room to be seen.
 */
export const TIME_SCALE = 0.8;
/*
 * A d20 can roll on for many seconds. Throws that settle within this many
 * steps (about 5.5 s on screen) are preferred; a longer one is only used
 * when no quicker one is found.
 */
export const QUICK_STEPS = 270;

/**
 * The longest a replay can run on screen, in milliseconds: MAX_STEPS at
 * TIME_SCALE. The overlay's reveal backstop waits at least this long so a
 * slow (reserve) throw is never cut short by the parent's timers.
 */
export function longestReplayMs(rig = 'tray') {
  return Math.ceil((limitsFor(rig).maxSteps * STEP * 1000) / TIME_SCALE);
}

/** Step limits for a rig: the tower's drop takes longer than a throw. */
export function limitsFor(rig = 'tray') {
  return isTowerRig(rig) ? TOWER_LIMITS : { maxSteps: MAX_STEPS, quickSteps: QUICK_STEPS };
}
const COCKED_THRESHOLD = 0.86;
/** Tower planning limits: see planThrow and simulateThrow. */
export const TOWER_MAX_ATTEMPTS = 6;
const TOWER_CENTRE_TRIES = 3;
const TOWER_STUCK_STEPS = 600;
/** Milliseconds of each frame a tower may spend planning its throw. */
const PLAN_BUDGET_MS = 8;
/**
 * How far from the middle a die may finish, and how many throws to try.
 *
 * Both scale with the pool, because dice need room: measured over twelve
 * throws each, a lone d20 settles a median 0.92 from centre, a pair 1.43,
 * but four dice 2.97 and eight 3.55 -- they collide and scatter, and no
 * amount of retrying will fit eight dice into a small circle. A fixed tight
 * radius therefore failed every attempt for a pool and then fell back to an
 * uncentred throw anyway, having spent 1.1 seconds of blank panel doing it.
 *
 * These targets sit near the measured median, so a throw usually qualifies
 * on the first or second attempt, and the attempt budget shrinks as dice
 * get more expensive to simulate.
 */
export function centreRadiusFor(count) {
  return Math.min(TRAY_HALF * 1.1, 1.15 + 1.15 * Math.sqrt(Math.max(0, count - 1)));
}

export function throwAttemptsFor(count) {
  return Math.max(3, Math.min(16, Math.round(24 / Math.max(1, count))));
}
const SETTLE_HOLD_FRAMES = 20;

function trayWorld(rig = 'tray') {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -38, 0) });
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.38;
  world.defaultContactMaterial.restitution = 0.32;
  world.solver.iterations = 14;

  const addPlane = (position, rotation) => {
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    body.position.set(...position);
    body.quaternion.setFromEuler(...rotation);
    world.addBody(body);
    return body;
  };

  const tower = isTowerRig(rig);
  addPlane([0, 0, 0], [-Math.PI / 2, 0, 0]);                    // floor
  // The tower is taller than the tray's lid, so its lid sits above the tube.
  addPlane([0, tower ? TOWER.top + 14 : WALL_HEIGHT, 0], [Math.PI / 2, 0, 0]); // ceiling
  addPlane([-TRAY_HALF, 0, 0], [0, Math.PI / 2, 0]);            // left
  addPlane([TRAY_HALF, 0, 0], [0, -Math.PI / 2, 0]);            // right
  // An endless back plane would seal the tower's mouth; the tower brings
  // its own back wall either side of the opening.
  if (tower) world.towerDiceMaterial = addTowerColliders(world, towerShapeOf(rig));
  else addPlane([0, 0, -TRAY_HALF], [0, 0, 0]);                 // back
  addPlane([0, 0, TRAY_HALF], [0, Math.PI, 0]);                 // front

  return world;
}

function hullFor(solid, scale) {
  return new CANNON.ConvexPolyhedron({
    vertices: solid.vertices.map(([x, y, z]) => new CANNON.Vec3(x * scale, y * scale, z * scale)),
    faces: solid.faces.map((face) => [...face]),
  });
}

/**
 * Deterministic starting conditions: dice enter from one side, spread across
 * the tray, spinning. Reading the generator in a fixed order is what lets
 * the replay reproduce the rehearsal.
 */
function throwBodies(world, specs, random, rig = 'tray') {
  return specs.map((spec, index) => {
    const solid = spec.solid;
    const bulk = DIE_BULK[spec.sides] || 1;
    const scale = (DIE_RADIUS * bulk) / Math.max(...solid.vertices.map((v) => Math.hypot(...v)));
    if (isTowerRig(rig)) {
      // Dropped into the top of the tube; the baffles do the tumbling.
      //
      // Inside the tube a die collides as a ball. cannon-es box-versus-
      // polyhedron contact can lock a die onto a slope (a d4 stuck fast on
      // the ramp), so the true shape is only swapped in as the die leaves
      // the tube (enterTray). Its face is decided entirely in the tray, by
      // the same die-on-floor physics as an ordinary throw. The mesh still
      // tumbles: it follows the ball's spin.
      const hull = hullFor(solid, scale);
      const body = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(DIE_RADIUS * bulk * TOWER_BALL) });
      const start = towerStart(index, random, towerShapeOf(rig));
      body.material = world.towerDiceMaterial || null;
      body.position.set(...start.position);
      body.quaternion.setFromEuler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2);
      body.velocity.set(...start.velocity);
      body.angularVelocity.set(...start.spin);
      // A die resting a moment on a slope must not be put to sleep inside
      // the tube; sleep is only switched on once it reaches the tray
      // (see wakeTowerDice).
      body.allowSleep = false;
      body.sleepSpeedLimit = SETTLED_SPEED;
      body.sleepTimeLimit = 0.25;
      body.linearDamping = 0.16;
      body.angularDamping = 0.14;
      world.addBody(body);
      return { body, scale, spec, hull };
    }

    const body = new CANNON.Body({ mass: 1, shape: hullFor(solid, scale) });

    // Dice are thrown in from the back edge and aimed at the middle of the
    // tray, so they rumble off the walls on the way in and come to rest near
    // the centre where they can be read, rather than piling into a corner.
    const lane = specs.length === 1 ? 0 : (index / (specs.length - 1) - 0.5) * 2;
    const startX = lane * TRAY_HALF * 0.5 + (random() - 0.5) * 0.8;
    const startZ = -TRAY_HALF * 0.72 + (random() - 0.5) * 0.5;
    body.position.set(startX, WALL_HEIGHT * 0.46 + random() * 1.2, startZ);

    body.quaternion.setFromEuler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2);

    // Aim at a point scattered a little about the centre, so a pool of dice
    // spreads out instead of stacking on one spot.
    const aimX = (random() - 0.5) * TRAY_HALF * 0.55;
    const aimZ = (random() - 0.5) * TRAY_HALF * 0.55;
    const runX = aimX - startX;
    const runZ = aimZ - startZ;
    const run = Math.hypot(runX, runZ) || 1;
    const speed = 4.4 + random() * 2.0;

    body.velocity.set((runX / run) * speed, -2.2 - random() * 1.6, (runZ / run) * speed);
    body.angularVelocity.set((random() - 0.5) * 20, (random() - 0.5) * 20, (random() - 0.5) * 20);

    body.allowSleep = true;
    body.sleepSpeedLimit = SETTLED_SPEED;
    body.sleepTimeLimit = 0.25;
    body.linearDamping = 0.16;
    body.angularDamping = 0.14;

    world.addBody(body);
    return { body, scale, spec };
  });
}

/** A tower die's ball is this share of the die's own radius. */
const TOWER_BALL = 0.82;

/**
 * As each tower die clears the mouth, give it back its real shape and let
 * it sleep. Called after every step in the rehearsal and the replay alike,
 * so both swap on the same step.
 */
function enterTray(entries) {
  entries.forEach((entry) => {
    const { body } = entry;
    if (!entry.hull || body.position.z <= TOWER.front + 0.6) return;
    body.removeShape(body.shapes[0]);
    body.addShape(entry.hull);
    body.updateMassProperties();
    body.allowSleep = true;
    entry.hull = null;
  });
}

function atRest(entries) {
  return entries.every(({ body }) =>
    body.sleepState === CANNON.Body.SLEEPING
    || (body.velocity.length() < SETTLED_SPEED && body.angularVelocity.length() < SETTLED_SPEED));
}

/**
 * Run a throw with nothing on screen and report where each die finishes:
 * the face pointing up, and where on the floor it came to rest.
 *
 * Returns null when a die ends up cocked, so the caller can try another
 * seed rather than read a die balanced on an edge.
 */
/** Run a step-by-step generator to the end and return its result. */
function drain(generator) {
  let result = generator.next();
  while (!result.done) result = generator.next();
  return result.value;
}

/** How many physics steps a resumable rehearsal runs between pauses. */
const STEPS_PER_SLICE = 6;

export function simulateThrow(specs, seed, rig = 'tray') {
  return drain(simulateThrowSteps(specs, seed, rig));
}

/**
 * simulateThrow, resumable: it pauses (yields) every few physics steps so
 * a tower's long rehearsal can be spread across animation frames instead
 * of freezing the page. Same steps, same result.
 */
export function* simulateThrowSteps(specs, seed, rig = 'tray') {
  const world = trayWorld(rig);
  const entries = throwBodies(world, specs, seededRandom(seed), rig);
  const { maxSteps } = limitsFor(rig);

  let steps = 0;
  let still = 0;
  while (steps < maxSteps && still < REST_HOLD_STEPS) {
    world.step(STEP);
    steps += 1;
    if (isTowerRig(rig)) {
      enterTray(entries);
      // A die still in the tube this late is stuck; stop rather than run
      // the full limit, so the planner can try another seed sooner.
      if (steps >= TOWER_STUCK_STEPS && entries.some((entry) => entry.hull)) return null;
    }
    still = atRest(entries) ? still + 1 : 0;
    if (steps % STEPS_PER_SLICE === 0) yield;
  }

  const faces = [];
  const positions = [];
  for (const { body, spec } of entries) {
    const confidence = faceConfidence(spec.normals, body.quaternion, spec.readFace);
    if (confidence < COCKED_THRESHOLD) return null;
    faces.push(settledFaceIndex(spec.normals, body.quaternion, spec.readFace));
    positions.push([body.position.x, body.position.z]);
  }

  return { faces, positions, steps };
}

/** Did the dice finish near the middle, where they can be read together? */
function landedCentrally(positions) {
  const limit = centreRadiusFor(positions.length);
  return positions.every(([x, z]) => Math.hypot(x, z) <= limit);
}

/**
 * Prepare a throw: find a seed whose dice all land flat, and work out the
 * number layout each die needs so the settled face shows its result.
 */
export function planThrow(specs, baseSeed, rig = 'tray') {
  return drain(planThrowSteps(specs, baseSeed, rig));
}

/** planThrow, resumable: see simulateThrowSteps. */
export function* planThrowSteps(specs, baseSeed, rig = 'tray') {
  const build = (seed, faces, positions) => {
    const random = seededRandom(seed + 104729);
    return {
      seed,
      settled: faces,
      positions,
      layouts: specs.map((spec, index) => assignFaceValues({
        faceCount: spec.solid.faces.length,
        values: spec.values,
        settledIndex: faces[index],
        result: spec.result,
        random,
      })),
    };
  };

  // Three things make a throw worth showing: no die is left cocked against a
  // wall, the dice finish near the middle where they can be read together,
  // and they come to rest in a few seconds. Seeds are tried until both hold. A throw that is merely
  // readable is kept as a reserve, so an awkward pool still gets a real
  // throw instead of dropping to the flat card.
  let reserve = null;
  const tower = isTowerRig(rig);
  // Each tower attempt is a long simulation run on the main thread, so a
  // tower tries fewer seeds and settles for a valid throw sooner: the camera
  // frames wherever its dice land anyway.
  const attempts = tower ? Math.min(TOWER_MAX_ATTEMPTS, throwAttemptsFor(specs.length)) : throwAttemptsFor(specs.length);

  const { quickSteps } = limitsFor(rig);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const seed = baseSeed + attempt * 7919;
    const outcome = yield* simulateThrowSteps(specs, seed, rig);
    if (!outcome) continue;
    // A die still in the tube (resting on a baffle) cannot be shown.
    if (isTowerRig(rig) && !outcome.positions.every(inTray)) continue;

    if (landedCentrally(outcome.positions) && outcome.steps <= quickSteps) return build(seed, outcome.faces, outcome.positions);
    if (!reserve) reserve = build(seed, outcome.faces, outcome.positions);
    if (tower && attempt >= TOWER_CENTRE_TRIES - 1) return reserve;
  }

  return reserve;
}

/**
 * A d100 is thrown as two dice, the way it is at a table: a tens die
 * (00-90) and a units die (0-9). 00 with 0 reads 100. Every other die
 * passes through unchanged. The result panel still shows the d100's total;
 * only what is thrown in the tray changes.
 */
export function expandPercentileDice(rolls) {
  return (Array.isArray(rolls) ? rolls : []).flatMap((die) => {
    if (Number(die?.sides) !== 100) return [die];
    const total = Number(die.result);
    if (!Number.isInteger(total) || total < 1 || total > 100) return [die];
    const tens = total === 100 ? 0 : Math.floor(total / 10) * 10;
    const units = total % 10;
    return [
      { ...die, sides: 100, result: tens, percentile: 'tens' },
      { ...die, sides: 10, result: units, percentile: 'units' },
    ];
  });
}

/**
 * Describe a die for the scene: its solid, face normals, legal values and
 * the result it must show. Returns null for a die with no polyhedron, so
 * the caller can fall back to the flat overlay.
 */
export function specForDie(die) {
  const shape = shapeForSides(die.sides);
  if (!shape) return null;

  const solid = shape.build();
  const result = Number(die.result);
  const values = die.percentile === 'units' ? PERCENTILE_UNITS_VALUES : shape.values;
  if (!values.includes(result)) return null;

  // A natural 20 or a natural 1 is a moment at the table, so the die that
  // produced it is marked -- in its numerals and its edge, not with a
  // coloured body, which would break the flat-surface direction. A dropped
  // die never counts: the advantage die you did not keep rolling a 20 is
  // not a critical.
  const natural = !die.dropped && Number(die.sides) === 20
    ? (result === 20 ? 'crit' : result === 1 ? 'fumble' : null)
    : null;

  return {
    solid,
    normals: faceNormals(solid),
    values,
    readFace: shape.readFace,
    result,
    dropped: Boolean(die.dropped),
    sides: Number(die.sides),
    accent: natural,
  };
}

/** Normal material used while a die is moving: outcomes stay secret. */
export function rollingInkFor(spec, palette) {
  return spec?.dropped ? palette.inkMuted : palette.ink;
}

/** Outcome colour applied only after the physics engine reports rest. */
export function settledAccentFor(spec, palette) {
  if (!spec || spec.dropped) return null;
  if (spec.accent === 'crit') return palette.crit;
  if (spec.accent === 'fumble') return palette.fumble;
  return null;
}

/**
 * How sharp each face's numerals need to be.
 *
 * The camera zooms in on a small throw, so one die fills the tray and a
 * 128px face is visibly soft; a pool is seen from much further back and
 * does not need the detail. Scaling with the pool keeps a lone d20 crisp
 * without handing a phone eight large textures at once.
 */
export function cellPixelsFor(count) {
  if (count <= 2) return 256;
  if (count <= 4) return 192;
  return 128;
}

/**
 * Where to put the camera so a given throw fills the frame.
 *
 * A lone d20 and a pool of eight need very different views: the pool is
 * allowed to spread much wider, and a fixed camera either shrinks the
 * single die to nothing or crops dice out of the picture. So the camera is
 * placed per throw, from where the dice actually came to rest.
 *
 * The elevation stays fixed, so every throw is seen from the same angle
 * and only the distance changes.
 */
export function cameraFraming(positions, fovDegrees, { aspect = 1, scale = 1 } = {}) {
  const reach = positions.reduce((worst, [x, z]) => Math.max(worst, Math.abs(x), Math.abs(z)), 0);
  const halfExtent = reach + DIE_RADIUS + 0.75;
  // A frame narrower than it is tall (the hexagon window) has the smaller
  // half-angle across, so frame to that. `scale` pulls the camera back to
  // keep the dice inside a shaped window's middle.
  const tanHalf = Math.tan((fovDegrees / 2) * (Math.PI / 180)) * Math.min(1, aspect || 1);
  const distance = (halfExtent * scale) / tanHalf;

  const centreX = positions.reduce((sum, [x]) => sum + x, 0) / (positions.length || 1);
  const centreZ = positions.reduce((sum, [, z]) => sum + z, 0) / (positions.length || 1);

  // Same elevation as before: about 72 degrees above the floor.
  const ELEVATION = 72.5 * (Math.PI / 180);
  return {
    position: [centreX, distance * Math.sin(ELEVATION), centreZ + distance * Math.cos(ELEVATION)],
    target: [centreX, 0, centreZ],
  };
}

/**
 * Build the tray. The canvas is transparent and the floor only catches
 * shadows, so the dice appear to tumble on the panel itself rather than
 * inside a second coloured box -- the flat-surface direction applies to the
 * 3D view too, and the tray's edge is the panel's own hairline border.
 */
/**
 * The tower's wide shot: the whole tower and its tray, from the front and a
 * little to the right. Each tower roll opens on it for a moment before the
 * dice drop in. Distance is fitted to the canvas so a phone in portrait (or
 * the hexagon window) still shows the crown and the tray.
 */
export function towerWideShot(fovDegrees, aspect = 1) {
  const target = [0, TOWER.top * 0.47, -1.8];
  // Tube plus the tallest design's crown, with a little air above it.
  const height = TOWER.top + 7.5;
  const width = TRAY_HALF * 2 + 2;
  const tanHalf = Math.tan((fovDegrees / 2) * (Math.PI / 180));
  const fit = Math.max((height / 2) / tanHalf, (width / 2) / (tanHalf * Math.max(0.35, aspect || 1)));
  const distance = fit * 1.08;
  const direction = [0.3, 0.38, 1];
  const length = Math.hypot(...direction);
  return {
    position: direction.map((value, index) => target[index] + (value / length) * distance),
    target,
  };
}

/** How long the wide shot lasts, sweeping round and pushing in, before the dice drop. */
export const TOWER_INTRO_MS = 1800;

/**
 * The camera during the wide shot, t from 0 to 1: it swings a little way
 * round the tower (about 16 degrees) while pushing in, so the tower is
 * shown off from more than one angle before the drop.
 */
export function towerIntroShot(wide, t) {
  const eased = easeInOut(Math.min(1, Math.max(0, t)));
  const angle = (1 - eased) * 0.28;
  const push = 1 - eased * 0.14;
  const [ox, oy, oz] = wide.position.map((value, index) => value - wide.target[index]);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const offset = [(ox * cos + oz * sin) * push, oy * push, (-ox * sin + oz * cos) * push];
  return { position: offset.map((value, index) => wide.target[index] + value), target: wide.target };
}

/**
 * The tower's close shot: a window onto the tube at height y, so the camera
 * can ride the dice down past the baffles. About eight units of tower are
 * in view, fitted to the canvas's shape (the hexagon window is a little
 * taller than wide).
 */
export function towerFollowShot(y, fovDegrees, aspect = 1) {
  const target = [0, y - 0.6, TOWER.front - TOWER.depth / 2 + 1.2];
  const span = 8.5;
  const tanHalf = Math.tan((fovDegrees / 2) * (Math.PI / 180));
  const distance = Math.max((span / 2) / tanHalf, (span * 0.75 / 2) / (tanHalf * Math.max(0.35, aspect || 1)));
  const direction = [0.35, 0.3, 1];
  const length = Math.hypot(...direction);
  return {
    position: direction.map((value, index) => target[index] + (value / length) * distance),
    target,
  };
}

/** How long the camera takes to come down from the tower to the dice. */
export const TOWER_CAMERA_MS = 950;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

export function createDiceTray({ canvas, palette, frameScale = 1, floorLogo = true, rig = 'tray', towerSkin = null, introMs = TOWER_INTRO_MS }) {
  const tower = isTowerRig(rig);
  // The opening shot's length is the viewer's choice (Settings); never zero,
  // so the camera always eases in rather than cutting.
  const introLength = Math.max(200, Number(introMs) || TOWER_INTRO_MS);
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  // Filmic tone mapping keeps a bright key light from flattening the
  // facets into one tone, which is what made the dice look like cut-outs.
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();

  // A soft studio room for the dice to reflect. Without anything to
  // reflect, a glossy surface has nothing to show and reads as flat paint;
  // with it, every facet catches a slightly different tone of the room.
  // Built once per tray and released in dispose().
  const pmrem = new PMREMGenerator(renderer);
  const studio = createStudioScene();
  const environment = pmrem.fromScene(studio.scene, 0.04).texture;
  studio.dispose();
  scene.environment = environment;
  // Steep and close: the number the player needs is on the upward face, so
  // the view is nearly overhead, with just enough tilt to read as solid.
  // A starting view; roll() reframes per throw from where the dice land.
  const FOV = 35;
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 9.2, 2.9);
  camera.lookAt(0, 0, 0);

  // Three-point lighting. The key models the facets, the violet fill
  // keeps the shadowed sides from going black, and the rim picks out the
  // silhouette so a navy die still reads against a navy tray.
  // The environment now does most of the filling, so the ambient is low:
  // a high flat ambient was washing every face to the same tone.
  scene.add(new AmbientLight(0xffffff, 0.35));

  const key = new DirectionalLight(0xfff6e8, 2.6);
  key.position.set(3.2, 12, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0015;
  // The tower casts a long shadow behind the tray, so its shadow box is larger.
  const shadowReach = TRAY_HALF * (tower ? 3.4 : 1.6);
  key.shadow.camera.left = -shadowReach;
  key.shadow.camera.right = shadowReach;
  key.shadow.camera.top = shadowReach;
  key.shadow.camera.bottom = -shadowReach;
  if (tower) key.shadow.camera.far = 60;
  scene.add(key);

  const fill = new DirectionalLight(palette.support, 0.6);
  fill.position.set(-5.5, 4, -3.5);
  scene.add(fill);

  const rim = new DirectionalLight(0xFFD6E8, 1.1);
  rim.position.set(-2.5, 3.5, -6.5);
  scene.add(rim);

  const floor = new Mesh(
    new PlaneGeometry(TRAY_HALF * 4, TRAY_HALF * 4),
    new ShadowMaterial({ opacity: 0.46 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // The faded logo, drawn before (and just under) the shadow floor. It only
  // appears once its image has loaded; a failed load leaves a plain tray.
  const logoPlacement = floorLogoPlacement({ target: [0, 0, 0] });
  const logoMaterial = new MeshBasicMaterial({ transparent: true, opacity: FLOOR_LOGO_OPACITY, depthWrite: false, toneMapped: false });
  const logo = new Mesh(new PlaneGeometry(logoPlacement.width, logoPlacement.height), logoMaterial);
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(...logoPlacement.position);
  logo.renderOrder = -1;
  logo.visible = false;
  scene.add(logo);

  // The tower itself, in the chosen design. Every design shares the colliders.
  const towerModel = tower ? buildTower(towerSkin) : null;
  if (towerModel) scene.add(towerModel.group);

  let active = [];
  let outcomeLights = [];
  let frame = null;
  let world = null;
  let disposed = false;
  let logoTexture = null;
  if (floorLogo) {
    new TextureLoader().load(FLOOR_LOGO_URL, (texture) => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = SRGBColorSpace;
      logoTexture = texture;
      logoMaterial.map = texture;
      logoMaterial.needsUpdate = true;
      logo.visible = true;
    }, undefined, () => {});
  }

  function clearDice() {
    active.forEach(({ mesh }) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.dispose();
    });
    active = [];
    outcomeLights.forEach((light) => scene.remove(light));
    outcomeLights = [];
  }

  function resize(width, height) {
    if (disposed || !width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  /**
   * Throw the dice. `specs` come from specForDie. Returns false when no
   * throw could be found in which every die lands flat, so the caller can
   * fall back rather than show a cocked die.
   */
  /*
   * Roll the dice. The tray plans its throw at once (it is quick). The
   * tower opens its wide shot straight away and plans while it plays, a few
   * milliseconds each frame, so a long rehearsal never freezes the page;
   * the drop starts once both the shot and the plan are done. If no throw
   * lands every die, a tower roll calls onFailed (the caller then uses the
   * tray) and returns true; a tray roll returns false.
   */
  function roll(specs, { seed, onSettled, onFailed } = {}) {
    if (disposed || !specs.length) return false;
    if (!tower) {
      const plan = planThrow(specs, seed, rig);
      if (!plan) return false;
      begin(specs, plan, { onSettled, introStartedAt: null });
      return true;
    }

    clearDice();
    if (frame) cancelAnimationFrame(frame);
    const wide = towerWideShot(FOV, camera.aspect);
    logo.position.set(...floorLogoPlacement({ target: [0, 0, 0] }).position);
    const planner = planThrowSteps(specs, seed, rig);
    let introStartedAt = null;
    let lastTime = null;
    const waiting = (now) => {
      if (disposed) return;
      if (introStartedAt === null) introStartedAt = now;
      const frameSeconds = lastTime === null ? 1 / 60 : Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      // Plan within a small budget, leaving the rest of the frame to draw.
      const until = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + PLAN_BUDGET_MS;
      let step = planner.next();
      while (!step.done && (typeof performance !== 'undefined' ? performance.now() : Date.now()) < until) step = planner.next();
      const shot = towerIntroShot(wide, Math.min(1, (now - introStartedAt) / introLength));
      camera.position.set(...shot.position);
      camera.lookAt(...shot.target);
      towerModel?.update?.(frameSeconds, { dice: [], dropping: false });
      renderer.render(scene, camera);
      if (!step.done) { frame = requestAnimationFrame(waiting); return; }
      frame = null;
      if (!step.value) { onFailed?.(); return; }
      begin(specs, step.value, { onSettled, introStartedAt });
    };
    frame = requestAnimationFrame(waiting);
    return true;
  }

  function begin(specs, plan, { onSettled, introStartedAt }) {
    clearDice();
    if (frame) cancelAnimationFrame(frame);

    const framing = cameraFraming(plan.positions, FOV, { aspect: camera.aspect, scale: frameScale });
    // The tower opens on a wide shot of the whole tower, then the camera
    // closes in on the top as the dice drop; the tray goes straight to the dice.
    const opening = tower ? towerWideShot(FOV, camera.aspect) : framing;
    camera.position.set(...opening.position);
    camera.lookAt(...opening.target);
    logo.position.set(...floorLogoPlacement(tower ? { target: [0, 0, 0] } : framing).position);

    world = trayWorld(rig);
    const entries = throwBodies(world, specs, seededRandom(plan.seed), rig);
    const { maxSteps } = limitsFor(rig);
    let cameraMove = null;

    active = entries.map((entry, index) => {
      const columns = atlasColumns(entry.spec.solid.faces.length);
      // Where each face's number sits and which way is up, shared by the
      // texture and the UVs so the two always agree.
      const labelLayouts = faceLayouts(entry.spec.solid);
      const texture = drawFaceAtlas(plan.layouts[index], {
        layouts: labelLayouts,
        solid: entry.spec.solid,
        // A dropped die (the advantage die not kept) loses its glow too.
        glow: entry.spec.dropped ? null : (palette.glow || null),
        glowStops: entry.spec.dropped ? null : (palette.glowStops || null),
        columns,
        cellPixels: cellPixelsFor(specs.length),
        body: palette.body,
        // Never colour a natural 20/1 while it is moving. The result glow
        // is applied by revealOutcomes only after the physics reports rest.
        ink: rollingInkFor(entry.spec, palette),
        size: entry.spec.sides,
        corners: entry.spec.solid.faces[0].length,
      });

      // The edge is the selected dye's ordinary edge during the throw.
      // Critical/fumble colour before landing would reveal the result.
      const edgeColor = new Color(palette.edge).toArray();
      const geometry = buildDieGeometry(entry.spec.solid, columns, { edgeColor, layouts: labelLayouts });
      const mesh = new Mesh(
        geometry,
        new MeshPhysicalMaterial({
          map: texture,
          vertexColors: true,
          // Polished resin: a little body roughness, under a clear coat
          // that gives the sharp highlight a real die has. Metalness stays
          // near zero -- these are resin, not metal.
          roughness: 0.42,
          metalness: 0.02,
          clearcoat: 0.85,
          clearcoatRoughness: 0.16,
          envMapIntensity: 0.9,
          emissive: 0x000000,
          emissiveIntensity: 0,
          // A dropped die is dimmed, not made transparent. Transparency let
          // the die's own far faces show through its near ones, which looks
          // like a rendering fault rather than "this one does not count".
          color: entry.spec.dropped ? palette.bodyMuted : 0xffffff,
        }),
      );
      mesh.scale.setScalar(entry.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
      return { ...entry, mesh };
    });

    const revealOutcomes = () => {
      // The tower itself reacts to a natural 20 or natural 1.
      const tones = active.map((entry) => entry.spec.accent).filter(Boolean);
      if (towerModel?.celebrate) {
        if (tones.includes('crit')) towerModel.celebrate('crit');
        else if (tones.includes('fumble')) towerModel.celebrate('fumble');
      }
      active.forEach((entry) => {
        const accent = settledAccentFor(entry.spec, palette);
        if (!accent) return;
        entry.mesh.material.emissive.set(accent);
        entry.mesh.material.emissiveIntensity = entry.spec.accent === 'crit' ? 0.26 : 0.22;
        entry.mesh.material.needsUpdate = true;

        // A small real scene light makes the landed die cast its result
        // colour onto the tray instead of merely repainting the number.
        const light = new PointLight(accent, entry.spec.accent === 'crit' ? 2.8 : 2.1, 4.8, 2);
        light.position.copy(entry.mesh.position).add(new Vector3(0, 1.25, 0));
        scene.add(light);
        outcomeLights.push(light);
      });
    };

    let steps = 0;
    let still = 0;
    let announced = false;
    let settleFrames = 0;
    let settledDelivered = false;
    let lastTime = null;
    let owed = 0;

    const place = () => {
      active.forEach(({ body, mesh }) => {
        mesh.position.set(body.position.x, body.position.y, body.position.z);
        mesh.quaternion.copy(new ThreeQuaternion(
          body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w,
        ));
      });
    };

    // Tower: the camera rides the dice down the tube, then sweeps to the tray
    // as the last die leaves the mouth. Purely visual: the physics and the
    // result are the rehearsed throw either way.
    let shot = opening;
    let sweptToTray = !tower;
    // The wide shot: the dice are hidden and the physics waits while the
    // camera pushes slowly in on the whole tower.
    // The wide shot carries on from where the planning frames left it.
    let introStart = introStartedAt;
    let introDone = !tower;
    if (tower) active.forEach((entry) => { entry.mesh.visible = false; });

    const tick = (now) => {
      if (disposed) return;
      const frameSeconds = lastTime === null ? 1 / 60 : Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      if (!introDone) {
        if (introStart === null) introStart = now;
        const t = Math.min(1, (now - introStart) / introLength);
        shot = towerIntroShot(opening, t);
        camera.position.set(...shot.position);
        camera.lookAt(...shot.target);
        towerModel?.update?.(frameSeconds, { dice: [], dropping: false });
        renderer.render(scene, camera);
        lastTime = now;
        if (t < 1) { frame = requestAnimationFrame(tick); return; }
        introDone = true;
        active.forEach((entry) => { entry.mesh.visible = true; });
      }
      // Advance the physics by the time that has passed (scaled), in whole
      // steps, until the dice have been still long enough. Then stop
      // stepping: the dice stay exactly where the rehearsal read them.
      if (!announced) {
        const elapsed = lastTime === null ? STEP : Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
        owed += elapsed * TIME_SCALE;
        while (owed >= STEP && !announced) {
          owed -= STEP;
          world.step(STEP);
          steps += 1;
          if (tower) enterTray(active);
          still = atRest(active) ? still + 1 : 0;
          if (still >= REST_HOLD_STEPS || steps >= maxSteps) announced = true;
        }
        place();
        if (announced && !settledDelivered) {
          settledDelivered = true;
          revealOutcomes();
          if (tower) {
            // Finish coming down to the dice before the total shows.
            if (!sweptToTray) { sweptToTray = true; cameraMove = { from: shot, to: framing, start: now }; }
            const left = cameraMove ? Math.max(0, TOWER_CAMERA_MS - (now - cameraMove.start)) : 0;
            window.setTimeout(() => { if (!disposed) onSettled?.(); }, left);
          } else {
            onSettled?.();
          }
        }
      }
      lastTime = now;

      if (!sweptToTray && !cameraMove) {
        const inTube = active.filter((entry) => entry.hull);
        if (inTube.length) {
          const y = inTube.reduce((sum, entry) => sum + entry.body.position.y, 0) / inTube.length;
          const goal = towerFollowShot(Math.max(TOWER.mouth + 1.5, Math.min(TOWER.top + 1, y)), FOV, camera.aspect);
          const k = 1 - Math.exp(-5 * frameSeconds);
          const ease = (a, b) => a.map((value, index) => value + (b[index] - value) * k);
          shot = { position: ease(shot.position, goal.position), target: ease(shot.target, goal.target) };
          camera.position.set(...shot.position);
          camera.lookAt(...shot.target);
        } else {
          sweptToTray = true;
          cameraMove = { from: shot, to: framing, start: now };
        }
      }

      if (cameraMove) {
        const t = easeInOut(Math.min(1, (now - cameraMove.start) / TOWER_CAMERA_MS));
        const mix = (a, b) => a.map((value, index) => value + (b[index] - value) * t);
        camera.position.set(...mix(cameraMove.from.position, cameraMove.to.position));
        camera.lookAt(...mix(cameraMove.from.target, cameraMove.to.target));
        if (t >= 1) cameraMove = null;
      }

      if (towerModel?.update) {
        towerModel.update(frameSeconds, {
          dropping: true,
          dice: active.map((entry) => ({ position: [entry.body.position.x, entry.body.position.y, entry.body.position.z], inTube: Boolean(entry.hull) })),
        });
      }

      renderer.render(scene, camera);

      // A few frames after the dice stop the picture is final, so the loop
      // ends rather than burning a rAF every frame for the panel's lifetime.
      // Keep drawing while the tower is still celebrating or throwing sparks.
      if (announced && !cameraMove && !towerModel?.busy?.()) settleFrames += 1;
      if (settleFrames < SETTLE_HOLD_FRAMES) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = null;
      }
    };

    frame = requestAnimationFrame(tick);
    return true;
  }

  function dispose() {
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    clearDice();
    towerModel?.dispose();
    floor.geometry.dispose();
    floor.material.dispose();
    logo.geometry.dispose();
    logoTexture?.dispose();
    logoMaterial.dispose();
    environment.dispose();
    pmrem.dispose();

    // A browser allows only a handful of live WebGL contexts -- Chrome
    // around sixteen -- and a table rolls far more often than that in a
    // session. renderer.dispose() alone frees three.js's objects but can
    // leave the context itself alive until the canvas is collected, so the
    // limit creeps up and eventually a roll cannot get a context at all and
    // silently drops to the flat card. Forcing the loss releases it now.
    renderer.forceContextLoss?.();
    renderer.dispose();
  }

  return { roll, resize, dispose, camera, scene, get trayCentre() { return new Vector3(0, 0, 0); } };
}
