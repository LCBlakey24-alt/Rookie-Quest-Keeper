/**
 * The dice tower's moving details: light bands that follow the dice down
 * the glass, a hexagon sigil that turns above the crown and flares as the
 * dice drop in, a glowing frame round the mouth that flashes (with a burst
 * of sparks) as each die shoots out, and motes drifting in the tube.
 *
 * Purely decoration. Nothing here is a collider and nothing reads or
 * changes the physics: the scene calls update() each frame with where the
 * dice are, and the details react to that. Every design gets the same
 * details in its own accent colour.
 */

import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  TorusGeometry,
} from 'three';

import { TOWER } from './diceTowerRig';

/** Heights of the light bands across the glass front, top to bottom. */
export const BAND_HEIGHTS = [13.2, 11.2, 9.2, 7.2, 5.2];

/**
 * How brightly a band at height y glows with dice at these heights: a soft
 * pool of light that peaks as a die passes it. 0 when no die is near.
 */
export function bandGlow(bandY, diceYs) {
  return Math.min(1, diceYs.reduce((sum, y) => sum + Math.exp(-((y - bandY) ** 2) / 1.6), 0));
}

/** Which dice have just left the tube since the last frame (by index). */
export function newlyExited(previous, current) {
  return current.map((inTube, index) => previous[index] === true && inTube === false);
}

function glowDot() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
}

const SPARKS = 48;
const MOTES = 40;

export function createTowerLife(skin, random = Math.random) {
  const group = new Group();
  group.name = 'dice-tower-life';
  const halfW = TOWER.width / 2 + TOWER.wall;
  const glassZ = TOWER.front + 0.02;
  const midZ = (TOWER.front + TOWER.back) / 2;
  const dot = glowDot();
  const disposables = [];
  const keep = (thing) => { disposables.push(thing); return thing; };
  const additive = (opacity) => keep(new MeshBasicMaterial({
    color: skin.accent, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }));

  // Light bands on the glass.
  const bandGeometry = keep(new BoxGeometry(halfW * 2 - 0.3, 0.07, 0.03));
  const bands = BAND_HEIGHTS.map((y) => {
    const material = additive(0.12);
    const mesh = new Mesh(bandGeometry, material);
    mesh.position.set(0, y, glassZ);
    group.add(mesh);
    return { y, material, level: 0 };
  });

  // The sigil: two hexagon rings above the crown.
  const sigil = new Group();
  const sigilMaterial = additive(0.55);
  const outer = new Mesh(keep(new TorusGeometry(1.3, 0.06, 6, 6)), sigilMaterial);
  const inner = new Mesh(keep(new TorusGeometry(0.85, 0.05, 6, 6)), sigilMaterial);
  outer.rotation.x = Math.PI / 2;
  inner.rotation.x = Math.PI / 2;
  inner.rotation.z = Math.PI / 6;
  sigil.add(outer, inner);
  sigil.position.set(0, TOWER.top + 3.0, midZ);
  group.add(sigil);

  // The mouth frame: two posts and a lintel round the opening.
  const mouthMaterial = additive(0.35);
  const post = keep(new BoxGeometry(0.1, TOWER.mouth, 0.1));
  [-TOWER.width / 2, TOWER.width / 2].forEach((x) => {
    const mesh = new Mesh(post, mouthMaterial);
    mesh.position.set(x, TOWER.mouth / 2, TOWER.front + 0.06);
    group.add(mesh);
  });
  const lintel = new Mesh(keep(new BoxGeometry(TOWER.width + 0.1, 0.1, 0.1)), mouthMaterial);
  lintel.position.set(0, TOWER.mouth, TOWER.front + 0.06);
  group.add(lintel);

  // Sparks, reused from a pool, and drifting motes in the tube.
  const pointsMaterial = (size, opacity) => keep(new PointsMaterial({
    color: skin.accent, size, map: dot || null, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  const sparkGeometry = keep(new BufferGeometry());
  const sparkPositions = new Float32Array(SPARKS * 3).fill(-999);
  sparkGeometry.setAttribute('position', new BufferAttribute(sparkPositions, 3));
  const sparkMaterial = pointsMaterial(0.32, 0.9);
  group.add(new Points(sparkGeometry, sparkMaterial));
  const sparks = Array.from({ length: SPARKS }, () => ({ life: 0, v: [0, 0, 0] }));
  let nextSpark = 0;

  const moteGeometry = keep(new BufferGeometry());
  const motePositions = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i += 1) {
    motePositions[i * 3] = (random() - 0.5) * TOWER.width;
    motePositions[i * 3 + 1] = random() * TOWER.top;
    motePositions[i * 3 + 2] = TOWER.back + random() * TOWER.depth;
  }
  moteGeometry.setAttribute('position', new BufferAttribute(motePositions, 3));
  const moteMaterial = pointsMaterial(0.16, 0.45);
  group.add(new Points(moteGeometry, moteMaterial));

  let time = 0;
  let flare = 1; // the sigil starts lit for the wide shot
  let mouthFlash = 0;
  let previousInTube = [];

  const burst = ([x, y, z]) => {
    for (let k = 0; k < 14; k += 1) {
      const spark = sparks[nextSpark];
      nextSpark = (nextSpark + 1) % SPARKS;
      spark.life = 0.7 + random() * 0.3;
      spark.v = [(random() - 0.5) * 6, 2 + random() * 4, 2 + random() * 4];
      const index = sparks.indexOf(spark) * 3;
      sparkPositions[index] = x + (random() - 0.5) * 0.6;
      sparkPositions[index + 1] = Math.max(0.3, y);
      sparkPositions[index + 2] = z;
    }
  };

  /**
   * dice: [{ position: [x, y, z], inTube }] for every die. dropping: true
   * from the moment the dice are released.
   */
  function update(seconds, { dice = [], dropping = false } = {}) {
    const dt = Math.min(0.1, Math.max(0, seconds));
    time += dt;

    const tubeYs = dice.filter((die) => die.inTube && dropping).map((die) => die.position[1]);
    bands.forEach((band) => {
      const target = bandGlow(band.y, tubeYs);
      band.level += (target - band.level) * Math.min(1, dt * 10);
      band.material.opacity = 0.12 + band.level * 0.85;
    });

    const inTube = dice.map((die) => Boolean(die.inTube));
    newlyExited(previousInTube, inTube).forEach((exited, index) => {
      if (!exited) return;
      mouthFlash = 1;
      burst(dice[index].position);
    });
    previousInTube = inTube;

    if (dropping && tubeYs.length) flare = Math.max(flare, 0.6);
    flare = Math.max(0, flare - dt * 0.7);
    sigil.rotation.y = time * 0.5;
    sigil.scale.setScalar(1 + flare * 0.25);
    sigilMaterial.opacity = 0.45 + flare * 0.55 + Math.sin(time * 2.2) * 0.06;

    mouthFlash = Math.max(0, mouthFlash - dt * 2.2);
    mouthMaterial.opacity = 0.35 + mouthFlash * 0.65;

    let sparkAlive = false;
    sparks.forEach((spark, i) => {
      if (spark.life <= 0) return;
      sparkAlive = true;
      spark.life -= dt;
      spark.v[1] -= 14 * dt;
      const index = i * 3;
      sparkPositions[index] += spark.v[0] * dt;
      sparkPositions[index + 1] = Math.max(0.05, sparkPositions[index + 1] + spark.v[1] * dt);
      sparkPositions[index + 2] += spark.v[2] * dt;
      if (spark.life <= 0) sparkPositions[index + 1] = -999;
    });
    sparkMaterial.opacity = sparkAlive ? 0.9 : 0;
    sparkGeometry.attributes.position.needsUpdate = true;

    for (let i = 0; i < MOTES; i += 1) {
      let y = motePositions[i * 3 + 1] + dt * (0.3 + (i % 5) * 0.08);
      if (y > TOWER.top) y = 0.4;
      motePositions[i * 3 + 1] = y;
      motePositions[i * 3] += Math.sin(time * 0.7 + i) * 0.003;
    }
    moteGeometry.attributes.position.needsUpdate = true;
  }

  return {
    group,
    update,
    dispose() {
      disposables.forEach((thing) => thing.dispose());
      dot?.dispose();
    },
  };
}
