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
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion as ThreeQuaternion,
  Scene,
  ShadowMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';

import { atlasColumns, buildDieGeometry, drawFaceAtlas } from './dieMesh';
import { assignFaceValues, faceConfidence, seededRandom, settledFaceIndex } from './diceFaceReading';
import { faceNormals, shapeForSides } from './diceShapes';

const TRAY_HALF = 3.5;
const WALL_HEIGHT = 7.5;
const DIE_RADIUS = 0.82;
const STEP = 1 / 60;
const MAX_STEPS = 600;
const SETTLED_SPEED = 0.08;
const COCKED_THRESHOLD = 0.86;
const MAX_RETHROWS = 6;
const SETTLE_HOLD_FRAMES = 20;

function trayWorld() {
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

  addPlane([0, 0, 0], [-Math.PI / 2, 0, 0]);                    // floor
  addPlane([0, WALL_HEIGHT, 0], [Math.PI / 2, 0, 0]);           // ceiling
  addPlane([-TRAY_HALF, 0, 0], [0, Math.PI / 2, 0]);            // left
  addPlane([TRAY_HALF, 0, 0], [0, -Math.PI / 2, 0]);            // right
  addPlane([0, 0, -TRAY_HALF], [0, 0, 0]);                      // back
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
function throwBodies(world, specs, random) {
  return specs.map((spec, index) => {
    const solid = spec.solid;
    const scale = DIE_RADIUS / Math.max(...solid.vertices.map((v) => Math.hypot(...v)));
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

function atRest(entries) {
  return entries.every(({ body }) =>
    body.sleepState === CANNON.Body.SLEEPING
    || (body.velocity.length() < SETTLED_SPEED && body.angularVelocity.length() < SETTLED_SPEED));
}

/**
 * Run a throw with nothing on screen and report where each die finishes.
 *
 * Returns null when a die ends up cocked, so the caller can try another
 * seed rather than read a die balanced on an edge.
 */
export function simulateThrow(specs, seed) {
  const world = trayWorld();
  const entries = throwBodies(world, specs, seededRandom(seed));

  let steps = 0;
  while (steps < MAX_STEPS && !atRest(entries)) {
    world.step(STEP);
    steps += 1;
  }

  const outcomes = [];
  for (const { body, spec } of entries) {
    const confidence = faceConfidence(spec.normals, body.quaternion, spec.readFace);
    if (confidence < COCKED_THRESHOLD) return null;
    outcomes.push(settledFaceIndex(spec.normals, body.quaternion, spec.readFace));
  }

  return outcomes;
}

/**
 * Prepare a throw: find a seed whose dice all land flat, and work out the
 * number layout each die needs so the settled face shows its result.
 */
export function planThrow(specs, baseSeed) {
  for (let attempt = 0; attempt <= MAX_RETHROWS; attempt += 1) {
    const seed = baseSeed + attempt * 7919;
    const settled = simulateThrow(specs, seed);
    if (!settled) continue;

    const random = seededRandom(seed + 104729);
    const layouts = specs.map((spec, index) => assignFaceValues({
      faceCount: spec.solid.faces.length,
      values: spec.values,
      settledIndex: settled[index],
      result: spec.result,
      random,
    }));

    return { seed, settled, layouts };
  }

  return null;
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
  if (!shape.values.includes(result)) return null;

  return {
    solid,
    normals: faceNormals(solid),
    values: shape.values,
    readFace: shape.readFace,
    result,
    dropped: Boolean(die.dropped),
    sides: Number(die.sides),
  };
}

/**
 * Build the tray. The canvas is transparent and the floor only catches
 * shadows, so the dice appear to tumble on the panel itself rather than
 * inside a second coloured box -- the flat-surface direction applies to the
 * 3D view too, and the tray's edge is the panel's own hairline border.
 */
export function createDiceTray({ canvas, palette }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  // Steep and close: the number the player needs is on the upward face, so
  // the view is nearly overhead, with just enough tilt to read as solid.
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 9.6, 3.1);
  camera.lookAt(0, 0, 0);

  scene.add(new AmbientLight(0xffffff, 2.4));
  const key = new DirectionalLight(0xffffff, 2.6);
  key.position.set(3.5, 11, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -TRAY_HALF * 1.6;
  key.shadow.camera.right = TRAY_HALF * 1.6;
  key.shadow.camera.top = TRAY_HALF * 1.6;
  key.shadow.camera.bottom = -TRAY_HALF * 1.6;
  scene.add(key);

  const fill = new DirectionalLight(palette.support, 0.7);
  fill.position.set(-5, 4, -4);
  scene.add(fill);

  const floor = new Mesh(
    new PlaneGeometry(TRAY_HALF * 4, TRAY_HALF * 4),
    new ShadowMaterial({ opacity: 0.4 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  let active = [];
  let frame = null;
  let world = null;
  let disposed = false;

  function clearDice() {
    active.forEach(({ mesh }) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.dispose();
    });
    active = [];
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
  function roll(specs, { seed, onSettled } = {}) {
    if (disposed || !specs.length) return false;

    const plan = planThrow(specs, seed);
    if (!plan) return false;

    clearDice();
    if (frame) cancelAnimationFrame(frame);

    world = trayWorld();
    const entries = throwBodies(world, specs, seededRandom(plan.seed));

    active = entries.map((entry, index) => {
      const columns = atlasColumns(entry.spec.solid.faces.length);
      const texture = drawFaceAtlas(plan.layouts[index], {
        columns,
        cellPixels: 128,
        body: palette.body,
        ink: entry.spec.dropped ? palette.inkMuted : palette.ink,
        size: entry.spec.sides,
      });

      const mesh = new Mesh(
        buildDieGeometry(entry.spec.solid, columns),
        new MeshStandardMaterial({
          map: texture,
          roughness: 0.42,
          metalness: 0.08,
          transparent: entry.spec.dropped,
          opacity: entry.spec.dropped ? 0.45 : 1,
        }),
      );
      mesh.scale.setScalar(entry.scale);
      mesh.castShadow = true;
      scene.add(mesh);
      return { ...entry, mesh };
    });

    let steps = 0;
    let announced = false;
    let settleFrames = 0;

    const tick = () => {
      if (disposed) return;
      world.step(STEP);
      steps += 1;

      active.forEach(({ body, mesh }) => {
        mesh.position.set(body.position.x, body.position.y, body.position.z);
        mesh.quaternion.copy(new ThreeQuaternion(
          body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w,
        ));
      });

      renderer.render(scene, camera);

      if (!announced && (atRest(active) || steps >= MAX_STEPS)) {
        announced = true;
        onSettled?.();
      }

      // A few frames after the dice stop the picture is final, so the loop
      // ends rather than burning a rAF every frame for the panel's lifetime.
      if (announced) settleFrames += 1;
      if (settleFrames < SETTLE_HOLD_FRAMES && steps < MAX_STEPS + SETTLE_HOLD_FRAMES) {
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
    floor.geometry.dispose();
    floor.material.dispose();
    renderer.dispose();
  }

  return { roll, resize, dispose, camera, scene, get trayCentre() { return new Vector3(0, 0, 0); } };
}
