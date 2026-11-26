/**
 * The dice tray's moving details: as each die comes to rest a hexagon of
 * light pulses out from under it and stays as a faint ring, in the dice's
 * own glow colour -- gold for a natural 20, red for a natural 1 -- and a
 * natural 20 also throws a small fountain of sparks.
 *
 * Purely decoration, like towerLife.js: nothing here is a collider and
 * nothing reads or changes the physics or the result. The scene tells it
 * where the dice stopped; it only draws.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
} from 'three';

/** How long a landing ring takes to pulse out, in seconds. */
export const RING_PULSE_SECONDS = 0.7;
/** The ring's opacity once it has settled under the die. */
export const RING_REST_OPACITY = 0.16;
/** A natural 20 or natural 1 keeps a brighter ring, so it stands out in a pool. */
export const RING_REST_OPACITY_OUTCOME = 0.55;

/**
 * A landing ring `age` seconds after its die stopped: it grows from just
 * under the die to its resting size while fading from bright to faint.
 */
export function ringPulse(age, rest = RING_REST_OPACITY) {
  const t = Math.min(1, Math.max(0, age / RING_PULSE_SECONDS));
  const eased = 1 - (1 - t) ** 3;
  return { scale: 0.55 + eased * 0.45, opacity: 1 - eased * (1 - rest) };
}

/** The colour a die's ring takes: its outcome colour, or the dice's glow. */
export function ringColourFor(tone, palette = {}) {
  if (tone === 'crit') return palette.crit || '#FFD27A';
  if (tone === 'fumble') return palette.fumble || '#FF5A5A';
  return palette.glow || palette.edge || '#FF5C93';
}

const SPARKS_PER_CRIT = 18;
const MAX_SPARKS = 72;

export function createTrayLife(palette = {}, random = Math.random) {
  const group = new Group();
  group.name = 'dice-tray-life';
  const disposables = [];
  const keep = (thing) => { disposables.push(thing); return thing; };

  // One hexagon outline, shared by every ring.
  const ringGeometry = keep(new RingGeometry(0.955, 1, 6, 1));
  let rings = [];

  const sparkGeometry = keep(new BufferGeometry());
  const sparkPositions = new Float32Array(MAX_SPARKS * 3).fill(-999);
  sparkGeometry.setAttribute('position', new BufferAttribute(sparkPositions, 3));
  const sparkMaterial = keep(new PointsMaterial({
    color: ringColourFor('crit', palette), size: 0.16, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  group.add(new Points(sparkGeometry, sparkMaterial));
  const sparks = Array.from({ length: MAX_SPARKS }, () => ({ life: 0, v: [0, 0, 0] }));
  let nextSpark = 0;

  function clear() {
    rings.forEach((ring) => { group.remove(ring.mesh); ring.mesh.material.dispose(); });
    rings = [];
    sparks.forEach((spark, index) => { spark.life = 0; sparkPositions[index * 3 + 1] = -999; });
    sparkMaterial.opacity = 0;
    sparkGeometry.attributes.position.needsUpdate = true;
  }

  /**
   * The dice have stopped. dice: [{ position: [x, y, z], radius, tone }]
   * where tone is 'crit', 'fumble' or nothing, and radius the die's size.
   */
  function reveal(dice = []) {
    clear();
    dice.forEach(({ position, radius = 1, tone }) => {
      const material = new MeshBasicMaterial({
        color: ringColourFor(tone, palette), transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const mesh = new Mesh(ringGeometry, material);
      mesh.rotation.x = -Math.PI / 2;
      // Just above the floor, so the shadow does not swallow it.
      mesh.position.set(position[0], 0.02, position[2]);
      mesh.renderOrder = 1;
      group.add(mesh);
      rings.push({ mesh, age: 0, size: radius * 1.28, rest: tone === 'crit' || tone === 'fumble' ? RING_REST_OPACITY_OUTCOME : RING_REST_OPACITY });

      if (tone !== 'crit') return;
      for (let k = 0; k < SPARKS_PER_CRIT; k += 1) {
        const spark = sparks[nextSpark];
        const index = nextSpark * 3;
        nextSpark = (nextSpark + 1) % MAX_SPARKS;
        const angle = random() * Math.PI * 2;
        const speed = 1.2 + random() * 1.8;
        spark.life = 0.8 + random() * 0.5;
        spark.v = [Math.cos(angle) * speed, 3 + random() * 2.5, Math.sin(angle) * speed];
        sparkPositions[index] = position[0];
        sparkPositions[index + 1] = Math.max(0.2, position[1]);
        sparkPositions[index + 2] = position[2];
      }
    });
    update(0);
  }

  function update(seconds) {
    const dt = Math.min(0.1, Math.max(0, seconds));
    rings.forEach((ring) => {
      ring.age += dt;
      const { scale, opacity } = ringPulse(ring.age, ring.rest);
      ring.mesh.scale.setScalar(ring.size * scale);
      ring.mesh.material.opacity = opacity;
    });

    let alive = false;
    sparks.forEach((spark, i) => {
      if (spark.life <= 0) return;
      alive = true;
      spark.life -= dt;
      spark.v[1] -= 9 * dt;
      const index = i * 3;
      sparkPositions[index] += spark.v[0] * dt;
      sparkPositions[index + 1] = Math.max(0.05, sparkPositions[index + 1] + spark.v[1] * dt);
      sparkPositions[index + 2] += spark.v[2] * dt;
      if (spark.life <= 0) sparkPositions[index + 1] = -999;
    });
    sparkMaterial.opacity = alive ? 0.95 : 0;
    sparkGeometry.attributes.position.needsUpdate = true;
  }

  /** True while a ring is still pulsing or a spark is still in the air. */
  function busy() {
    return rings.some((ring) => ring.age < RING_PULSE_SECONDS) || sparks.some((spark) => spark.life > 0);
  }

  return {
    group,
    reveal,
    update,
    clear,
    busy,
    dispose() {
      clear();
      disposables.forEach((thing) => thing.dispose());
    },
  };
}
