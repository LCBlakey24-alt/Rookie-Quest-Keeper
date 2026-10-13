import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';

export function createViewer(container){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,1,.1,1500);camera.position.set(170,-190,145);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));container.prepend(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,0,45);controls.minDistance=35;controls.maxDistance=650;
  scene.add(new THREE.HemisphereLight(0xffffff,0x17202d,2));
  const key=new THREE.DirectionalLight(0xffffff,2.3);key.position.set(120,-100,220);scene.add(key);
  const fill=new THREE.DirectionalLight(0xffd9a0,1);fill.position.set(-100,100,90);scene.add(fill);
  const grid=new THREE.GridHelper(225,15,0x53627a,0x2b3545);grid.rotation.x=Math.PI/2;grid.position.z=-.05;scene.add(grid);
  const bed=new THREE.Mesh(new THREE.BoxGeometry(225,225,1),new THREE.MeshStandardMaterial({color:0x111722,roughness:.9,metalness:.05,transparent:true,opacity:.45}));bed.position.z=-.6;scene.add(bed);
  let modelRoot=null,overlay=null,baseDims=null;
  function resize(){const r=container.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
  new ResizeObserver(resize).observe(container);
  function clear(obj){if(!obj)return;scene.remove(obj);obj.traverse?.(x=>{x.geometry?.dispose?.();if(x.material){if(Array.isArray(x.material))x.material.forEach(m=>m.dispose?.());else x.material.dispose?.()}})}
  function mat(opacity=.95){return new THREE.MeshStandardMaterial({color:0xd6dae3,roughness:.62,metalness:.08,transparent:opacity<1,opacity,side:THREE.DoubleSide})}
  function normalize(obj){const box=new THREE.Box3().setFromObject(obj),c=box.getCenter(new THREE.Vector3());obj.position.x-=c.x;obj.position.y-=c.y;obj.position.z-=box.min.z;obj.updateMatrixWorld(true);baseDims=new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());return baseDims}
  function fit(d){const m=Math.max(d.x,d.y,d.z,80);controls.target.set(0,0,d.z*.4);camera.position.set(m*1.1,-m*1.35,m*.95);camera.far=Math.max(1500,m*8);camera.updateProjectionMatrix();controls.update()}
  async function parse(file){const b=await file.arrayBuffer();if(file.name.toLowerCase().endsWith('.stl')){const g=new STLLoader().parse(b);g.computeVertexNormals();return new THREE.Mesh(g,mat())}if(file.name.toLowerCase().endsWith('.3mf')){const o=new ThreeMFLoader().parse(b);o.traverse(x=>{if(x.isMesh)x.material=mat()});return o}throw Error('Preview supports STL and 3MF')}
  async function showFile(file,design=false){clear(modelRoot);clear(overlay);overlay=null;modelRoot=await parse(file);scene.add(modelRoot);const d=normalize(modelRoot);if(design)modelRoot.traverse(x=>{if(x.isMesh)x.material=mat(.52)});fit(d);return {x:d.x,y:d.y,z:d.z}}
  function preview(opts){if(!modelRoot||!baseDims)return null;const s=opts.scale/100,rot=opts.rotation;let w=baseDims.x*s,d=baseDims.y*s,h=baseDims.z*s;if(rot===90||rot===270)[w,d]=[d,w];modelRoot.scale.setScalar(s);modelRoot.rotation.z=THREE.MathUtils.degToRad(rot);clear(overlay);overlay=new THREE.Group();const channel=Math.max(44,opts.dice*2.3),cm=new THREE.MeshBasicMaterial({color:0xe1ad58,transparent:true,opacity:.24,wireframe:true});const chute=new THREE.Mesh(new THREE.BoxGeometry(channel,channel,h),cm);chute.position.z=h/2;overlay.add(chute);const tm=new THREE.MeshBasicMaterial({color:0x84d9a1,transparent:true,opacity:.28}),tray=new THREE.Mesh(new THREE.BoxGeometry(w+10,opts.tray,3),tm);tray.position.set(0,-d/2-opts.tray/2+3,1.5);overlay.add(tray);for(let z=h-42,i=0;z>Math.max(30,opts.dice+10)+38&&i<4;z-=42,i++){const b=new THREE.Mesh(new THREE.BoxGeometry(channel*.58,channel-7,4),new THREE.MeshBasicMaterial({color:0xffc970,transparent:true,opacity:.55}));b.rotation.y=THREE.MathUtils.degToRad(i%2?35:-35);b.position.set(i%2?channel*.13:-channel*.13,0,z+8);overlay.add(b)}scene.add(overlay);return {w,d,h,channel,outW:w+10,outD:d+opts.tray+3}}
  function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera)}resize();loop();
  return {showFile,preview,hasModel:()=>!!modelRoot};
}
