/* Rookie Quest software 3D preview. Works without WebGL or external libraries.
 * Visual STL inspection only: chute overlay / D20 are illustrative, not CAD cuts or physics. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const V=(x,y,z)=>[x,y,z];
const meshes={};
function sample(){
 const faces=[];
 function quad(a,b,c,d,color){faces.push({p:[a,b,c],c:color},{p:[a,c,d],c:color});}
 function cube(x,y,z,w,d,h,color){
  const xa=x-w/2,xb=x+w/2,ya=y-d/2,yb=y+d/2,za=z-h/2,zb=z+h/2;
  const p=[V(xa,ya,za),V(xb,ya,za),V(xb,yb,za),V(xa,yb,za),V(xa,ya,zb),V(xb,ya,zb),V(xb,yb,zb),V(xa,yb,zb)];
  for(const q of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]])quad(...q.map(i=>p[i]),color);
 }
 cube(-52,0,77,9,102,146,'#7896b5');cube(52,0,77,9,102,146,'#7896b5');
 cube(0,47,77,108,8,146,'#91a7bb');cube(-39,-47,81,25,8,138,'#708eac');cube(39,-47,81,25,8,138,'#708eac');
 cube(0,-47,120,53,8,65,'#91a7bb');cube(0,0,7,114,110,12,'#637e9c');
 cube(0,-107,5,140,100,8,'#779bbd');cube(-69,-107,15,5,100,25,'#6687a5');cube(69,-107,15,5,100,25,'#6687a5');cube(0,-156,15,140,6,25,'#6687a5');
 for(const z of [56,135]){cube(0,48,z,117,12,5,'#aac1d4');cube(-53,0,z,5,108,5,'#aac1d4');cube(53,0,z,5,108,5,'#aac1d4');}
 for(const x of [-48,-24,0,24,48])for(const y of [-48,48])cube(x,y,161,16,13,19,'#aec0ce');
 for(const x of [-53,53])for(const y of [-24,0,24])cube(x,y,161,13,16,19,'#aec0ce');
 return {faces,bounds:[-75,-162,0,75,55,172],name:'Built-in Gothic dice tower',demo:true};
}
function readStl(buf,name){
 const d=new DataView(buf), bytes=new Uint8Array(buf), list=[];
 const binary=buf.byteLength>=84&&84+d.getUint32(80,true)*50===buf.byteLength;
 let count=0;
 const sampleEvery=binary?Math.max(1,Math.ceil(d.getUint32(80,true)/4200)):1;
 if(binary){
  const n=d.getUint32(80,true); count=n;
  for(let i=0;i<n;i+=sampleEvery){
   const off=84+i*50,p=[];
   for(let j=0;j<3;j++){const k=off+12+j*12;p.push([d.getFloat32(k,true),d.getFloat32(k+4,true),d.getFloat32(k+8,true)]);}
   if(p.flat().every(Number.isFinite))list.push({p,c:'#a2b4cb'});
  }
 }else{
  if(buf.byteLength>16000000)throw Error('This ASCII STL is too large for the backup viewer; try the normal 3D viewer.');
  const text=new TextDecoder().decode(bytes);const rx=/vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let m,p=[],i=0;
  while((m=rx.exec(text))){
   if(i++%3===0)p=[];
   p.push([+m[1],+m[2],+m[3]]);
   if(p.length===3){count++;if(count%Math.max(1,Math.floor(text.length/600000))===0)list.push({p,c:'#a2b4cb'});}
  }
 }
 if(!list.length)throw Error('No STL triangles were found.');
 const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
 for(const f of list)for(const p of f.p)for(let i=0;i<3;i++){bounds[i]=Math.min(bounds[i],p[i]);bounds[i+3]=Math.max(bounds[i+3],p[i]);}
 const centres=[(bounds[0]+bounds[3])/2,(bounds[1]+bounds[4])/2,bounds[2]];
 const width=Math.max(...[0,1,2].map(i=>bounds[i+3]-bounds[i]));
 const scale=150/Math.max(width,1);
 for(const f of list)for(const p of f.p){for(let i=0;i<3;i++)p[i]=(p[i]-centres[i])*scale;}
 return {faces:list,bounds:[-75,-75,0,75,75,150],name,sourceTri:count,demo:false};
}
function create(id,uploadId){
 const host=byId(id);
 if(!host)return null;
 const canvas=document.createElement('canvas');
 canvas.className='rq-software-canvas';
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;';
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return null;
 host.prepend(canvas);
 const state={model:sample(),yaw:.7,pitch:.26,zoom:1,style:'zigzag',progress:0,playing:false,at:0,hidden:false,drag:null,pinch:0};
 const chip=document.createElement('span');
 chip.style.cssText='position:absolute;top:10px;left:10px;padding:7px 10px;color:#d7faff;background:#122a38dd;border:1px solid #3f7890;border-radius:9px;font-size:11px;pointer-events:none;z-index:2;';
 chip.textContent='3D preview · drag to rotate';
 host.appendChild(chip);
 const bg='#0d1624';
 const dieCoords=()=>{const t=state.progress,style=state.style;
  if(style==='spiral'){const a=t*4.5*Math.PI;return [17*Math.cos(a),17*Math.sin(a),148-t*118];}
  if(style==='zigzag'){return [25*Math.sin(t*4*Math.PI),0,148-t*115];}
  return [0,0,148-t*120];
 };
 function projection(){
  const r=host.getBoundingClientRect(),ww=Math.max(180,r.width),hh=Math.max(220,r.height);
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const w=Math.round(ww*dpr),h=Math.round(hh*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const scale=Math.min(w/260,h/300)*state.zoom;
  const cosy=Math.cos(state.yaw),siny=Math.sin(state.yaw),cosp=Math.cos(state.pitch),sinp=Math.sin(state.pitch);
  const proj=p=>{
   const x=p[0]*cosy-p[1]*siny, y=p[0]*siny+p[1]*cosy, z=p[2]-82;
   return [w/2+x*scale,h*.55-(z*cosp-y*sinp)*scale,y*cosp+z*sinp];
  };
  return {proj,w,h,scale};
 }
 function draw(){
  if(state.hidden)return;
  if(state.playing){
   const dt=Math.min(.07,(performance.now()-state.at)/1000);state.at=performance.now();
   const duration={straight:2.6,zigzag:5.2,spiral:8.3}[state.style]||5.2;
   state.progress=Math.min(1,state.progress+dt/duration);
   if(state.progress===1)state.playing=false;
  }
  const {proj,w,h,scale}=projection();
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#263950';ctx.lineWidth=1;
  for(let i=-120;i<=120;i+=30){
   const a=proj([i,-180,-2]),b=proj([i,180,-2]);
   ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
   const c=proj([-120,i,-2]),d=proj([120,i,-2]);ctx.beginPath();ctx.moveTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.stroke();
  }
  const fs=state.model.faces.map(f=>{
   const pp=f.p.map(proj),depth=(pp[0][2]+pp[1][2]+pp[2][2])/3;
   const cross=(pp[1][0]-pp[0][0])*(pp[2][1]-pp[0][1])-(pp[1][1]-pp[0][1])*(pp[2][0]-pp[0][0]);
   return {pp,depth,color:f.c,front:cross};
  }).sort((a,b)=>b.depth-a.depth);
  for(const f of fs){
   ctx.beginPath();ctx.moveTo(f.pp[0][0],f.pp[0][1]);ctx.lineTo(f.pp[1][0],f.pp[1][1]);ctx.lineTo(f.pp[2][0],f.pp[2][1]);ctx.closePath();
   ctx.fillStyle=f.color;ctx.globalAlpha=state.model.demo?.36:.86;ctx.fill();ctx.globalAlpha=1;
   ctx.strokeStyle=state.model.demo?'#7188a590':'#6a83a270';ctx.lineWidth=.6;ctx.stroke();
  }
  // Planned chute centreline, not a Boolean hole or a validated collision test.
  const pts=[];
  for(let i=0;i<=90;i++){const t=i/90,a=t*4.5*Math.PI;
   if(state.style==='spiral')pts.push([17*Math.cos(a),17*Math.sin(a),148-t*118]);
   else if(state.style==='zigzag')pts.push([25*Math.sin(t*4*Math.PI),0,148-t*115]);
   else pts.push([0,0,148-t*120]);
  }
  pts.push([0,-50,30],[0,-95,22]);
  ctx.beginPath();
  for(let i=0;i<pts.length;i++){const p=proj(pts[i]);if(!i)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);}
  ctx.strokeStyle='#4adfe9';ctx.lineWidth=Math.max(4,12*scale/2);ctx.globalAlpha=.48;ctx.stroke();
  ctx.strokeStyle='#d0ffff';ctx.lineWidth=2;ctx.globalAlpha=.95;ctx.stroke();ctx.globalAlpha=1;
  const die=proj(dieCoords()),size=Math.max(6,9*scale);
  ctx.fillStyle='#ffcc66';ctx.strokeStyle='#fff4c4';ctx.lineWidth=2;ctx.beginPath();
  for(let i=0;i<6;i++){const ang=Math.PI*2*i/6-Math.PI/6,x=die[0]+Math.cos(ang)*size,y=die[1]+Math.sin(ang)*size;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#aebed3';ctx.font=Math.max(11,12*window.devicePixelRatio)+'px system-ui';
  ctx.fillText(state.model.name,12,h-20);
  if(!state.model.demo){ctx.fillStyle='#ffd9a0';ctx.fillText('Chute overlay is illustrative · no STL cut',12,h-42);}
  requestAnimationFrame(draw);
 }
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);state.drag={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointermove',e=>{if(!state.drag)return;state.yaw+=(e.clientX-state.drag.x)*.012;state.pitch=Math.max(-.75,Math.min(1.18,state.pitch+(e.clientY-state.drag.y)*.008));state.drag={x:e.clientX,y:e.clientY};});
 for(const e of ['pointerup','pointercancel'])canvas.addEventListener(e,()=>{state.drag=null;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.min(3.5,Math.max(.45,state.zoom*(e.deltaY>0?.92:1.08)));},{passive:false});
 canvas.addEventListener('dblclick',()=>{state.yaw=.7;state.pitch=.26;state.zoom=1;});
 async function showFile(f){
  if(!f)return;const b=await f.arrayBuffer();state.model=readStl(b,f.name);
  state.zoom=1;state.playing=false;state.progress=0;
  chip.textContent='STL loaded · drag to rotate';
 }
 const upload=byId(uploadId);
 if(upload)upload.addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{await showFile(f);}catch(err){chip.textContent='Preview error: '+err.message;}
 });
 const style=byId('chuteStyle');
 if(style)style.addEventListener('change',()=>{state.style=style.value;state.progress=0;state.playing=false;});
 requestAnimationFrame(draw);
 return {state,showFile,hide:()=>{state.hidden=true;canvas.remove();chip.remove();},reset:()=>{state.model=sample();state.progress=0;state.playing=false;state.zoom=1;},drop:()=>{state.playing=true;state.progress=0;state.at=performance.now();}};
}
const quick=create('sliceViewer','model'),tower=create('viewer','towerModel');
window.rqSoftwareViewer={quick,tower,hideTower:()=>tower?.hide(),drop:()=>tower?.drop(),resetTower:()=>tower?.reset()};
byId('quickDemoReset')?.addEventListener('click',()=>{quick?.reset();});
byId('towerDemoReset')?.addEventListener('click',()=>{
 if(window.rqAppReady)return; tower?.reset();
});
byId('quickDiceDrop')?.addEventListener('click',()=>byId('jumpTowerBuilder')?.click());
byId('simulateDice')?.addEventListener('click',()=>{
 if(window.rqAppReady)return;
 const result=byId('diceSimResult');
 if(result){result.className='support-note warn';result.innerHTML='<strong>Physics unavailable</strong><span>This device is showing the non-physics software preview. No drop has been simulated or validated.</span>';}
});
})();
