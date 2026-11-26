/**
 * Dice tower designs.
 *
 * Every tower is the same machine: the tube, baffles, ramp and tray from
 * diceTowerRig.js, built here from the very boxes the physics uses, so what
 * is seen is exactly what the dice hit. A design (a "skin") only chooses
 * the surfaces and adds decoration around the tube -- turned columns, a
 * plinth, a cornice, a crown. It never changes a collider, so every design
 * rolls identically.
 *
 * Surfaces are painted in towerSurfaces.js (wood, stone, iron, marble,
 * gold, lacquer, roof tiles), so a tower reads as something made by hand.
 * Only the neon designs keep a lit outline on their edges.
 *
 * Adding a design is an entry in towerSkinCatalog.js (its name, colours
 * and surfaces) plus a decorate() function here.
 */

import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';

import { FUNNEL, HELIX, TOWER, TOWER_MID_Z, TRAY_HALF, towerBoxes, towerCylinders } from './diceTowerRig';
import { DEFAULT_TOWER_SKIN_ID, TOWER_SKIN_CATALOG, getTowerSkinInfo } from './towerSkinCatalog';
import { createTowerLife } from './towerLife';
import { createSurfaceLibrary, tileBoxUVs, tileRoundUVs } from './towerSurfaces';

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

/** A box whose surface tiles at one size on every face, however long it is. */
function box(width, height, depth) {
  return tileBoxUVs(new BoxGeometry(width, height, depth), width, height, depth);
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

/** A lit outline, only on designs that ask for one (skin.outline). */
function outline(group, skin, geometry, position, strength = 1, rotationX = 0) {
  const opacity = (skin.outline || 0) * strength;
  if (opacity <= 0.01) return null;
  const line = edges(geometry, skin.edge, position, rotationX, Math.min(1, opacity));
  group.add(line);
  return line;
}

/** Glowing trim: an emissive material that ignores the scene's tone mapping. */
function glowMaterial(colour, intensity = 1.6) {
  return new MeshStandardMaterial({ color: colour, emissive: new Color(colour), emissiveIntensity: intensity, toneMapped: false });
}

/**
 * A turned column: a stepped base, a shaft that narrows a little toward the
 * top, and a flared capital. `sides` of 6 gives a faceted (hexagonal) post;
 * `baluster` adds the swell of a lathe-turned wooden post.
 */
function column(radius, height, { sides = 24, baluster = false } = {}) {
  const r = radius;
  const h = height;
  const profile = [
    [r * 1.55, 0], [r * 1.55, 0.22], [r * 1.25, 0.3], [r * 1.3, 0.46], [r * 1.02, 0.6],
  ];
  if (baluster) {
    profile.push([r * 0.8, h * 0.18], [r * 1.18, h * 0.3], [r * 0.78, h * 0.46], [r * 0.86, h * 0.5], [r * 0.78, h * 0.54], [r * 1.12, h * 0.72], [r * 0.8, h * 0.84]);
  } else {
    profile.push([r, h * 0.3], [r * 0.9, h - 0.62]);
  }
  profile.push([r * 1.06, h - 0.5], [r * 1.0, h - 0.4], [r * 1.34, h - 0.24], [r * 1.5, h - 0.2], [r * 1.5, h], [0, h]);
  const geometry = new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), sides);
  return tileRoundUVs(geometry, Math.PI * 2 * r * 2, height);
}

/** A column on each corner of the tube. */
function cornerColumns(group, material, f, radius, options = {}, extraHeight = 0.2) {
  const geometry = column(radius, f.top + extraHeight, options);
  f.corners.forEach(([x, z]) => group.add(solid(material, geometry, [x, 0, z])));
  return geometry;
}

/**
 * A stepped plinth round the sides and back of the tube. The front is left
 * open: that is the mouth the dice leave by.
 */
function plinth(group, material, f, { reach = 0.34, height = 0.5 } = {}) {
  const depth = f.front - f.back;
  const steps = [[reach, height * 0.55], [reach * 0.55, height]];
  steps.forEach(([out, top], index) => {
    const y0 = index === 0 ? 0 : steps[0][1];
    const h = top - y0;
    [-1, 1].forEach((side) => {
      group.add(solid(material, box(out + 0.12, h, depth + out), [side * (f.halfW + out / 2), y0 + h / 2, f.midZ - out / 2]));
    });
    group.add(solid(material, box(f.halfW * 2 + out * 2 + 0.12, h, out + 0.12), [0, y0 + h / 2, f.back - out / 2]));
  });
}

/** A two-step cornice capping the tube at height y. */
function cornice(group, skin, material, f, y, { reach = 0.3 } = {}) {
  const depth = f.front - f.back;
  [[reach, 0.24], [reach * 1.9, 0.18]].forEach(([out, h], index) => {
    const geometry = box(f.halfW * 2 + out * 2, h, depth + out * 2);
    const position = [0, y + (index === 0 ? h / 2 : 0.24 + h / 2), f.midZ];
    group.add(solid(material, geometry, position));
    outline(group, skin, geometry, position, 0.8);
  });
  return y + 0.42;
}

/** A rail across the glass front at height y, with an optional row of studs. */
function frontRail(group, material, f, y, { thickness = 0.2, studs = 0, studMaterial = material, studRadius = 0.08 } = {}) {
  group.add(solid(material, box(f.halfW * 2 + 0.24, thickness, thickness), [0, y, f.front + thickness / 2]));
  if (!studs) return;
  const stud = new SphereGeometry(studRadius, 10, 8);
  for (let i = 0; i < studs; i += 1) {
    const x = -f.halfW + 0.3 + (i * (f.halfW * 2 - 0.6)) / Math.max(1, studs - 1);
    group.add(solid(studMaterial, stud, [x, y, f.front + thickness + studRadius * 0.4]));
  }
}

/** Bands round the two sides and the back of the tube, at each height given. */
function sideBands(group, material, f, heights, { thickness = 0.08, height = 0.26, studs = 0, studMaterial = material } = {}) {
  const depth = f.front - f.back;
  const stud = studs ? new SphereGeometry(0.075, 8, 6) : null;
  heights.forEach((y) => {
    [-1, 1].forEach((side) => {
      const x = side * (f.halfW + thickness / 2);
      group.add(solid(material, box(thickness, height, depth), [x, y, f.midZ]));
      for (let i = 0; i < studs; i += 1) {
        const z = f.back + 0.35 + (i * (depth - 0.7)) / Math.max(1, studs - 1);
        group.add(solid(studMaterial, stud, [x + side * 0.05, y, z]));
      }
    });
    group.add(solid(material, box(f.halfW * 2, height, thickness), [0, y, f.back - thickness / 2]));
  });
}

/**
 * The shared machine: tube walls, glass front, baffles, ramp and the tray
 * rim, drawn from the collider list.
 */
function buildBase(group, skin, surfaces) {
  const kinds = skin.surface || {};
  const panel = surfaces.material(kinds.panel || 'lacquer', skin.panel.color);
  const plank = surfaces.material(kinds.plank || 'lacquer', skin.plank.color);
  const roof = surfaces.material(kinds.roof || kinds.panel || 'lacquer', (skin.roof || skin.panel).color);
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
      const geometry = box(half[0] * 2, TRAY_RIM_HEIGHT, half[2] * 2);
      const position = [centre[0], TRAY_RIM_HEIGHT / 2, centre[2]];
      group.add(solid(panel, geometry, position));
      outline(group, skin, geometry, position, 0.8);
      return;
    }
    const geometry = box(half[0] * 2, half[1] * 2, half[2] * 2);
    const material = part === 'front' ? glass : ['baffle', 'ramp', 'helix', 'funnel', 'deflector'].includes(part) ? plank : panel;
    const mesh = solid(material, geometry, centre, rotationX);
    if (quaternion) mesh.quaternion.set(...quaternion);
    if (part === 'front') mesh.castShadow = false;
    group.add(mesh);
    // The helix and funnel are many small pieces: a faint edge each, not a bright one.
    const line = outline(group, skin, geometry, centre, part === 'front' ? 1.4 : (part === 'helix' || part === 'funnel') ? 0.35 : 1, rotationX);
    if (line && quaternion) line.quaternion.set(...quaternion);
  });

  // Round colliders: the pegs' bars and the spiral's pole.
  towerCylinders(shape).forEach(({ centre, radius, length, axis }) => {
    const mesh = solid(plank, tileRoundUVs(new CylinderGeometry(radius, radius, length, 20), 1, 1), centre);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    group.add(mesh);
  });

  // The tray's own rim: left, right and front, with a rounded cap rail and
  // a turned post at each front corner.
  const t = 0.3;
  [
    [[-TRAY_HALF - t / 2, TRAY_RIM_HEIGHT / 2, 0], [t, TRAY_RIM_HEIGHT, TRAY_HALF * 2 + t * 2]],
    [[TRAY_HALF + t / 2, TRAY_RIM_HEIGHT / 2, 0], [t, TRAY_RIM_HEIGHT, TRAY_HALF * 2 + t * 2]],
    [[0, TRAY_RIM_HEIGHT / 2, TRAY_HALF + t / 2], [TRAY_HALF * 2 + t * 2, TRAY_RIM_HEIGHT, t]],
  ].forEach(([position, size]) => {
    const geometry = box(...size);
    group.add(solid(panel, geometry, position));
    outline(group, skin, geometry, position, 0.8);
  });
  const railRadius = 0.11;
  const sideRail = tileRoundUVs(new CylinderGeometry(railRadius, railRadius, TRAY_HALF * 2 + t * 2, 12), 1, TRAY_HALF * 2);
  [-1, 1].forEach((side) => {
    const rail = solid(plank, sideRail, [side * (TRAY_HALF + t / 2), TRAY_RIM_HEIGHT + railRadius * 0.4, 0]);
    rail.rotation.x = Math.PI / 2;
    group.add(rail);
  });
  const frontRailMesh = solid(plank, sideRail, [0, TRAY_RIM_HEIGHT + railRadius * 0.4, TRAY_HALF + t / 2]);
  frontRailMesh.rotation.z = Math.PI / 2;
  group.add(frontRailMesh);
  const post = column(0.2, TRAY_RIM_HEIGHT + 0.5, { sides: skin.outline ? 6 : 16 });
  [-1, 1].forEach((side) => group.add(solid(plank, post, [side * (TRAY_HALF + t / 2), 0, TRAY_HALF + t / 2])));

  return { panel, plank, roof, glass, surfaces };
}

/** A glass cylinder round the tube's axis, from y0 to y1, with rings. */
function glassTube(group, skin, r, y0, y1, glass, ringMaterial = glowMaterial(skin.edge, 1.2)) {
  const tubeGlass = glass.clone();
  tubeGlass.side = 2; // DoubleSide
  const tube = new Mesh(new CylinderGeometry(r, r, y1 - y0, 48, 1, true), tubeGlass);
  tube.position.set(0, (y0 + y1) / 2, TOWER_MID_Z);
  group.add(tube);
  [y0 + 0.05, (y0 + y1) / 2, y1 - 0.05].forEach((y) => {
    const ring = new Mesh(new TorusGeometry(r + 0.04, 0.06, 8, 48), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, TOWER_MID_Z);
    ring.castShadow = true;
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

/* Midnight Spire: faceted lacquer pillars, bands of light, a hexagon crown
   and a tiled spire. The one design that keeps its lit edges. */
function decorateSpire(group, skin, { panel, plank, roof }) {
  const f = towerFrame();
  plinth(group, panel, f);
  const pillar = cornerColumns(group, plank, f, 0.3, { sides: 6 }, 0.4);
  f.corners.forEach(([x, z]) => outline(group, skin, pillar, [x, 0, z], 0.9));
  const glow = glowMaterial(skin.accent, 1.4);
  [3.6, 7.2, f.top - 0.7].forEach((y) => {
    group.add(solid(glow, new BoxGeometry(f.halfW * 2 + 0.5, 0.07, 0.07), [0, y, f.front + 0.05]));
  });
  sideBands(group, plank, f, [3.6, 7.2, 10.8]);
  const capTop = cornice(group, skin, panel, f, f.top);
  const crownWidth = f.halfW * 1.85;
  const crown = new CylinderGeometry(crownWidth, crownWidth * 1.06, 0.6, 6);
  group.add(solid(plank, crown, [0, capTop + 0.3, f.midZ]));
  outline(group, skin, crown, [0, capTop + 0.3, f.midZ], 2);
  const spire = tileRoundUVs(new ConeGeometry(crownWidth * 0.78, 2.4, 6), 10, 3);
  group.add(solid(roof, spire, [0, capTop + 1.8, f.midZ]));
  outline(group, skin, spire, [0, capTop + 1.8, f.midZ], 1.4);
  group.add(solid(glow, new SphereGeometry(0.22, 16, 12), [0, capTop + 3.2, f.midZ]));
  const finial = new SphereGeometry(0.13, 12, 8);
  f.corners.forEach(([x, z]) => group.add(solid(glow, finial, [x, f.top + 0.55, z])));
}

/* Gilded Reliquary: marble walls, turned gold columns, studded gold rails
   and a ribbed arch under a haloed urn. */
function decorateReliquary(group, skin, { panel, plank }) {
  const f = towerFrame();
  plinth(group, panel, f, { reach: 0.42, height: 0.6 });
  cornerColumns(group, plank, f, 0.24, { sides: 28 });
  [1.2, 5.2, 9.2, f.top - 0.25].forEach((y) => frontRail(group, plank, f, y, { studs: 5, studRadius: 0.1 }));
  sideBands(group, plank, f, [1.2, 5.2, 9.2, f.top - 0.25], { height: 0.2, studs: 4 });
  const capTop = cornice(group, skin, plank, f, f.top, { reach: 0.34 });
  const depth = f.front - f.back + 0.3;
  const arch = new CylinderGeometry(f.halfW + 0.1, f.halfW + 0.1, depth, 32, 1, false, 0, Math.PI);
  const archMesh = solid(panel, tileRoundUVs(arch, 8, depth), [0, capTop, f.midZ]);
  archMesh.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  group.add(archMesh);
  // Gold ribs over the arch, front to back.
  const rib = new TorusGeometry(f.halfW + 0.12, 0.09, 8, 32, Math.PI);
  [f.front + 0.1, f.midZ, f.back - 0.1].forEach((z) => group.add(solid(plank, rib, [0, capTop, z])));
  const urn = new LatheGeometry([[0, 0], [0.34, 0], [0.2, 0.14], [0.14, 0.3], [0.36, 0.56], [0.4, 0.8], [0.24, 1.02], [0.12, 1.12], [0.16, 1.2], [0, 1.3]].map(([x, y]) => new Vector2(x, y)), 24);
  const urnY = capTop + f.halfW + 0.05;
  group.add(solid(plank, urn, [0, urnY, f.midZ]));
  const halo = new TorusGeometry(0.46, 0.06, 10, 32);
  group.add(solid(glowMaterial(skin.edge, 0.9), halo, [0, urnY + 1.75, f.midZ]));
}

/* Ember Forge: hammered iron bound with riveted straps, angle-iron corners,
   glowing vents, a bed of coals and a flared chimney. */
function decorateForge(group, skin, { panel, plank, roof }) {
  const f = towerFrame();
  const depth = f.front - f.back;
  plinth(group, plank, f, { reach: 0.5, height: 0.7 });
  // Angle iron up each corner.
  f.corners.forEach(([x, z]) => {
    group.add(solid(plank, box(0.34, f.top, 0.1), [x, f.top / 2, z + (z > f.midZ ? 0.05 : -0.05)]));
    group.add(solid(plank, box(0.1, f.top, 0.34), [x + Math.sign(x) * 0.05, f.top / 2, z]));
  });
  const strapHeights = [1.4, 4.6, 7.8, 11.0, f.top - 0.4];
  strapHeights.forEach((y) => frontRail(group, plank, f, y, { thickness: 0.16, studs: 7, studRadius: 0.085 }));
  sideBands(group, plank, f, strapHeights, { height: 0.3, studs: 6 });
  const vent = glowMaterial(skin.accent, 2.0);
  [3.0, 6.2, 9.4, 12.6].forEach((y) => {
    [-1, 1].forEach((side) => {
      [-0.5, 0, 0.5].forEach((dz) => group.add(solid(vent, new BoxGeometry(0.06, 0.5, 0.12), [side * (f.halfW + 0.02), y, f.midZ + dz])));
    });
  });
  // Coals glowing through a grate at the foot of each side.
  [-1, 1].forEach((side) => {
    group.add(solid(vent, new BoxGeometry(0.05, 0.3, depth * 0.6), [side * (f.halfW + 0.03), 1.0, f.midZ]));
    for (let i = 0; i < 5; i += 1) {
      group.add(solid(plank, box(0.1, 0.5, 0.07), [side * (f.halfW + 0.07), 1.0, f.midZ - depth * 0.3 + (i * depth * 0.6) / 4]));
    }
  });
  const capTop = cornice(group, skin, plank, f, f.top, { reach: 0.36 });
  const chimney = new LatheGeometry([[0.72, 0], [0.74, 0.2], [0.56, 0.36], [0.5, 1.7], [0.6, 1.9], [0.7, 2.3], [0.62, 2.36], [0.46, 2.3], [0.46, 2.0]].map(([x, y]) => new Vector2(x, y)), 20);
  group.add(solid(roof, tileRoundUVs(chimney, 4, 2.4), [0.9, capTop, f.midZ - 0.4]));
  group.add(solid(vent, new CylinderGeometry(0.44, 0.44, 0.05, 16), [0.9, capTop + 2.05, f.midZ - 0.4]));
  // A smaller capped flue beside it.
  group.add(solid(roof, new CylinderGeometry(0.2, 0.24, 1.3, 12), [-1.2, capTop + 0.65, f.midZ + 0.6]));
  group.add(solid(roof, new ConeGeometry(0.34, 0.3, 12), [-1.2, capTop + 1.45, f.midZ + 0.6]));
}

/* Spiral Glass: a stone turret -- columns, a battlemented ring and a tiled
   roof -- round a glass tube with a glowing core. */
function decorateSpiral(group, skin, { panel, roof, glass, surfaces }) {
  const f = towerFrame();
  const brass = surfaces.material('gold', '#b9933f');
  plinth(group, panel, f, { reach: 0.5, height: 0.7 });
  glassTube(group, skin, HELIX.outer + 0.1, HELIX.bottom - 0.4, HELIX.top + 1.2, glass, brass);
  const core = solid(glowMaterial(skin.accent, 1.1), new CylinderGeometry(HELIX.pole * 0.6, HELIX.pole * 0.6, HELIX.top - HELIX.bottom + 1.6, 16), [0, (HELIX.top + HELIX.bottom) / 2 + 0.4, TOWER_MID_Z]);
  group.add(core);
  cornerColumns(group, panel, f, 0.3, { sides: 20 });
  sideBands(group, panel, f, [4.8, 9.6], { thickness: 0.12, height: 0.34 });
  const capTop = cornice(group, skin, panel, f, f.top, { reach: 0.3 });
  const ringRadius = f.halfW * 1.28;
  const ring = tileRoundUVs(new CylinderGeometry(ringRadius, ringRadius * 0.94, 0.7, 32), Math.PI * 2 * ringRadius, 0.7);
  group.add(solid(panel, ring, [0, capTop + 0.35, f.midZ]));
  // Battlements round the ring.
  const merlon = box(0.5, 0.5, 0.34);
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const mesh = solid(panel, merlon, [Math.sin(angle) * (ringRadius - 0.17), capTop + 0.95, f.midZ + Math.cos(angle) * (ringRadius - 0.17)]);
    mesh.rotation.y = angle;
    group.add(mesh);
  }
  const cone = tileRoundUVs(new ConeGeometry(ringRadius * 0.86, 3.0, 28), 12, 4);
  group.add(solid(roof, cone, [0, capTop + 2.2, f.midZ]));
  group.add(solid(brass, new SphereGeometry(0.16, 12, 10), [0, capTop + 3.8, f.midZ]));
  group.add(solid(glowMaterial(skin.accent, 1.3), new SphereGeometry(0.1, 12, 8), [0, capTop + 4.05, f.midZ]));
}

/* Funnel Chute: a walnut cabinet with lathe-turned posts and bronze
   fittings round a bronze funnel. */
function decorateFunnel(group, skin, { panel, plank, roof, glass, surfaces }) {
  const f = towerFrame();
  plinth(group, panel, f, { reach: 0.44, height: 0.6 });
  const bronze = surfaces.material('gold', skin.plank.color, { side: 2 });
  const cone = new Mesh(tileRoundUVs(new CylinderGeometry(FUNNEL.rim, FUNNEL.hole, FUNNEL.rimY - FUNNEL.holeY, 48, 1, true), 8, 2), bronze);
  cone.position.set(0, (FUNNEL.rimY + FUNNEL.holeY) / 2 + 0.06, TOWER_MID_Z);
  cone.castShadow = true;
  group.add(cone);
  glassTube(group, skin, FUNNEL.rim + 0.08, FUNNEL.rimY - 0.1, FUNNEL.rimY + 1.6, glass, plank);
  const lip = new Mesh(new TorusGeometry(FUNNEL.hole + 0.02, 0.06, 8, 40), glowMaterial(skin.accent, 1.6));
  lip.rotation.x = Math.PI / 2;
  lip.position.set(0, FUNNEL.holeY, TOWER_MID_Z);
  group.add(lip);
  cornerColumns(group, panel, f, 0.26, { sides: 24, baluster: true });
  [1.2, f.top - 0.3].forEach((y) => frontRail(group, panel, f, y, { thickness: 0.24, studs: 4, studMaterial: plank, studRadius: 0.1 }));
  sideBands(group, plank, f, [1.2, 7.2, f.top - 0.3], { height: 0.16, studs: 5 });
  const capTop = cornice(group, skin, roof, f, f.top, { reach: 0.34 });
  // A low hipped lid with a bronze knob.
  const lid = tileRoundUVs(new ConeGeometry(f.halfW * 1.5, 1.1, 4), 12, 2);
  const lidMesh = solid(roof, lid, [0, capTop + 0.55, f.midZ]);
  lidMesh.rotation.y = Math.PI / 4;
  group.add(lidMesh);
  const knob = new LatheGeometry([[0, 0], [0.2, 0], [0.1, 0.12], [0.22, 0.3], [0.2, 0.44], [0, 0.52]].map(([x, y]) => new Vector2(x, y)), 16);
  group.add(solid(plank, knob, [0, capTop + 1.05, f.midZ]));
  const ball = new SphereGeometry(0.2, 14, 10);
  f.corners.forEach(([x, z]) => group.add(solid(plank, ball, [x, f.top + 0.36, z])));
}

/* Peg Drop: an oak frame with turned posts, brass bars capped in warm
   light, and a pediment board on top. */
function decoratePegs(group, skin, { panel, plank, roof }) {
  const f = towerFrame();
  plinth(group, panel, f, { reach: 0.4, height: 0.56 });
  const cap = glowMaterial(skin.accent, 1.5);
  const collar = new TorusGeometry(1, 0.35, 8, 16);
  towerCylinders('pegs').forEach(({ centre, radius, length }) => {
    [-1, 1].forEach((side) => {
      const end = new Mesh(new CylinderGeometry(radius * 1.5, radius * 1.5, 0.08, 16), cap);
      end.rotation.z = Math.PI / 2;
      end.position.set(centre[0] + side * (length / 2 + 0.02), centre[1], centre[2]);
      group.add(end);
      const ring = solid(plank, collar, [centre[0] + side * (length / 2 - 0.06), centre[1], centre[2]]);
      ring.rotation.y = Math.PI / 2;
      ring.scale.setScalar(radius * 1.15);
      group.add(ring);
    });
  });
  cornerColumns(group, panel, f, 0.26, { sides: 24, baluster: true });
  [1.2, f.top - 0.3].forEach((y) => frontRail(group, panel, f, y, { thickness: 0.24, studs: 5, studMaterial: plank, studRadius: 0.09 }));
  sideBands(group, plank, f, [1.2, 5.6, 10.0, f.top - 0.3], { height: 0.14, studs: 4 });
  const capTop = cornice(group, skin, roof, f, f.top, { reach: 0.32 });
  // A pediment: a board with a brass roundel, between two finials.
  group.add(solid(roof, box(f.halfW * 1.5, 1.0, 0.26), [0, capTop + 0.5, f.front + 0.1]));
  const roundel = solid(plank, new CylinderGeometry(0.34, 0.34, 0.1, 6), [0, capTop + 0.5, f.front + 0.26]);
  roundel.rotation.x = Math.PI / 2;
  group.add(roundel);
  group.add(solid(cap, new SphereGeometry(0.12, 12, 8), [0, capTop + 0.5, f.front + 0.34]));
  const finial = new LatheGeometry([[0, 0], [0.2, 0], [0.12, 0.14], [0.22, 0.36], [0.1, 0.62], [0, 0.82]].map(([x, y]) => new Vector2(x, y)), 16);
  f.corners.forEach(([x, z]) => group.add(solid(plank, finial, [x, f.top + 0.2, z])));
}

/**
 * Build a design's tower. Returns the group to add to the scene and a
 * dispose() that frees every geometry and material it made.
 */
export function buildTower(skinId) {
  const skin = getTowerSkin(skinId);
  const group = new Group();
  group.name = `dice-tower:${skin.id}`;
  const surfaces = createSurfaceLibrary();
  const materials = buildBase(group, skin, surfaces);
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
      surfaces.dispose();
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
