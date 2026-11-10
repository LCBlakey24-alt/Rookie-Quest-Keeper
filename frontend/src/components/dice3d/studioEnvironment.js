/**
 * A small studio for the dice to reflect.
 *
 * A glossy die only looks glossy if there is something to see in it. This
 * builds a dim room with a few soft light panels -- a big warm one overhead,
 * a cooler ledger-blue one to the side and a faint rim behind -- which a
 * PMREM pass turns into an environment map. Each facet then catches a
 * slightly different tone of the room, which is what makes the dice read as
 * solid resin instead of flat-painted card.
 *
 * Built from core three.js classes only (three's own RoomEnvironment is an
 * ES module the test runner cannot load), and kept deliberately dim and
 * neutral so the dye colours stay true.
 */
import { BackSide, BoxGeometry, Color, Mesh, MeshBasicMaterial, PlaneGeometry, Scene } from 'three';

export function createStudioScene() {
  const scene = new Scene();
  const disposables = [];
  const track = (thing) => { disposables.push(thing); return thing; };

  // The room: a dark, slightly warm box seen from inside.
  const room = new Mesh(
    track(new BoxGeometry(10, 8, 10)),
    track(new MeshBasicMaterial({ color: new Color(0x1a1f27), side: BackSide })),
  );
  room.position.y = 2;
  scene.add(room);

  // Light panels are emissive surfaces brighter than white, so the PMREM
  // map holds real highlights rather than grey patches.
  const panel = (width, height, colour, intensity, position, lookAt) => {
    const mesh = new Mesh(
      track(new PlaneGeometry(width, height)),
      track(new MeshBasicMaterial({ color: new Color(colour).multiplyScalar(intensity), side: BackSide })),
    );
    mesh.position.set(...position);
    mesh.lookAt(...lookAt);
    scene.add(mesh);
  };

  panel(5, 5, 0xfff3df, 5.5, [0, 5.9, 0.5], [0, 0, 0]);       // key, overhead and warm
  panel(2.2, 4.5, 0x8fc2ee, 2.2, [-4.9, 2.2, 0], [0, 1, 0]);  // ledger-blue side fill
  panel(4, 1.2, 0xeadfc8, 1.8, [0, 2.5, -4.9], [0, 1, 0]);    // faint parchment rim

  return {
    scene,
    dispose() {
      disposables.forEach((thing) => thing.dispose());
    },
  };
}
