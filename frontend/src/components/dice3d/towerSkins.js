/**
 * Dice tower designs.
 *
 * Every tower is the same machine: the tube, baffles, ramp and tray from
 * diceTowerRig.js, built here from the very boxes the physics uses, so what
 * is seen is exactly what the dice hit. A design (a "skin") only chooses
 * the materials and adds decoration around the tube -- pillars, a crown,
 * trim. It never changes a collider, so every design rolls identically.
 *
 * Adding a design is an entry in towerSkinCatalog.js (its name and
 * colours) plus a decorate() function here.
 */

import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';

import { FUNNEL, HELIX, TOWER, TOWER_MID_Z, TRAY_HALF, towerBoxes, towerCylinders } from './diceTowerRig';
import { DEFAULT_TOWER_SKIN_ID, TOWER_SKIN_CATALOG, getTowerSkinInfo } from './towerSkinCatalog';
import { createTowerLife } from './towerLife';

/** How tall the tray's rim is drawn (its physics walls are taller, unseen). */
export const TRAY_RIM_HEIGHT = 0.9;

const DECORATIONS = {
  'midnight-spire': decorateSpire,
  'gilded-reliquary': decorateReliquary,
  'ember-forge': decorateForge,
  'spiral-glass': decorateSpiral,
  'funnel-chute': decorateFunnel,
  'peg-drop': decoratePegs,
};

/** The catalogue with each design's 3D decoration attached. */
export const TOWER_SKINS = TOWER_SKIN_CATALOG.map((skin) => ({ ...skin, decorate: DECORATIONS[skin.id] }));

export { DEFAULT_TOWER_SKIN_ID };

/** A design by id; anything unknown gets the default. */
export function getTowerSkin(id) {
  return TOWER_SKINS.find((skin) => skin.id === getTowerSkinInfo(id).id);
}

/* ------------------------------------------------------------------ */

function solid(material, geometry, position, rotationX = 0) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.x = rotationX;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function edges(geometry, colour, position, rotationX = 0, opacity = 0.9) {
  const lines = new LineSegments(
    new EdgesGeometry(geometry),
    new LineBasicMaterial({ color: colour, transparent: true, opacity, toneMapped: false }),
  );
  lines.position.set(...position);
  lines.rotation.x = rotationX;
  return lines;
}

/** Glowing trim: an emissive material that ignores the scene's tone mapping. */
function glowMaterial(colour, intensity = 1.6) {
  return new MeshStandardMaterial({ color: colour, emissive: new Color(colour), emissiveIntensity: intensity, toneMapped: false });
}

/**
 * The shared machine: tube walls, glass front, baffles, ramp and the tray
 * rim, drawn from the collider list.
 */
function buildBase(group, skin) {
  const panel = new MeshPhysicalMaterial({ ...skin.panel, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const plank = new MeshPhysicalMaterial({ ...skin.plank, clearcoat: 0.3 });
  const glass = new MeshPhysicalMaterial({
    color: skin.glass.color,
    transparent: true,
    opacity: skin.glass.opacity,
    roughness: 0.05,
    metalness: 0,
    clearcoat: 1,
    depthWrite: false,
  });

  const shape = skin.shape || 'classic';
  towerBoxes(shape).forEach(({ part, centre, half, rotationX = 0, quaternion }) => {
    // The spiral's and funnel's round walls are glass; each design draws its own.
    if (part === 'ring') return;
    if (part === 'tray-back') {
      // Drawn rim-high: the tall collider above it is invisible, like the tray's.
      const geometry = new BoxGeometry(half[0] * 2, TRAY_RIM_HEIGHT, half[2] * 2);
      const position = [centre[0], TRAY_RIM_HEIGHT / 2, centre[2]];
      group.add(solid(panel, geometry, position));
      group.add(edges(geometry, skin.edge, position, 0, 0.7));
      return;
    }
    const geometry = new BoxGeometry(half[0] * 2, half[1] * 2, half[2] * 2);
    const material = part === 'front' ? glass : ['baffle', 'ramp', 'helix', 'funnel', 'deflector'].includes(part) ? plank : panel;
    const mesh = solid(material, geometry, centre, rotationX);
    if (quaternion) mesh.quaternion.set(...quaternion);
    if (part === 'front') mesh.castShadow = false;
    group.add(mesh);
    // The helix and funnel are many small pieces: a faint edge each, not a bright one.
    const line = edges(geometry, skin.edge, centre, rotationX, part === 'front' ? 1 : (part === 'helix' || part === 'funnel') ? 0.25 : 0.75);
    if (quaternion) line.quaternion.set(...quaternion);
    group.add(line);
  });

  // Round colliders: the pegs' bars and the spiral's pole.
  towerCylinders(shape).forEach(({ centre, radius, length, axis }) => {
    const mesh = solid(plank, new CylinderGeometry(radius, radius, length, 20), centre);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    group.add(mesh);
  });

  // The tray's own rim: left, right and front.
  const t = 0.3;
  [
    [[-TRAY_HALF - t / 2, TRAY_RIM_HEIGHT / 2, 0], [t, TRAY_RIM_HEIGHT, TRAY_HALF * 2 + t * 2]],
    [[TRAY_HALF + t / 2, TRAY_RIM_HEIGHT / 2, 0], [t, TRAY_RIM_HEIGHT, TRAY_HALF * 2 + t * 2]],
    [[0, TRAY_RIM_HEIGHT / 2, TRAY_HALF + t / 2], [TRAY_HALF * 2 + t * 2, TRAY_RIM_HEIGHT, t]],
  ].forEach(([position, size]) => {
    const geometry = new BoxGeometry(...size);
    group.add(solid(panel, geometry, position));
    group.add(edges(geometry, skin.edge, position, 0, 0.7));
  });

  return { panel, plank, glass };
}

/** A glass cylinder round the tube's axis, from y0 to y1, with glowing rings. */
function glassTube(group, skin, r, y0, y1, glass) {
  const f = towerFrame();
  const tubeGlass = glass.clone();
  tubeGlass.side = 2; // DoubleSide
  const tube = new Mesh(new CylinderGeometry(r, r, y1 - y0, 48, 1, true), tubeGlass);
  tube.position.set(0, (y0 + y1) / 2, TOWER_MID_Z);
  group.add(tube);
  const ringGlow = glowMaterial(skin.edge, 1.2);
  [y0 + 0.05, (y0 + y1) / 2, y1 - 0.05].forEach((y) => {
    const ring = new Mesh(new TorusGeometry(r + 0.04, 0.05, 8, 48), ringGlow);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, TOWER_MID_Z);
    group.add(ring);
  });
}

/** Useful points around the tube for decorations. */
function towerFrame() {
  const halfW = TOWER.width / 2 + TOWER.wall;
  return {
    halfW,
    front: TOWER.front,
    back: TOWER.back - TOWER.wall,
    midZ: (TOWER.front + TOWER.back) / 2,
    top: TOWER.top,
    corners: [
      [-halfW, TOWER.front], [halfW, TOWER.front],
      [-halfW, TOWER.back - TOWER.wall], [halfW, TOWER.back - TOWER.wall],
    ],
  };
}

/* Midnight Spire: hexagonal corner pillars, a glowing band, a hex crown. */
function decorateSpire(group, skin, { panel }) {
  const f = towerFrame();
  const pillarGeometry = new CylinderGeometry(0.34, 0.4, f.top + 0.4, 6);
  f.corners.forEach(([x, z]) => {
    group.add(solid(panel, pillarGeometry, [x, (f.top + 0.4) / 2, z]));
    group.add(edges(pillarGeometry, skin.edge, [x, (f.top + 0.4) / 2, z], 0, 0.6));
  });
  const glow = glowMaterial(skin.accent, 1.4);
  [3.2, f.top - 0.6].forEach((y) => {
    group.add(solid(glow, new BoxGeometry(f.halfW * 2 + 0.5, 0.08, 0.08), [0, y, f.front + 0.05]));
  });
  const crownWidth = f.halfW * 1.9;
  const crown = new CylinderGeometry(crownWidth, crownWidth * 1.05, 0.55, 6);
  group.add(solid(panel, crown, [0, f.top + 0.5, f.midZ]));
  group.add(edges(crown, skin.edge, [0, f.top + 0.5, f.midZ]));
  const roof = new ConeGeometry(crownWidth * 0.7, 1.6, 6);
  group.add(solid(panel, roof, [0, f.top + 1.55, f.midZ]));
  group.add(edges(roof, skin.edge, [0, f.top + 1.55, f.midZ]));
  group.add(solid(glow, new SphereGeometry(0.22, 16, 12), [0, f.top + 2.5, f.midZ]));
}

/* Gilded Reliquary: a gold frame and an arched top. */
function decorateReliquary(group, skin, { plank }) {
  const f = towerFrame();
  const bar = new BoxGeometry(0.28, f.top, 0.28);
  f.corners.forEach(([x, z]) => group.add(solid(plank, bar, [x, f.top / 2, z])));
  [1.1, f.top / 2, f.top - 0.2].forEach((y) => {
    group.add(solid(plank, new BoxGeometry(f.halfW * 2 + 0.3, 0.22, 0.22), [0, y, f.front + 0.02]));
  });
  const arch = new CylinderGeometry(f.halfW + 0.1, f.halfW + 0.1, f.front - f.back + 0.3, 24, 1, false, 0, Math.PI);
  const archMesh = solid(plank, arch, [0, f.top, f.midZ]);
  archMesh.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  group.add(archMesh);
  const finial = new TorusGeometry(0.42, 0.09, 10, 28);
  group.add(solid(glowMaterial(skin.edge, 0.9), finial, [0, f.top + f.halfW + 0.7, f.midZ]));
}

/* Ember Forge: rivets, glowing vents and a chimney. */
function decorateForge(group, skin, { plank }) {
  const f = towerFrame();
  const rivet = new SphereGeometry(0.09, 8, 6);
  for (let y = 1.2; y < f.top; y += 1.6) {
    [-f.halfW + 0.25, f.halfW - 0.25].forEach((x) => group.add(solid(plank, rivet, [x, y, f.front + 0.05])));
  }
  const vent = glowMaterial(skin.accent, 2.0);
  [4.6, 8.4, 12.0].forEach((y) => {
    [-1, 1].forEach((side) => {
      group.add(solid(vent, new BoxGeometry(0.06, 0.12, 1.6), [side * (f.halfW + 0.02), y, f.midZ]));
    });
  });
  const chimney = new CylinderGeometry(0.55, 0.7, 2.2, 10);
  group.add(solid(plank, chimney, [0.9, f.top + 1.1, f.midZ - 0.4]));
  group.add(solid(vent, new CylinderGeometry(0.42, 0.42, 0.05, 10), [0.9, f.top + 2.22, f.midZ - 0.4]));
  const cap = new BoxGeometry(f.halfW * 2 + 0.5, 0.35, f.front - f.back + 0.5);
  group.add(solid(plank, cap, [0, f.top + 0.18, f.midZ]));
  group.add(edges(cap, skin.edge, [0, f.top + 0.18, f.midZ], 0, 0.5));
}

/* Spiral Glass: a glass cylinder, a glowing core and a ringed crown. */
function decorateSpiral(group, skin, { panel, glass }) {
  const f = towerFrame();
  glassTube(group, skin, HELIX.outer + 0.1, HELIX.bottom - 0.4, HELIX.top + 1.2, glass);
  const core = solid(glowMaterial(skin.accent, 1.1), new CylinderGeometry(HELIX.pole * 0.6, HELIX.pole * 0.6, HELIX.top - HELIX.bottom + 1.6, 16), [0, (HELIX.top + HELIX.bottom) / 2 + 0.4, TOWER_MID_Z]);
  group.add(core);
  const pillar = new CylinderGeometry(0.3, 0.36, f.top + 0.4, 8);
  f.corners.forEach(([x, z]) => group.add(solid(panel, pillar, [x, (f.top + 0.4) / 2, z])));
  const crown = new CylinderGeometry(f.halfW * 1.2, f.halfW * 1.3, 0.5, 24);
  group.add(solid(panel, crown, [0, f.top + 0.4, f.midZ]));
  group.add(edges(crown, skin.edge, [0, f.top + 0.4, f.midZ]));
}

/* Funnel Chute: a smooth bronze cone with a glowing rim and lip. */
function decorateFunnel(group, skin, { plank, glass }) {
  const f = towerFrame();
  const cone = new Mesh(new CylinderGeometry(FUNNEL.rim, FUNNEL.hole, FUNNEL.rimY - FUNNEL.holeY, 48, 1, true), plank.clone());
  cone.material.side = 2;
  cone.position.set(0, (FUNNEL.rimY + FUNNEL.holeY) / 2 + 0.06, TOWER_MID_Z);
  group.add(cone);
  glassTube(group, skin, FUNNEL.rim + 0.08, FUNNEL.rimY - 0.1, FUNNEL.rimY + 1.6, glass);
  const lip = new Mesh(new TorusGeometry(FUNNEL.hole + 0.02, 0.06, 8, 40), glowMaterial(skin.accent, 1.6));
  lip.rotation.x = Math.PI / 2;
  lip.position.set(0, FUNNEL.holeY, TOWER_MID_Z);
  group.add(lip);
  const bar = new BoxGeometry(0.26, f.top, 0.26);
  f.corners.forEach(([x, z]) => group.add(solid(plank, bar, [x, f.top / 2, z])));
}

/* Peg Drop: glowing caps on every bar's ends and a lit frame. */
function decoratePegs(group, skin, { panel }) {
  const f = towerFrame();
  const cap = glowMaterial(skin.accent, 1.8);
  towerCylinders('pegs').forEach(({ centre, radius, length }) => {
    [-1, 1].forEach((side) => {
      const end = new Mesh(new CylinderGeometry(radius * 1.6, radius * 1.6, 0.08, 16), cap);
      end.rotation.z = Math.PI / 2;
      end.position.set(centre[0] + side * (length / 2 + 0.02), centre[1], centre[2]);
      group.add(end);
    });
  });
  const frame = new BoxGeometry(0.3, f.top + 0.4, 0.3);
  f.corners.forEach(([x, z]) => {
    group.add(solid(panel, frame, [x, (f.top + 0.4) / 2, z]));
    group.add(edges(frame, skin.edge, [x, (f.top + 0.4) / 2, z], 0, 0.8));
  });
  const capTop = new BoxGeometry(f.halfW * 2 + 0.5, 0.3, f.front - f.back + 0.5);
  group.add(solid(panel, capTop, [0, f.top + 0.15, f.midZ]));
  group.add(edges(capTop, skin.edge, [0, f.top + 0.15, f.midZ]));
}

/**
 * Build a design's tower. Returns the group to add to the scene and a
 * dispose() that frees every geometry and material it made.
 */
export function buildTower(skinId) {
  const skin = getTowerSkin(skinId);
  const group = new Group();
  group.name = `dice-tower:${skin.id}`;
  const materials = buildBase(group, skin);
  skin.decorate(group, skin, materials);
  // The moving details: light bands, sigil, mouth sparks and motes.
  const life = createTowerLife(skin);
  group.add(life.group);

  return {
    skin,
    group,
    update: life.update,
    celebrate: life.celebrate,
    busy: life.busy,
    dispose() {
      life.dispose();
      const seen = new Set();
      group.traverse((node) => {
        if (node.geometry && !seen.has(node.geometry)) { seen.add(node.geometry); node.geometry.dispose(); }
        const list = Array.isArray(node.material) ? node.material : [node.material];
        list.filter(Boolean).forEach((material) => {
          if (!seen.has(material)) { seen.add(material); material.dispose(); }
        });
      });
    },
  };
}
