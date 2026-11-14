import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshPhysicalMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import { atlasColumns, buildDieGeometry, drawFaceAtlas, faceLayouts } from './dieMesh';
import { shapeForSides } from './diceShapes';

const GRID = [
  [-2.35, 2.05], [0, 2.05], [2.35, 2.05],
  [-2.35, 0], [0, 0], [2.35, 0],
  [-2.35, -2.05], [0, -2.05], [2.35, -2.05],
];

/**
 * Render every dye with the same procedural d20 geometry used by the tray.
 * One canvas means one WebGL context, rather than exhausting mobile GPU
 * context limits with a canvas for every option.
 */
export function createDiceDyeGallery({ canvas, dyes }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new Scene();
  const camera = new OrthographicCamera(-4, 4, 3.25, -3.25, 0.1, 100);
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);

  scene.add(new AmbientLight(0xffffff, 1.15));
  const key = new DirectionalLight(0xfff4df, 3.2);
  key.position.set(-3, 6, 9);
  scene.add(key);
  const rim = new DirectionalLight(0x72baff, 1.55);
  rim.position.set(5, -2, 7);
  scene.add(rim);

  const shape = shapeForSides(20);
  const solid = shape.build();
  const layouts = faceLayouts(solid);
  const columns = atlasColumns(solid.faces.length);

  const entries = dyes.map((dye, index) => {
    const texture = drawFaceAtlas(shape.values, {
      layouts,
      solid,
      glow: dye.glow || null,
      glowStops: dye.glowStops || null,
      columns,
      cellPixels: 128,
      body: dye.body,
      ink: dye.ink,
      size: 20,
      corners: solid.faces[0].length,
    });
    const geometry = buildDieGeometry(solid, columns, {
      edgeColor: new Color(dye.edge).toArray(),
      layouts,
    });
    const material = new MeshPhysicalMaterial({
      map: texture,
      vertexColors: true,
      roughness: 0.4,
      metalness: 0.02,
      clearcoat: 0.82,
      clearcoatRoughness: 0.16,
    });
    const mesh = new Mesh(geometry, material);
    const [x, y] = GRID[index] || [0, 0];
    mesh.position.set(x, y, 0);
    mesh.rotation.set(0.62, -0.52 + (index % 3) * 0.08, 0.12);
    mesh.scale.setScalar(0.72);
    scene.add(mesh);
    return { id: dye.id, mesh };
  });

  let selectedId = null;
  let disposed = false;
  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };

  const resize = (width, height) => {
    if (disposed || !width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.left = -3.25 * aspect;
    camera.right = 3.25 * aspect;
    camera.top = 3.25;
    camera.bottom = -3.25;
    camera.updateProjectionMatrix();
    render();
  };

  const select = (id) => {
    if (selectedId === id) return;
    selectedId = id;
    entries.forEach((entry) => {
      entry.mesh.scale.setScalar(entry.id === id ? 0.82 : 0.72);
    });
    render();
  };

  const dispose = () => {
    disposed = true;
    entries.forEach(({ mesh }) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.dispose();
    });
    renderer.forceContextLoss?.();
    renderer.dispose();
  };

  return { resize, select, dispose };
}

