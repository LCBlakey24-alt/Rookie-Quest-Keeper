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
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
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
const DIE_RADIUS = 0.9;

// Scaling every solid to the same circumradius makes a tetrahedron look
// tiny and a cube look fat, because a sphere's worth of tetrahedron is far
// less material than a sphere's worth of icosahedron. These multipliers put
// the set back in proportion, the way dice in a real set sit together.
const DIE_BULK = { 4: 1.06, 6: 0.94, 8: 1.0, 10: 0.98, 12: 0.95, 20: 1.0, 100: 0.98 };
const STEP = 1 / 60;
const MAX_STEPS = 600;
const SETTLED_SPEED = 0.08;
const COCKED_THRESHOLD = 0.86;
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
    const bulk = DIE_BULK[spec.sides] || 1;
    const scale = (DIE_RADIUS * bulk) / Math.max(...solid.vertices.map((v) => Math.hypot(...v)));
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
 * Run a throw with nothing on screen and report where each die finishes:
 * the face pointing up, and where on the floor it came to rest.
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

  const faces = [];
  const positions = [];
  for (const { body, spec } of entries) {
    const confidence = faceConfidence(spec.normals, body.quaternion, spec.readFace);
    if (confidence < COCKED_THRESHOLD) return null;
    faces.push(settledFaceIndex(spec.normals, body.quaternion, spec.readFace));
    positions.push([body.position.x, body.position.z]);
  }

  return { faces, positions };
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
export function planThrow(specs, baseSeed) {
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

  // Two things make a throw worth showing: no die is left cocked against a
  // wall, and the dice finish near the middle where they can be read
  // together. Seeds are tried until both hold. A throw that is merely
  // readable is kept as a reserve, so an awkward pool still gets a real
  // throw instead of dropping to the flat card.
  let reserve = null;
  const attempts = throwAttemptsFor(specs.length);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const seed = baseSeed + attempt * 7919;
    const outcome = simulateThrow(specs, seed);
    if (!outcome) continue;

    if (landedCentrally(outcome.positions)) return build(seed, outcome.faces, outcome.positions);
    if (!reserve) reserve = build(seed, outcome.faces, outcome.positions);
  }

  return reserve;
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
    values: shape.values,
    readFace: shape.readFace,
    result,
    dropped: Boolean(die.dropped),
    sides: Number(die.sides),
    accent: natural,
  };
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
export function cameraFraming(positions, fovDegrees) {
  const reach = positions.reduce((worst, [x, z]) => Math.max(worst, Math.abs(x), Math.abs(z)), 0);
  const halfExtent = reach + DIE_RADIUS + 0.75;
  const distance = halfExtent / Math.tan((fovDegrees / 2) * (Math.PI / 180));

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
export function createDiceTray({ canvas, palette }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  // Steep and close: the number the player needs is on the upward face, so
  // the view is nearly overhead, with just enough tilt to read as solid.
  // A starting view; roll() reframes per throw from where the dice land.
  const FOV = 35;
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 9.2, 2.9);
  camera.lookAt(0, 0, 0);

  // Three-point lighting. The key models the facets, the ledger-blue fill
  // keeps the shadowed sides from going black, and the rim picks out the
  // silhouette so a navy die still reads against a navy tray.
  scene.add(new AmbientLight(0xffffff, 1.9));

  const key = new DirectionalLight(0xfff6e8, 2.9);
  key.position.set(3.2, 12, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0015;
  key.shadow.camera.left = -TRAY_HALF * 1.6;
  key.shadow.camera.right = TRAY_HALF * 1.6;
  key.shadow.camera.top = TRAY_HALF * 1.6;
  key.shadow.camera.bottom = -TRAY_HALF * 1.6;
  scene.add(key);

  const fill = new DirectionalLight(palette.support, 0.85);
  fill.position.set(-5.5, 4, -3.5);
  scene.add(fill);

  const rim = new DirectionalLight(0xEADFC8, 1.1);
  rim.position.set(-2.5, 3.5, -6.5);
  scene.add(rim);

  const floor = new Mesh(
    new PlaneGeometry(TRAY_HALF * 4, TRAY_HALF * 4),
    new ShadowMaterial({ opacity: 0.34 }),
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

    const framing = cameraFraming(plan.positions, FOV);
    camera.position.set(...framing.position);
    camera.lookAt(...framing.target);

    world = trayWorld();
    const entries = throwBodies(world, specs, seededRandom(plan.seed));

    active = entries.map((entry, index) => {
      const columns = atlasColumns(entry.spec.solid.faces.length);
      const texture = drawFaceAtlas(plan.layouts[index], {
        columns,
        cellPixels: cellPixelsFor(specs.length),
        body: palette.body,
        ink: entry.spec.dropped ? palette.inkMuted
          : entry.spec.accent === 'crit' ? palette.crit
          : entry.spec.accent === 'fumble' ? palette.fumble
          : palette.ink,
        size: entry.spec.sides,
        corners: entry.spec.solid.faces[0].length,
      });

      const geometry = buildDieGeometry(entry.spec.solid, columns);
      const mesh = new Mesh(
        geometry,
        new MeshStandardMaterial({
          map: texture,
          // Metalness without an environment map makes a surface reflect
          // nothing and go black, which read as see-through against a navy
          // tray. These dice are resin, not metal, so it stays near zero
          // and the sheen comes from the lights instead.
          roughness: 0.38,
          metalness: 0.04,
          // A dropped die is dimmed, not made transparent. Transparency let
          // the die's own far faces show through its near ones, which looks
          // like a rendering fault rather than "this one does not count".
          color: entry.spec.dropped ? palette.bodyMuted : 0xffffff,
        }),
      );
      mesh.scale.setScalar(entry.scale);
      mesh.castShadow = true;

      // A hairline along every real edge. The threshold drops the fan
      // diagonals inside a pentagon or kite, which are coplanar, and keeps
      // only the edges between faces -- the bevel a resin die catches light
      // on. It rides as a child so it follows the die's transform.
      const edges = new LineSegments(
        new EdgesGeometry(geometry, 8),
        new LineBasicMaterial({
          color: entry.spec.accent === 'crit' ? palette.crit
            : entry.spec.accent === 'fumble' ? palette.fumble
            : palette.edge,
          transparent: true,
          opacity: entry.spec.dropped ? 0.16 : 0.5,
        }),
      );
      mesh.add(edges);

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
