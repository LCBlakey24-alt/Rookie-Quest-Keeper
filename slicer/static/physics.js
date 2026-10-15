// Rookie Quest Chute Lab: genuine rigid-body drop with collision geometry.
// Physics supplied by cannon-es 0.20.0 (MIT). No scripted guide-path motion.
let cannonPromise;
async function engine(){
  cannonPromise ||= import('https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm').catch(error=>{cannonPromise=null;throw error;});
  return cannonPromise;
}
function D20(THREE,CANNON,diameter){
  const radius=diameter/2;
  const g=new THREE.IcosahedronGeometry(radius,0);
  const a=g.getAttribute('position'),unique=new Map(),verts=[],faces=[];
  for(let i=0;i<a.count;i+=3){
    const face=[];
    for(let j=0;j<3;j++){
      const k=i+j,p=[a.getX(k),a.getY(k),a.getZ(k)];
      const key=p.map(v=>v.toFixed(5)).join(',');
      if(!unique.has(key)){unique.set(key,verts.length);verts.push(new CANNON.Vec3(...p));}
      face.push(unique.get(key));
    }
    faces.push(face);
  }
  g.dispose();
  return new CANNON.ConvexPolyhedron({vertices:verts,faces});
}
function makeCollisionBodies(THREE,CANNON,world,root,demo){
  const colliders=[];let triangles=0;
  root.updateMatrixWorld(true);
  root.traverse(mesh=>{
    if(!mesh.isMesh || !mesh.geometry)return;
    if(demo && !mesh.userData.rqCollider)return;
    const body=new CANNON.Body({mass:0});
    if(demo && mesh.geometry.type==='BoxGeometry'){
      const params=mesh.geometry.parameters;
      // Every procedural piece is a real static box, including sloped baffles.
      const pos=mesh.getWorldPosition(new THREE.Vector3());
      const quat=mesh.getWorldQuaternion(new THREE.Quaternion());
      const sc=mesh.getWorldScale(new THREE.Vector3());
      body.addShape(new CANNON.Box(new CANNON.Vec3(
        Math.abs(params.width*sc.x)/2,Math.abs(params.height*sc.y)/2,Math.abs(params.depth*sc.z)/2
      )));
      body.position.set(pos.x,pos.y,pos.z);
      body.quaternion.set(quat.x,quat.y,quat.z,quat.w);
    }else{
      const g=mesh.geometry,pos=g.getAttribute('position'),idx=g.getIndex();
      if(!pos)return;
      const faceCount=(idx?idx.count:pos.count)/3;
      triangles+=faceCount;
      if(triangles>180000)throw Error('This STL has over 180,000 collision triangles. Reduce its mesh first; the test will not silently substitute a simpler shape.');
      const transformed=[],inds=[];
      // Non-indexed mesh is accepted. Transform vertices into world coordinates
      // so the static triangle collider matches the displayed STL exactly.
      const count=idx?idx.count:pos.count;
      const p=new THREE.Vector3();
      for(let i=0;i<count;i++){
        const at=idx?idx.getX(i):i;
        p.fromBufferAttribute(pos,at).applyMatrix4(mesh.matrixWorld);
        if(![p.x,p.y,p.z].every(Number.isFinite))throw Error('Invalid mesh coordinates in STL.');
        transformed.push(p.x,p.y,p.z);inds.push(i);
      }
      body.addShape(new CANNON.Trimesh(transformed,inds));
    }
    body.rqTray=!!mesh.userData.rqTray;
    world.addBody(body);colliders.push(body);
  });
  if(!colliders.length)throw Error('No solid collision surfaces found.');
  return {triangles,surfaces:colliders.length};
}
export async function dropD20({THREE,scene,root,diameter=22,demo=false,style='zigzag',onPose,aborted,trace,onContact}){
  const CANNON=await engine();
  if(aborted())return {ok:false,cancelled:true,message:'Test cancelled.'};
  const world=new CANNON.World({gravity:new CANNON.Vec3(0,0,-9810)});
  world.broadphase=new CANNON.SAPBroadphase(world);
  world.solver.iterations=18;
  world.defaultContactMaterial.friction=.46;
  world.defaultContactMaterial.restitution=.19;
  world.defaultContactMaterial.contactEquationRelaxation=3;
  const colliderInfo=makeCollisionBodies(THREE,CANNON,world,root,demo);
  const bbox=new THREE.Box3().setFromObject(root),height=bbox.max.z;
  const radius=diameter/2;
  const start=new THREE.Vector3(0,0,height+radius+7);
  if(demo){
    // Demo root is centered on the tower shaft, and the tray is in front.
    const entrance=style==='spiral'?[0,-24]:[0,0];
    start.set(entrance[0],entrance[1],174).applyMatrix4(root.matrixWorld);
    start.z+=radius+8;
  }
  const body=new CANNON.Body({
    mass:25,
    position:new CANNON.Vec3(start.x+(Math.random()-.5)*3,start.y+(Math.random()-.5)*3,start.z),
    linearDamping:.025,angularDamping:.15,
    allowSleep:true,sleepSpeedLimit:2,sleepTimeLimit:1.1
  });
  body.addShape(D20(THREE,CANNON,diameter));
  // Repeatability matters: the test has a modest starting tilt and spin,
  // not a random track-snap or a forced direction towards the tray.
  body.quaternion.setFromEuler(.24+Math.random()*.22,.12+Math.random()*.21,.16+Math.random()*.25);
  body.angularVelocity.set(2.1+Math.random()*2.5,-3.3+Math.random()*2.2,1.6+Math.random()*2.5);
  world.addBody(body);
  let contacts=0,trayContacts=0,worldTime=0,last=performance.now(),acc=0,reach=false,previous=null;
  const tracePoints=[],limit=3.7;
  body.addEventListener('collide',event=>{contacts++;if(event.body?.rqTray)trayContacts++;onContact?.(contacts)});
  const inverse=root.matrixWorld.clone().invert();
  const initialHeight=start.z;
  return await new Promise(resolve=>{
    function frame(t){
      if(aborted()){resolve({ok:false,cancelled:true,message:'Test cancelled.'});return;}
      const elapsed=Math.min(.04,(t-last)/1000);last=t;
      // Render in quarter-speed slow motion, but integrate actual gravity
      // with a fixed 1/360 s time step for reliable contact calculations.
      acc+=elapsed*.25;
      let sub=0;
      while(acc>=1/360&&sub<16&&worldTime<limit){
        world.step(1/360);worldTime+=1/360;acc-=1/360;sub++;
      }
      const position=new THREE.Vector3(body.position.x,body.position.y,body.position.z);
      if(![position.x,position.y,position.z].every(Number.isFinite)){
        resolve({ok:false,message:'Physics simulation became unstable.',contacts});return;
      }
      onPose({position,quaternion:new THREE.Quaternion(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w)});
      if(!previous || previous.distanceToSquared(position)>5){
        tracePoints.push(position.clone());previous=position.clone();
        if(tracePoints.length>750)tracePoints.shift();
      }
      const local=position.clone().applyMatrix4(inverse);
      // Do not declare success just because the die passed a waypoint;
      // it must have reached the lower external tray, after real impacts.
      if(demo){
        if(local.y < -63 && local.y > -190 &&
           Math.abs(local.x)<66 && local.z>radius*.7 &&
           local.z<37 && trayContacts>0)reach=true;
      }else{
        // Imported/generated STL is used as the *actual collider*. The exit zone
        // is an approximate front-bottom region, not proof of a correct catch tray.
        const halfY=(bbox.max.y-bbox.min.y)/2;
        if(position.y<bbox.min.y+halfY*.23 &&
           position.z<bbox.min.z+radius+28 && contacts>0)reach=true;
      }
      const escaped=Math.abs(position.x)>Math.max(170,bbox.max.x+65) ||
        Math.abs(position.y)>Math.max(230,Math.abs(bbox.min.y)+95) ||
        position.z<-75;
      const settled=body.sleepState===CANNON.Body.SLEEPING && worldTime>.6;
      if(reach||escaped||worldTime>=limit||settled){
        trace?.(tracePoints);
        const ok=reach;
        const outcome=ok?'reached_tray':escaped?'escaped':settled?'jammed_or_settled':'timed_out';
        let message=ok?(demo?'The freely moving D20 reached the sample catch tray after colliding with solid geometry.':'The D20 reached the lower-front region of the imported mesh; inspect the tray manually.')
          :escaped?'The die escaped the structure or fell outside the tray.'
          :settled?'The D20 stopped without reaching the tray: possible jam or dead end.'
          :'Time limit reached before a successful drop: possible jam or an unsuitable route.';
        resolve({ok,outcome,contacts,simulatedSeconds:+worldTime.toFixed(2),
          frames:tracePoints.length,final:[+position.x.toFixed(1),+position.y.toFixed(1),+position.z.toFixed(1)],
          triangles:colliderInfo.triangles,surfaces:colliderInfo.surfaces,trayContacts,message});
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
