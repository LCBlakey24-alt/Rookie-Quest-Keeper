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

/**
 * Render one selected physical d20 at a time. All materials share a single
 * WebGL context, and hidden meshes make changing dye instant without showing
 * nine cramped dice at once.
 */
export function createDiceDyeGallery({ canvas, dyes, sides = 20, layout = 'wheel' }) {
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

  const shape = shapeForSides(sides);
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
    const angle = (index / Math.max(1, dyes.length)) * Math.PI * 2 + Math.PI / 2;
    const radius = layout === 'wheel' ? 2.42 : 0;
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    mesh.rotation.set(0.62, -0.52 + (index % 3) * 0.04, 0.12);
    mesh.scale.setScalar(layout === 'wheel' ? 0.56 : 1.38);
    mesh.visible = layout === 'wheel';
    scene.add(mesh);
    return { id: dye.id, index, mesh };
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
    const selectedIndex = Math.max(0, entries.findIndex((entry) => entry.id === id));
    entries.forEach((entry) => {
      if (layout === 'wheel') {
        const angle = ((entry.index - selectedIndex) / Math.max(1, entries.length)) * Math.PI * 2 + Math.PI / 2;
        entry.mesh.position.set(Math.cos(angle) * 2.42, Math.sin(angle) * 2.42, 0);
      }
      entry.mesh.visible = layout === 'wheel' || entry.id === id;
      entry.mesh.scale.setScalar(layout === 'wheel'
        ? (entry.id === id ? 0.68 : 0.56)
        : 1.38);
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

