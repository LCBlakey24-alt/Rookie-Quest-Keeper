import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';

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
  let lastTowerPath=null,lastTowerDiagnostics=null,simDice=null,simRun=0;

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
    modelRoot=await parse(file);scene.add(modelRoot);
    const d=normalize(modelRoot);
    if(design)modelRoot.traverse(x=>{if(x.isMesh)x.material=mat(.34,0xaebbd0)});
    fit(d);
    return {x:d.x,y:d.y,z:d.z};
  }

  // Built-in sample: enough real 3D geometry to explore the tower without an upload.
  // It is a preview shell, not a pre-cut/printable final STL.
  function showDemoTower(){
    simRun++;
    clear(simDice);simDice=null;
    clear(modelRoot);clear(overlay);overlay=null;
    const group=new THREE.Group();
    function block(x,y,z,w,d,h,color=0x9baabd){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),mat(.39,color));
      mesh.position.set(x,y,z);group.add(mesh);
    }
    // Open central cavity, deliberate front exit gap and top crenellations.
    block(-52,0,78,9,102,148);
    block(52,0,78,9,102,148);
    block(0,47,78,108,8,148);
    block(-39,-47,85,24,8,134);
    block(39,-47,85,24,8,134);
    block(0,-47,121,54,8,66);
    block(0,0,7,114,110,12,0x647f9e);
    for(const z of [56,135]){
      block(0,48,z,117,12,5,0x758da4);
      block(-53,0,z,5,111,5,0x758da4);
      block(53,0,z,5,111,5,0x758da4);
    }
    for(const x of [-49,-24,0,24,49]){
      for(const y of [-48,48])block(x,y,164,15,12,18,0x7894ae);
    }
    for(const x of [-53,53]){
      for(const y of [-26,0,26])block(x,y,164,12,16,18,0x7894ae);
    }
    modelRoot=group;
    scene.add(modelRoot);
    const dims=normalize(modelRoot);
    fit(dims);
    return {x:dims.x,y:dims.y,z:dims.z};
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
    const w=sz.x,d=sz.y,h=sz.z;
    clear(overlay);overlay=new THREE.Group();

    const spec=towerPathSpec(opts,w,d,h);
    lastTowerPath=spec.points.map(p=>p.clone());
    lastTowerDiagnostics=spec;

    const internalColor=spec.safe?0x4fdcff:0xff6464;
    const internalMat=new THREE.MeshBasicMaterial({color:internalColor,transparent:true,opacity:.25,wireframe:false,depthWrite:false});
    const edgeMat=new THREE.MeshBasicMaterial({color:internalColor,transparent:true,opacity:.78,wireframe:true});
    const trayMat=new THREE.MeshBasicMaterial({color:0x84d9a1,transparent:true,opacity:.28});
    const tray=new THREE.Mesh(new THREE.BoxGeometry(spec.trayW,opts.tray,3),trayMat);
    tray.position.set(Number(opts.trayX||0),-d/2-opts.tray/2+3,1.5);overlay.add(tray);

    if(spec.style==='spiral'){
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
    const d=preview(opts);
    if(!d||!lastTowerDiagnostics)return {ok:false,message:'Load a model first.'};
    const diag=lastTowerDiagnostics;
    if(!diag.safe){
      return {
        ok:false,
        message:!diag.envelopeInside?'Internal chute envelope reaches outside the model bounding envelope.'
          :(d.h<diag.minH?'Tower is too short for this chute style.'
          :(diag.minClearance<4?'Dice clearance is too tight.'
          :'Tray/chute transition is too sharp or disconnected.')),
        minClearance:diag.minClearance,
        durationMs:diag.duration
      };
    }

    simRun++;const myRun=simRun;
    clear(simDice);
    simDice=new THREE.Mesh(
      new THREE.IcosahedronGeometry(Math.max(4,Number(opts.dice||22)/2),0),
      new THREE.MeshStandardMaterial({color:0xff4fd8,emissive:0x4c103f,roughness:.35,metalness:.15})
    );
    scene.add(simDice);
    const curve=new THREE.CatmullRomCurve3(lastTowerPath,false,'centripetal',.28);
    const start=performance.now(),duration=diag.duration;
    await new Promise(resolve=>{
      function step(now){
        if(myRun!==simRun){resolve();return}
        const raw=Math.min(1,(now-start)/duration);
        // Ease in slightly but keep the motion readable through ramps/spiral.
        const t=raw<.12?raw*.72:Math.min(1,.0864+(raw-.12)*1.0382);
        const p=curve.getPointAt(Math.max(0,Math.min(1,t)));
        simDice.position.copy(p);
        simDice.rotation.x+=.08;simDice.rotation.y+=.115;simDice.rotation.z+=.045;
        if(raw<1)requestAnimationFrame(step);else resolve();
      }
      requestAnimationFrame(step);
    });
    return {
      ok:true,
      style:diag.style,
      minClearance:diag.minClearance,
      durationMs:duration,
      envelopeInside:diag.envelopeInside,
      turns:diag.turns||0,
      message:'Virtual dice completed the planned centreline without a clearance violation.'
    };
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
