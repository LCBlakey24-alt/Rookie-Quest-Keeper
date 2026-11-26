/**
 * Small pictures of each dice tower design, for the Settings picker.
 *
 * Every design is built with the same builder the real roll uses and
 * photographed from the roll's own wide shot, so the picture is the tower
 * the player will get. One short-lived WebGL context renders them all (never
 * one per design), then it is released; the pictures are plain image data.
 *
 * This file pulls in three.js, so the picker loads it lazily and only when
 * the tower is chosen. If WebGL is unavailable it returns nothing and the
 * picker keeps its colour swatches.
 */

import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

import { towerWideShot } from './diceTrayScene';
import { createStudioScene } from './studioEnvironment';
import { buildTower } from './towerSkins';

export const THUMBNAIL_WIDTH = 132;
export const THUMBNAIL_HEIGHT = 176;
const FOV = 35;

/** { [skinId]: 'data:image/png…' } for every design that could be drawn. */
export function captureTowerThumbnails(skinIds = [], { width = THUMBNAIL_WIDTH, height = THUMBNAIL_HEIGHT } = {}) {
  const images = {};
  if (typeof document === 'undefined' || !skinIds.length) return images;

  let renderer;
  let environment;
  try {
    const canvas = document.createElement('canvas');
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const studio = createStudioScene();
    environment = pmrem.fromScene(studio.scene, 0.04).texture;
    studio.dispose();
    pmrem.dispose();
    scene.environment = environment;
    scene.add(new AmbientLight(0xffffff, 0.45));
    const key = new DirectionalLight(0xfff6e8, 2.6);
    key.position.set(3.2, 12, 4.2);
    scene.add(key);
    const rim = new DirectionalLight(0xffd6e8, 1.1);
    rim.position.set(-2.5, 3.5, -6.5);
    scene.add(rim);

    const camera = new PerspectiveCamera(FOV, width / height, 0.1, 200);
    const shot = towerWideShot(FOV, width / height);
    camera.position.set(...shot.position);
    camera.lookAt(...shot.target);

    skinIds.forEach((id) => {
      let tower;
      try {
        tower = buildTower(id);
        scene.add(tower.group);
        // One still frame, with the sigil lit as it is in the wide shot.
        tower.update?.(0, { dice: [], dropping: false });
        renderer.render(scene, camera);
        const data = canvas.toDataURL('image/png');
        if (data && data.startsWith('data:image/png')) images[id] = data;
      } catch (error) {
        // This design keeps its swatch; the others can still be drawn.
      } finally {
        if (tower) { scene.remove(tower.group); tower.dispose(); }
      }
    });
  } catch (error) {
    // No WebGL: the picker keeps its swatches.
  } finally {
    environment?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss?.();
  }
  return images;
}
