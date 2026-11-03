/**
 * Reading a settled die, and making it show the number the engine rolled.
 *
 * The dice engine in data/diceRoller.js decides every result. Physics only
 * decides how the throw looks. Those two have to be reconciled, and there
 * are two honest ways to do it: spin the die at the last moment so the right
 * face ends up on top (which looks like a snap), or work out which face the
 * throw lands on and paint the wanted number onto that face before the throw
 * is shown.
 *
 * This module supports the second. The scene simulates the throw once with
 * nothing on screen, asks which face finished upwards, assigns the numbers
 * around that, then replays the identical throw for the viewer. The tumble
 * is genuine, nothing snaps, and the odds stay exactly the engine's.
 */

/** Rotate a vector by a quaternion {x, y, z, w}. */
export function rotateVector([x, y, z], quaternion) {
  const { x: qx, y: qy, z: qz, w: qw } = quaternion;

  // t = 2 * (q_vec x v); v' = v + qw * t + (q_vec x t)
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);

  return [
    x + qw * tx + (qy * tz - qz * ty),
    y + qw * ty + (qz * tx - qx * tz),
    z + qw * tz + (qx * ty - qy * tx),
  ];
}

/**
 * Which face points along the world's +Y (or -Y for a die read from below).
 *
 * `normals` are the face normals in the die's own space; the quaternion is
 * the body's settled orientation.
 */
export function settledFaceIndex(normals, quaternion, readFace = 'up') {
  const sign = readFace === 'down' ? -1 : 1;

  let bestIndex = 0;
  let bestDot = -Infinity;

  normals.forEach((normal, index) => {
    const worldY = rotateVector(normal, quaternion)[1] * sign;
    if (worldY > bestDot) {
      bestDot = worldY;
      bestIndex = index;
    }
  });

  return bestIndex;
}

/**
 * How squarely the die is sitting, from 0 (on an edge) to 1 (flat).
 *
 * A die wedged against a wall is a real outcome of a physical throw, and
 * reading it would be arbitrary. The scene uses this to decide whether to
 * nudge the die and settle it again rather than show a cocked die.
 */
export function faceConfidence(normals, quaternion, readFace = 'up') {
  const sign = readFace === 'down' ? -1 : 1;
  return normals.reduce((best, normal) => {
    const worldY = rotateVector(normal, quaternion)[1] * sign;
    return Math.max(best, worldY);
  }, -Infinity);
}

/** A small deterministic generator, so a replayed throw matches its rehearsal. */
export function seededRandom(seed) {
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return function next() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** A stable numeric seed for a roll, so the same roll always throws the same. */
export function seedFromKey(key = '') {
  let hash = 2166136261;
  const text = String(key);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) || 1;
}

/**
 * Lay the die's numbers out so the face that settled upwards carries the
 * engine's result, and every other number appears exactly once.
 *
 * Returns an array of length faces, indexed by face.
 */
export function assignFaceValues({ faceCount, values, settledIndex, result, random = Math.random }) {
  if (!Array.isArray(values) || values.length !== faceCount) {
    throw new Error(`A ${faceCount}-faced die needs exactly ${faceCount} values.`);
  }
  if (settledIndex < 0 || settledIndex >= faceCount) {
    throw new Error(`Settled face ${settledIndex} is outside a ${faceCount}-faced die.`);
  }

  const remaining = [...values];
  const resultPosition = remaining.indexOf(result);
  if (resultPosition === -1) {
    throw new Error(`${result} is not a face of this die.`);
  }
  remaining.splice(resultPosition, 1);

  // Fisher-Yates over the leftovers, so the faces the viewer can glimpse
  // during the tumble differ from throw to throw.
  for (let index = remaining.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [remaining[index], remaining[swap]] = [remaining[swap], remaining[index]];
  }

  const faceValues = [];
  let cursor = 0;
  for (let face = 0; face < faceCount; face += 1) {
    faceValues.push(face === settledIndex ? result : remaining[cursor++]);
  }

  return faceValues;
}
