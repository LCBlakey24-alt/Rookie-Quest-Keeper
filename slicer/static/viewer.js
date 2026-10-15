import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { dropD20 } from './physics.js';

export function createViewer(container){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,1,.1,1800);camera.position.set(170,-190,145);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));container.prepend(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,0,45);controls.minDistance=35;controls.maxDistance=750;
  scene.add(new THREE.HemisphereLight(0xffffff,0x17202d,2));
  const key=new THREE.DirectionalLight(0xffffff,2.3);key.position.set(120,-100,220);scene.add(key);
  const fill=new THREE.DirectionalLight(0xffd9a0,1);fill.position.set(-100,100,90);scene.add(fill);
  const grid=new THREE.GridHelper(225,15,0x53627a,0x2b3545);grid.rotation.x=Math.PI/2;grid.position.z=-.05;scene.add(grid);
  const bed=new THREE.Mesh(new THREE.BoxGeometry(225,225,1),new THREE.MeshStandardMaterial({color:0x111722,roughness:.9,metalness:.05,transparent:true,opacity:.45}));bed.position.z=-.6;scene.add(bed);

  let modelRoot=null,overlay=null,baseDims=null,isMeshRoot=false;
  let lastTowerPath=null,lastTowerDiagnostics=null,simDice=null,simRun=0,demoMode=false,demoParts=null,demoTray=null;

  function resize(){const r=container.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
  new ResizeObserver(resize).observe(container);
  function clear(obj){if(!obj)return;scene.remove(obj);obj.traverse?.(x=>{x.geometry?.dispose?.();if(x.material){if(Array.isArray(x.material))x.material.forEach(m=>m.dispose?.());else x.material.dispose?.()}})}
  function mat(opacity=.95,color=0xd6dae3){return new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.08,transparent:opacity<1,opacity,side:THREE.DoubleSide})}

  function normalize(obj){
    const box=new THREE.Box3().setFromObject(obj),c=box.getCenter(new THREE.Vector3());
    isMeshRoot=!!obj.isMesh;
    if(obj.isMesh){
      obj.geometry.translate(-c.x,-c.y,-box.min.z);
      obj.geometry.computeBoundingBox();
      obj.position.set(0,0,0);
    }else{
      obj.position.x-=c.x;obj.position.y-=c.y;obj.position.z-=box.min.z;
    }
    obj.rotation.set(0,0,0);obj.scale.set(1,1,1);obj.updateMatrixWorld(true);
    baseDims=new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    return baseDims;
  }

  function fit(d){
    const m=Math.max(d.x,d.y,d.z,80);
    controls.target.set(0,0,d.z*.4);
    camera.position.set(m*1.1,-m*1.35,m*.95);
    camera.far=Math.max(1800,m*8);camera.updateProjectionMatrix();controls.update();
  }

  async function parse(file){
    const b=await file.arrayBuffer();
    if(file.name.toLowerCase().endsWith('.stl')){
      const g=new STLLoader().parse(b);g.computeVertexNormals();return new THREE.Mesh(g,mat());
    }
    if(file.name.toLowerCase().endsWith('.3mf')){
      const o=new ThreeMFLoader().parse(b);o.traverse(x=>{if(x.isMesh)x.material=mat()});return o;
    }
    throw Error('Preview supports STL and 3MF');
  }

  async function showFile(file,design=false){
    simRun++;
    clear(simDice);simDice=null;
    clear(modelRoot);clear(overlay);overlay=null;
    demoMode=false;demoParts=null;demoTray=null;
    modelRoot=await parse(file);scene.add(modelRoot);
    const d=normalize(modelRoot);
    if(design)modelRoot.traverse(x=>{if(x.isMesh)x.material=mat(.34,0xaebbd0)});
    fit(d);
    return {x:d.x,y:d.y,z:d.z};
  }

  // Physical Gothic sample: every wall, sloped ramp and tray piece
  // is a box mesh used unchanged as a rigid-body collision surface.
  function showDemoTower(){
    simRun++;
    clear(simDice);simDice=null;
    clear(modelRoot);clear(overlay);overlay=null;
    demoMode=true;
    const group=new THREE.Group();
    function block(parent,x,y,z,w,d,h,color=0x9baabd,rx=0,ry=0,rz=0,alpha=.55){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),mat(alpha,color));
      mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);
      mesh.userData.rqCollider=true;
      parent.add(mesh);
      return mesh;
    }
    // Open top with central void; the front has a 54 mm wide exit.
    block(group,-52,0,78,9,102,148);
    block(group,52,0,78,9,102,148);
    block(group,0,47,78,108,8,148);
    block(group,-39,-47,79,24,8,146);
    block(group,39,-47,79,24,8,146);
    block(group,0,-47,119,54,8,66);
    block(group,0,0,4,107,105,8,0x647f9e);
    for(const z of [56,135]){
      block(group,-53,0,z,5,111,5,0x758da4);
      block(group,53,0,z,5,111,5,0x758da4);
    }
    for(const x of [-48,-24,0,24,48]){
      for(const y of [-48,48])block(group,x,y,164,16,13,18,0x7894ae);
    }
    for(const x of [-53,53]){
      for(const y of [-24,0,24])block(group,x,y,164,13,16,18,0x7894ae);
    }
    demoParts=new THREE.Group();group.add(demoParts);
    demoTray=new THREE.Group();group.add(demoTray);
    modelRoot=group;scene.add(modelRoot);isMeshRoot=false;
    baseDims=new THREE.Vector3(108,108,174);
    // Geometry extends further in front for the tray; do not normalize
    // that footprint or the physical entrance would move away from the shaft.
    fit(new THREE.Vector3(148,232,174));
    return {x:108,y:108,z:174};
  }

  function configureDemoChute(style,trayDepth,trayX,dice,chuteX=0,chuteY=0){
    if(!demoMode||!demoParts||!demoTray)return;
    for(const group of [demoParts,demoTray]){
      for(const child of [...group.children]){
        group.remove(child);child.geometry?.dispose?.();child.material?.dispose?.();
      }
    }
    function solid(parent,x,y,z,w,d,h,color,rx=0,ry=0,rz=0){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),mat(.83,color));
      mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);
      mesh.userData.rqCollider=true;parent.add(mesh);return mesh;
    }
    // A real ramp spans the base of the tower and slopes out of the exit.
    solid(demoParts,0,-18,26,66,101,4,0xffc878,.34);
    const d=Math.max(50,Math.min(100,Number(trayDepth)||70));
    const x=Number(trayX)||0,ty=-54-d/2;
    solid(demoTray,x,ty,4,118,d,7,0x779fbe);
    solid(demoTray,x-57,ty,16,5,d,23,0x779fbe);
    solid(demoTray,x+57,ty,16,5,d,23,0x779fbe);
    solid(demoTray,x,-54-d,16,118,5,23,0x779fbe);
    if(style==='zigzag'){
      // Alternating broad, tilted ledges leave opposing free gaps of ~36 mm.
      // The die has to bounce, roll and fall under gravity: no scripted route.
      solid(demoParts,-21,0,132,66,78,5,0xf9b85c,0,.22);
      solid(demoParts,21,0,96,66,78,5,0xf9b85c,0,-.22);
      solid(demoParts,-21,0,61,66,78,5,0xf9b85c,0,.22);
    }else if(style==='spiral'){
      // Overlapping physical helical ramp segments with side guard rails.
      // If the die falls through a gap or jams, that is a genuine failed run.
      const turns=2.1,segments=48,radius=24,top=150,drop=113;
      const tilt=-Math.atan(drop/(Math.PI*2*turns*radius));
      for(let i=0;i<segments;i++){
        const t=(i+.5)/segments,a=t*turns*Math.PI*2-Math.PI/2;
        const x=radius*Math.cos(a),y=radius*Math.sin(a),z=top-drop*t;
        solid(demoParts,x,y,z,35,16,3,0xe4b96c,tilt,0,a);
        solid(demoParts,x*1.69,y*1.69,z+9,4,18,21,0xb6cbdd,0,0,a);
        solid(demoParts,x*.38,y*.38,z+7,4,16,16,0xb6cbdd,0,0,a);
      }
    }
    demoParts.position.set(Number(chuteX)||0,Number(chuteY)||0,0);
    modelRoot.updateMatrixWorld(true);
  }

  function resetTransform(){
    if(!modelRoot)return;
    modelRoot.scale.set(1,1,1);modelRoot.rotation.set(0,0,0);
    if(isMeshRoot)modelRoot.position.set(0,0,0);
    modelRoot.updateMatrixWorld(true);
  }

  function towerPathSpec(opts,w,d,h){
    const style=(opts.chuteStyle||'zigzag').toLowerCase();
    const dice=Number(opts.dice||22),chuteX=Number(opts.chuteX||0),chuteY=Number(opts.chuteY||0),trayX=Number(opts.trayX||0);
    let channel,tubeD=0,helixR=0,minH,duration;
    if(style==='spiral'){
      tubeD=Math.max(34,dice*1.55);helixR=Math.max(6,dice*.42);
      channel=2*(tubeD/2+helixR)+10;minH=Math.max(118,dice*4.8);duration=6500;
    }else if(style==='straight'){
      tubeD=Math.max(34,dice*1.55);channel=Math.max(40,dice*1.9);
      minH=Math.max(86,dice+58);duration=2300;
    }else{
      tubeD=Math.max(34,dice*1.55);channel=Math.max(44,dice*2.3);
      minH=Math.max(125,dice+102);duration=4700;
    }

    const trayW=Math.min(w+10,Math.max(channel+24,82));
    const transitionRun=Math.max(28,Math.min(55,d*.34));
    const transitionAngle=THREE.MathUtils.radToDeg(Math.atan2(Math.abs(trayX-chuteX),transitionRun));
    const maxX=Math.max(0,w/2-channel/2-5),maxY=Math.max(0,d/2-channel/2-5);
    const envelopeInside=Math.abs(chuteX)<=maxX+.01&&Math.abs(chuteY)<=maxY+.01;
    const trayOverlap=!(trayX+trayW/2<-w/2-4||trayX-trayW/2>w/2+4);
    const points=[];
    const exitY=-d/2-7;

    if(style==='spiral'){
      const top=h-tubeD/2-6,bottom=Math.max(30,dice+10)+tubeD/2+8;
      const drop=top-bottom,minPitch=tubeD+6;
      const turns=Math.min(3,drop/Math.max(1,minPitch));
      const segments=Math.max(36,Math.ceil(Math.max(1.25,turns)*24));
      const endA=-Math.PI/2,startA=endA-2*Math.PI*Math.max(1.25,turns);
      points.push(new THREE.Vector3(chuteX,chuteY,h+2));
      for(let i=0;i<=segments;i++){
        const t=i/segments,a=startA+(endA-startA)*t;
        points.push(new THREE.Vector3(
          chuteX+helixR*Math.cos(a),
          chuteY+helixR*Math.sin(a),
          top-drop*t
        ));
      }
      points.push(new THREE.Vector3(trayX,exitY,Math.max(tubeD/2+2,(dice+10)/2)));
      const clearance=(tubeD-dice)/2;
      const safe=turns>=1.25&&envelopeInside&&trayOverlap&&transitionAngle<=34&&h>=minH&&clearance>=4;
      return {style,dice,channel,tubeD,helixR,turns,points,trayW,transitionAngle,maxX,maxY,envelopeInside,trayOverlap,minH,duration,minClearance:clearance,safe};
    }

    const exitH=Math.max(30,dice+10);
    points.push(new THREE.Vector3(chuteX,chuteY,h-8));
    if(style==='zigzag'){
      const low=exitH+30,high=h-30;
      const count=Math.max(2,Math.min(4,1+Math.floor(Math.max(0,high-low)/34)));
      if(high>low){
        for(let i=0;i<count;i++){
          const z=count===1?high:high-i*(high-low)/(count-1);
          const x=chuteX+(i%2===0?-channel*.18:channel*.18);
          points.push(new THREE.Vector3(x,chuteY,z));
        }
      }
    }else{
      points.push(new THREE.Vector3(chuteX,chuteY,exitH+18));
    }
    points.push(new THREE.Vector3(chuteX,chuteY-channel/2+4,Math.max(8,exitH*.45)));
    points.push(new THREE.Vector3(trayX,exitY,3.5));
    const clearance=(channel-dice)/2-(style==='zigzag'?2:0);
    const safe=envelopeInside&&trayOverlap&&transitionAngle<=34&&h>=minH&&clearance>=4;
    return {style,dice,channel,tubeD,helixR:0,turns:0,points,trayW,transitionAngle,maxX,maxY,envelopeInside,trayOverlap,minH,duration,minClearance:clearance,safe};
  }

  function preview(opts){
    if(!modelRoot||!baseDims)return null;
    simRun++;
    clear(simDice);simDice=null;
    resetTransform();
    const s=opts.scale/100,rot=opts.rotation;
    modelRoot.scale.setScalar(s);modelRoot.rotation.z=THREE.MathUtils.degToRad(rot);modelRoot.updateMatrixWorld(true);
    let box=new THREE.Box3().setFromObject(modelRoot),sz=box.getSize(new THREE.Vector3());
    if(isMeshRoot){modelRoot.position.z-=box.min.z;modelRoot.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(modelRoot);sz=box.getSize(new THREE.Vector3())}
    const w=demoMode?108*s:sz.x,d=demoMode?108*s:sz.y,h=demoMode?174*s:sz.z;
    if(demoMode)configureDemoChute(opts.chuteStyle,opts.tray,opts.trayX,opts.dice,opts.chuteX,opts.chuteY);
    clear(overlay);overlay=new THREE.Group();

    const spec=towerPathSpec(opts,w,d,h);
    lastTowerPath=spec.points.map(p=>p.clone());
    lastTowerDiagnostics=spec;

    const internalColor=spec.safe?0x4fdcff:0xff6464;
    const internalMat=new THREE.MeshBasicMaterial({color:internalColor,transparent:true,opacity:.25,wireframe:false,depthWrite:false});
    const edgeMat=new THREE.MeshBasicMaterial({color:internalColor,transparent:true,opacity:.78,wireframe:true});
    const trayMat=new THREE.MeshBasicMaterial({color:0x84d9a1,transparent:true,opacity:.28});
    if(!demoMode){
      const tray=new THREE.Mesh(new THREE.BoxGeometry(spec.trayW,opts.tray,3),trayMat);
      tray.position.set(Number(opts.trayX||0),-d/2-opts.tray/2+3,1.5);overlay.add(tray);
    }

    if(demoMode){
      // Actual colliding ledges and rails are visible; no ghosted train track.
    }else if(spec.style==='spiral'){
      const curve=new THREE.CatmullRomCurve3(spec.points,false,'centripetal',.2);
      const tube=new THREE.Mesh(
        new THREE.TubeGeometry(curve,Math.max(64,spec.points.length*2),spec.tubeD/2,12,false),
        internalMat
      );
      overlay.add(tube);
      const centreLine=new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(spec.points),
        new THREE.LineBasicMaterial({color:0xeefbff,transparent:true,opacity:.85})
      );
      overlay.add(centreLine);
    }else{
      const shaft=new THREE.Mesh(new THREE.BoxGeometry(spec.channel,spec.channel,Math.max(1,h-Math.max(30,spec.dice+10))),internalMat);
      shaft.position.set(Number(opts.chuteX||0),Number(opts.chuteY||0),(h+Math.max(30,spec.dice+10))/2);
      overlay.add(shaft);
      const curve=new THREE.CatmullRomCurve3(spec.points,false,'centripetal',.25);
      const guide=new THREE.Mesh(
        new THREE.TubeGeometry(curve,Math.max(36,spec.points.length*12),Math.min(spec.dice*.48,spec.channel*.20),10,false),
        edgeMat
      );
      overlay.add(guide);
      if(spec.style==='zigzag'){
        const gold=new THREE.MeshBasicMaterial({color:0xffc970,transparent:true,opacity:.62});
        const mids=spec.points.slice(1,-2);
        mids.forEach((p,i)=>{
          const b=new THREE.Mesh(new THREE.BoxGeometry(spec.channel*.58,spec.channel-7,4),gold);
          b.rotation.y=THREE.MathUtils.degToRad(i%2?35:-35);
          b.position.copy(p);overlay.add(b);
        });
      }
    }
    scene.add(overlay);

    const left=Math.min(-w/2,Number(opts.trayX||0)-spec.trayW/2),right=Math.max(w/2,Number(opts.trayX||0)+spec.trayW/2);
    return {
      w,d,h,channel:spec.channel,trayW:spec.trayW,outW:right-left,outD:d+opts.tray+3,
      transitionAngle:spec.transitionAngle,trayOverlap:spec.trayOverlap,
      chuteSafe:spec.safe,maxX:spec.maxX,maxY:spec.maxY,style:spec.style,
      minClearance:spec.minClearance,minH:spec.minH,turns:spec.turns,
      envelopeInside:spec.envelopeInside,duration:spec.duration
    };
  }

  async function runDiceSimulation(opts){
    const dims=preview(opts);
    if(!dims||!modelRoot)return {ok:false,message:'Load a model first.'};
    const token=++simRun;
    clear(simDice);simDice=null;
    simDice=new THREE.Mesh(
      new THREE.IcosahedronGeometry(Math.max(4,Number(opts.dice||22)/2),0),
      new THREE.MeshStandardMaterial({color:0xff4fd8,emissive:0x3b0d2d,roughness:.45,metalness:.08})
    );
    scene.add(simDice);
    try{
      const result=await dropD20({
        THREE,scene,root:modelRoot,demo:demoMode,diameter:Number(opts.dice||22),
        style:opts.chuteStyle,
        aborted:()=>token!==simRun,
        onPose:({position,quaternion})=>{
          if(token!==simRun)return;
          simDice.position.copy(position);
          simDice.quaternion.copy(quaternion);
        }
      });
      if(result.cancelled)return result;
      return {...result,style:opts.chuteStyle,minClearance:dims.minClearance,
        message:(demoMode?'Sample tower: ':'Actual STL: ')+result.message};
    }catch(error){
      return {ok:false,physicsUnavailable:true,
        message:'Rigid-body test could not run: '+(error?.message||String(error))+'. No pass is reported.'};
    }
  }

  function editPreview(opts){
    if(!modelRoot||!baseDims)return null;
    resetTransform();clear(overlay);overlay=new THREE.Group();

    const s=opts.scale/100;
    modelRoot.scale.set(opts.mirror?-s:s,s,s);
    modelRoot.rotation.set(
      THREE.MathUtils.degToRad(opts.rx||0),
      THREE.MathUtils.degToRad(opts.ry||0),
      THREE.MathUtils.degToRad(opts.rz||0)
    );
    modelRoot.updateMatrixWorld(true);
    let box=new THREE.Box3().setFromObject(modelRoot);
    if(isMeshRoot){
      modelRoot.position.z-=box.min.z;
      modelRoot.updateMatrixWorld(true);
      box=new THREE.Box3().setFromObject(modelRoot);
    }

    let lift=0;
    if(opts.baseType&&opts.baseType!=='none'){
      lift=Number(opts.baseThickness)||3;
      modelRoot.position.z+=lift;modelRoot.updateMatrixWorld(true);
      const bm=mat(.55,0xe1ad58);
      let base;
      if(opts.baseType==='round'||opts.baseType==='hex'){
        base=new THREE.Mesh(new THREE.CylinderGeometry(opts.baseWidth/2,opts.baseWidth/2,lift,opts.baseType==='hex'?6:64),bm);
        base.rotation.x=Math.PI/2;
      }else{
        base=new THREE.Mesh(new THREE.BoxGeometry(opts.baseWidth,opts.baseDepth,lift),bm);
      }
      base.position.z=lift/2;overlay.add(base);

      if(opts.nameText){
        const plaqueW=Math.min(Math.max(opts.baseWidth*.72,opts.nameText.length*(opts.nameSize||5)*.62+8),160);
        const plaqueD=Math.max(10,(opts.nameSize||5)+5);
        const effectiveDepth=(opts.baseType==='round'||opts.baseType==='hex')?opts.baseWidth:opts.baseDepth;
        const y=-(effectiveDepth/2+plaqueD/2-1.5);
        const plaque=new THREE.Mesh(new THREE.BoxGeometry(plaqueW,plaqueD,lift),mat(.6,0x84d9a1));
        plaque.position.set(0,y,lift/2);overlay.add(plaque);
      }

      const mc=Number(opts.magnetCount||0);
      if(mc){
        const effectiveDepth=(opts.baseType==='round'||opts.baseType==='hex')?opts.baseWidth:opts.baseDepth;
        const xoff=Math.min(opts.baseWidth*.24,14),yoff=Math.min(effectiveDepth*.24,14);
        const pts=mc===1?[[0,0]]:(mc===2?[[-xoff,0],[xoff,0]]:[[-xoff,-yoff],[xoff,-yoff],[-xoff,yoff],[xoff,yoff]]);
        const holeMat=new THREE.MeshBasicMaterial({color:0xff6b6b,transparent:true,opacity:.7,wireframe:true});
        for(const [x,y] of pts){
          const h=Math.min(Number(opts.magnetDepth||2),lift);
          const hole=new THREE.Mesh(new THREE.CylinderGeometry(Number(opts.magnetDiameter||6)/2,Number(opts.magnetDiameter||6)/2,h,32),holeMat);
          hole.rotation.x=Math.PI/2;hole.position.set(x,y,h/2);overlay.add(hole);
        }
      }
    }
    scene.add(overlay);

    const total=new THREE.Box3().setFromObject(modelRoot);
    if(overlay.children.length)total.union(new THREE.Box3().setFromObject(overlay));
    const size=total.getSize(new THREE.Vector3());
    return {w:size.x,d:size.y,h:size.z,fit:size.x<=225&&size.y<=225&&size.z<=280};
  }

  function overhangHeatmap(){
    if(!modelRoot)return {moderate:0,severe:0};
    let moderate=0,severe=0;
    modelRoot.traverse(obj=>{
      if(!obj.isMesh||!obj.geometry?.attributes?.position||!obj.geometry?.attributes?.normal)return;
      const g=obj.geometry,pos=g.attributes.position,norm=g.attributes.normal;
      if(pos.count<3)return;
      g.computeBoundingBox();
      const minZ=g.boundingBox?.min?.z??0;
      const colors=new Float32Array(pos.count*3);
      const normalColor=new THREE.Color(0xd6dae3);
      const moderateColor=new THREE.Color(0xffc970);
      const severeColor=new THREE.Color(0xff6b6b);
      for(let i=0;i<pos.count;i+=3){
        const end=Math.min(i+3,pos.count);
        let z=0,nz=0;
        for(let j=i;j<end;j++){z+=pos.getZ(j);nz+=norm.getZ(j)}
        z/=(end-i);nz/=(end-i);
        let col=normalColor;
        if(z>minZ+.8&&nz<-.66){col=severeColor;severe++}
        else if(z>minZ+.8&&nz<-.28){col=moderateColor;moderate++}
        for(let j=i;j<end;j++){
          colors[j*3]=col.r;colors[j*3+1]=col.g;colors[j*3+2]=col.b;
        }
      }
      g.setAttribute('color',new THREE.BufferAttribute(colors,3));
      obj.material?.dispose?.();
      obj.material=new THREE.MeshStandardMaterial({
        vertexColors:true,roughness:.62,metalness:.05,side:THREE.DoubleSide
      });
    });
    return {moderate,severe};
  }

  function splitPreview(opts){
    if(!modelRoot||!baseDims)return null;
    resetTransform();clear(overlay);overlay=new THREE.Group();
    const box=new THREE.Box3().setFromObject(modelRoot),size=box.getSize(new THREE.Vector3());
    const p=Math.max(.1,Math.min(.9,(Number(opts.percent)||50)/100));
    const pm=new THREE.MeshBasicMaterial({color:0xff7a7a,transparent:true,opacity:.38,side:THREE.DoubleSide});
    let plane,a,b;
    if(opts.axis==='y'){
      const y=-size.y/2+size.y*p;
      plane=new THREE.Mesh(new THREE.BoxGeometry(size.x+8,.8,size.z+8),pm);plane.position.set(0,y,size.z/2);
      a=[size.x,size.y*p,size.z];b=[size.x,size.y*(1-p),size.z];
    }else if(opts.axis==='z'){
      const z=size.z*p;
      plane=new THREE.Mesh(new THREE.BoxGeometry(size.x+8,size.y+8,.8),pm);plane.position.set(0,0,z);
      a=[size.x,size.y,size.z*p];b=[size.x,size.y,size.z*(1-p)];
    }else{
      const x=-size.x/2+size.x*p;
      plane=new THREE.Mesh(new THREE.BoxGeometry(.8,size.y+8,size.z+8),pm);plane.position.set(x,0,size.z/2);
      a=[size.x*p,size.y,size.z];b=[size.x*(1-p),size.y,size.z];
    }
    overlay.add(plane);scene.add(overlay);
    const fitPart=v=>v[0]<=225&&v[1]<=225&&v[2]<=280;
    return {a,b,aFit:fitPart(a),bFit:fitPart(b)};
  }

  function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera)}
  resize();loop();
  return {showFile,showDemoTower,preview,runDiceSimulation,editPreview,splitPreview,overhangHeatmap,hasModel:()=>!!modelRoot};
}
