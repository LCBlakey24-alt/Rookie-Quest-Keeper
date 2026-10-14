import { createViewer } from '/assets/viewer.js';

const $=s=>document.querySelector(s);
const pin=$('#access_pin');
pin.value=localStorage.getItem('rqs_pin')||'';
pin.addEventListener('change',()=>localStorage.setItem('rqs_pin',pin.value));

const presetNotes={
  normal:'0.20 mm layers · 3 walls · 20% infill',
  mini:'0.12 mm layers · slower for detail',
  terrain:'0.24 mm layers · 3 walls · 12% infill',
  strong:'0.20 mm layers · 5 walls · 35% infill',
  draft:'0.28 mm layers · quickest test profile'
};
$('#preset').addEventListener('change',e=>$('#presetNote').textContent=presetNotes[e.target.value]);

const supportNotes={
  off:{title:'Off',text:'No supports will be generated.',tone:'neutral'},
  gentle_bed:{title:'Gentle · Build Plate Only',text:'Supports may only begin on the bed. Extra clearance makes them easier to remove from delicate details.',tone:'safe'},
  snug_bed:{title:'Snug · Build Plate Only',text:'Closer-fitting supports from the bed only. Better underside quality while avoiding support foundations on the model.',tone:'safe'},
  snug_everywhere:{title:'Snug · Everywhere',text:'Supports may begin on the model when bed-only supports cannot reach. Better coverage, but expect more contact marks.',tone:'warn'},
  grid_bed:{title:'Strong Grid · Build Plate Only',text:'Rigid conventional supports from the bed only. Good for large, heavy overhangs.',tone:'safe'},
  grid_everywhere:{title:'Strong Grid · Everywhere',text:'Maximum conventional coverage. Strongest support, highest material use and the hardest removal.',tone:'warn'}
};
function updateSupportNote(){
  const v=$('#supports').value,n=supportNotes[v],box=$('#supportNote');
  box.className='support-note '+n.tone;
  box.innerHTML='<strong>'+n.title+'</strong><span>'+n.text+'</span>';
}
$('#supports').addEventListener('change',updateSupportNote);
updateSupportNote();

for(const b of document.querySelectorAll('.tab')){
  b.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));
    $('#slicePanel').classList.toggle('active',b.dataset.tab==='slice');
    $('#editorPanel').classList.toggle('active',b.dataset.tab==='edit');
    $('#designPanel').classList.toggle('active',b.dataset.tab==='design');
    $('#doctorPanel').classList.toggle('active',b.dataset.tab==='doctor');
  });
}

function supportLabel(v){return (supportNotes[v]&&supportNotes[v].title)||v}
function renderHistory(){
  const el=$('#historyList');if(!el)return;
  let history=[];try{history=JSON.parse(localStorage.getItem('rqs_history')||'[]')}catch{}
  if(!history.length){el.innerHTML='<div class="history-empty">No slices saved yet.</div>';return}
  el.innerHTML='';
  for(const item of history.slice(0,6)){
    const row=document.createElement('div');row.className='history-row';
    const when=item.when?new Date(item.when).toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
    const bits=[item.preset,supportLabel(item.support)];
    if(item.time&&item.time!=='unknown')bits.push(item.time);
    if(item.filament_g&&item.filament_g!=='unknown')bits.push(Number(item.filament_g).toFixed(1)+' g');
    row.innerHTML='<div><strong>'+item.name.replace(/[<>]/g,'')+'</strong><span>'+bits.join(' · ')+'</span></div><small>'+when+'</small>';
    el.appendChild(row);
  }
}

function downloadBlob(blob,name){
  const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),60000);
}
async function err(r){
  let m=await r.text();
  try{m=JSON.parse(m).detail}catch{}
  return m||('Request failed: '+r.status);
}
function currentTemps(fd){
  fd.append('nozzle_temp',$('#nozzle_temp').value);
  fd.append('bed_temp',$('#bed_temp').value);
  fd.append('access_pin',pin.value);
}
async function sliceFile(file,name,statusEl,button,supportMode=null,presetMode=null){
  button.disabled=true;
  statusEl.className='status';
  statusEl.textContent='Slicing model…';
  const fd=new FormData();
  fd.append('model',file);
  fd.append('preset',presetMode||$('#preset').value);
  fd.append('supports',supportMode||$('#supports').value);
  currentTemps(fd);
  try{
    const r=await fetch('/slice',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    const printTime=r.headers.get('X-RQ-Print-Time');
    const filamentG=r.headers.get('X-RQ-Filament-G');
    const filamentMM=r.headers.get('X-RQ-Filament-MM');
    downloadBlob(await r.blob(),name.replace(/\.(stl|3mf|obj|ply)$/i,'')+'_N3Pro.gcode');
    const bits=[];
    if(printTime&&printTime!=='unknown')bits.push(printTime);
    if(filamentG&&filamentG!=='unknown')bits.push(Number(filamentG).toFixed(1)+' g filament');
    else if(filamentMM&&filamentMM!=='unknown')bits.push((Number(filamentMM)/1000).toFixed(2)+' m filament');
    statusEl.className='status ok';
    statusEl.textContent='Done — G-code downloaded'+(bits.length?' · '+bits.join(' · '):'')+'.';
    try{
      const history=JSON.parse(localStorage.getItem('rqs_history')||'[]');
      history.unshift({name,when:new Date().toISOString(),preset:presetMode||$('#preset').value,support:supportMode||$('#supports').value,time:printTime||'',filament_g:filamentG||''});
      localStorage.setItem('rqs_history',JSON.stringify(history.slice(0,10)));
      renderHistory();
    }catch{}
  }catch(x){
    statusEl.className='status bad';
    statusEl.textContent=x.message;
  }finally{
    button.disabled=false;
  }
}

$('#model').addEventListener('change',e=>{
  const f=e.target.files[0];
  $('#fileHelp').textContent=f?(f.name+' · '+(f.size/1048576).toFixed(1)+' MB'):'STL or 3MF · up to 75 MB';
});
$('#sliceForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const file=$('#model').files[0];
  if(!file)return;
  await sliceFile(file,file.name,$('#sliceStatus'),$('#sliceGo'));
});

/* Visual Editor */
const editViewer=createViewer($('#editViewer'));
let editOriginal=null,editBlob=null,editName='Edited.stl';

function editOpts(){
  return {
    scale:Number($('#editScale').value),
    rx:Number($('#editRx').value||0),
    ry:Number($('#editRy').value||0),
    rz:Number($('#editRz').value||0),
    mirror:$('#editMirror').value==='on',
    baseType:$('#editBaseType').value,
    baseWidth:Number($('#editBaseWidth').value||35),
    baseDepth:Number($('#editBaseDepth').value||35),
    baseThickness:Number($('#editBaseThickness').value||3),
    nameText:$('#editName').value.trim(),
    nameSize:Number($('#editNameSize').value||5),
    magnetCount:Number($('#editMagnetCount').value||0),
    magnetDiameter:Number($('#editMagnetDiameter').value||6),
    magnetDepth:Number($('#editMagnetDepth').value||2)
  };
}

function updateEditPreview(){
  $('#editScaleValue').textContent=$('#editScale').value+'%';
  $('#editBaseThicknessValue').textContent=$('#editBaseThickness').value+' mm';
  const d=editViewer.editPreview(editOpts());
  if(!d)return;
  $('#editDimCheck').innerHTML='<strong>'+d.w.toFixed(0)+'×'+d.d.toFixed(0)+'×'+d.h.toFixed(0)+'</strong>Edited mm';
  $('#editDimCheck').className='check '+(d.fit?'good':'bad');
  $('#editBedCheck').innerHTML='<strong>'+(d.fit?'Fits':'Too large')+'</strong>Neptune 3 Pro';
  $('#editBedCheck').className='check '+(d.fit?'good':'bad');
  const bt=$('#editBaseType').value;
  const mag=Number($('#editMagnetCount').value||0);
  $('#editBaseCheck').innerHTML='<strong>'+(bt==='none'?'None':bt[0].toUpperCase()+bt.slice(1))+'</strong>'+(bt==='none'?'No base':$('#editBaseWidth').value+' mm'+(mag?' · '+mag+' magnet'+(mag>1?'s':''):''));
  $('#editBaseCheck').className='check '+(bt==='none'?'':'good');
}

$('#editModel').addEventListener('change',async e=>{
  const f=e.target.files[0];
  editOriginal=f||null;editBlob=null;
  $('#editActions').classList.remove('show');
  $('#editFileHelp').textContent=f?(f.name+' · '+(f.size/1048576).toFixed(1)+' MB'):'STL only for Visual Editor v1';
  if(!f)return;
  try{
    await editViewer.showFile(f,true);
    updateEditPreview();
    $('#editStatus').className='status ok';
    $('#editStatus').textContent='Model loaded — edits below update the preview immediately.';
  }catch(x){
    $('#editStatus').className='status bad';
    $('#editStatus').textContent='Preview failed: '+x.message;
  }
});

for(const id of ['editScale','editRx','editRy','editRz','editMirror','editBaseType','editBaseWidth','editBaseDepth','editBaseThickness','editName','editNameSize','editMagnetCount','editMagnetDiameter','editMagnetDepth']){
  $('#'+id).addEventListener('input',updateEditPreview);
  $('#'+id).addEventListener('change',updateEditPreview);
}

$('#autoFitEdit').addEventListener('click',async()=>{
  const f=$('#editModel').files[0],s=$('#editStatus'),b=$('#autoFitEdit');
  if(!f){s.className='status bad';s.textContent='Choose an STL first.';return}
  b.disabled=true;s.className='status';s.textContent='Testing sensible 90° orientations…';
  const fd=new FormData();fd.append('model',f);fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/edit/orientation',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    const o=await r.json();
    $('#editRx').value=o.rotation_x;$('#editRy').value=o.rotation_y;$('#editRz').value=o.rotation_z;
    updateEditPreview();
    s.className=o.fits_printer?'status ok':'status bad';
    s.textContent=(o.fits_printer?'Auto Fit found a bed-fitting orientation':'No tested face orientation fits')+' · '+o.dimensions_mm.map(v=>Number(v).toFixed(0)).join(' × ')+' mm.';
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false}
});

$('#buildEdit').addEventListener('click',async()=>{
  const f=$('#editModel').files[0],s=$('#editStatus'),b=$('#buildEdit');
  if(!f){s.className='status bad';s.textContent='Choose an STL first.';return}
  const o=editOpts();
  if(o.nameText&&o.baseType==='none'){s.className='status bad';s.textContent='Choose a base before adding nameplate text.';return}
  b.disabled=true;s.className='status';s.textContent='Building edited STL…';
  const fd=new FormData();
  fd.append('model',f);
  fd.append('scale_percent',o.scale);
  fd.append('rotation_x',o.rx);fd.append('rotation_y',o.ry);fd.append('rotation_z',o.rz);
  fd.append('mirror_x',o.mirror?'on':'off');
  fd.append('base_type',o.baseType);
  fd.append('base_width',o.baseWidth);fd.append('base_depth',o.baseDepth);fd.append('base_thickness',o.baseThickness);
  fd.append('name_text',o.nameText);fd.append('name_size',o.nameSize);fd.append('name_height',$('#editNameHeight').value);
  fd.append('magnet_count',o.magnetCount);fd.append('magnet_diameter',o.magnetDiameter);fd.append('magnet_depth',o.magnetDepth);
  fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/edit/build',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    editBlob=await r.blob();
    editName=f.name.replace(/\.stl$/i,'')+'_Edited.stl';
    await editViewer.showFile(new File([editBlob],editName,{type:'model/stl'}),false);
    const dm=r.headers.get('X-RQ-Dimensions');
    s.className='status ok';
    s.textContent='Edited STL built'+(dm?' · '+dm.replaceAll(',',' × ')+' mm':'')+'. Rotate the finished preview before printing.';
    $('#editActions').classList.add('show');
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false}
});

$('#downloadEdit').addEventListener('click',()=>{if(editBlob)downloadBlob(editBlob,editName)});
$('#sliceEdit').addEventListener('click',async()=>{
  if(!editBlob)return;
  await sliceFile(new File([editBlob],editName,{type:'model/stl'}),editName,$('#editStatus'),$('#sliceEdit'));
});

/* Dice Tower Builder */
const viewer=createViewer($('#viewer'));
let generatedBlob=null,generatedName='Rookie_Quest_Dice_Tower.stl';
function towerOpts(){
  return {scale:Number($('#towerScale').value),rotation:Number($('#towerRotation').value),dice:Number($('#diceSize').value),tray:Number($('#trayDepth').value)};
}
function towerChecks(){
  const d=viewer.preview(towerOpts());
  if(!d)return;
  $('#dimCheck').innerHTML='<strong>'+d.w.toFixed(0)+'×'+d.d.toFixed(0)+'×'+d.h.toFixed(0)+'</strong>Model mm';
  $('#dimCheck').className='check good';
  const min=d.channel+14,minH=Math.max(95,towerOpts().dice+65),good=d.w>=min&&d.d>=min&&d.h>=minH;
  $('#chuteCheck').innerHTML='<strong>'+(good?'Good':'Too small')+'</strong>'+d.channel.toFixed(0)+' mm chute';
  $('#chuteCheck').className='check '+(good?'good':'bad');
  const fit=d.outW<=225&&d.outD<=225&&d.h<=280;
  $('#bedCheck').innerHTML='<strong>'+(fit?'Fits':'Too large')+'</strong>'+d.outW.toFixed(0)+'×'+d.outD.toFixed(0);
  $('#bedCheck').className='check '+(fit?'good':'bad');
}
$('#towerModel').addEventListener('change',async e=>{
  const f=e.target.files[0];
  generatedBlob=null;
  $('#resultActions').classList.remove('show');
  $('#towerFileHelp').textContent=f?(f.name+' · '+(f.size/1048576).toFixed(1)+' MB'):'STL only for Dice Tower Builder v1';
  if(!f)return;
  try{
    await viewer.showFile(f,true);
    towerChecks();
  }catch(x){
    $('#towerStatus').className='status bad';
    $('#towerStatus').textContent='Preview failed: '+x.message;
  }
});
for(const id of ['towerScale','towerRotation','diceSize','trayDepth']){
  $('#'+id).addEventListener('input',()=>{
    $('#towerScaleValue').textContent=$('#towerScale').value+'%';
    $('#trayDepthValue').textContent=$('#trayDepth').value+' mm';
    towerChecks();
  });
}
$('#buildTower').addEventListener('click',async()=>{
  const f=$('#towerModel').files[0],s=$('#towerStatus'),b=$('#buildTower');
  if(!f){s.className='status bad';s.textContent='Choose an STL first.';return;}
  b.disabled=true;s.className='status';s.textContent='Building chute, ramps and catch tray…';
  const fd=new FormData(),o=towerOpts();
  fd.append('model',f);fd.append('scale_percent',o.scale);fd.append('rotation_z',o.rotation);
  fd.append('dice_mm',o.dice);fd.append('tray_depth',o.tray);fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/design/dice-tower',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    generatedBlob=await r.blob();
    generatedName=f.name.replace(/\.stl$/i,'')+'_Dice_Tower.stl';
    await viewer.showFile(new File([generatedBlob],generatedName,{type:'model/stl'}),false);
    const dm=r.headers.get('X-RQ-Dimensions'),bf=r.headers.get('X-RQ-Baffles');
    s.className='status ok';
    s.textContent='Tower built'+(dm?' · '+dm.replaceAll(',',' × ')+' mm':'')+(bf?' · '+bf+' baffles':'')+'. Rotate the preview and check it.';
    $('#resultActions').classList.add('show');
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false;}
});
$('#downloadTower').addEventListener('click',()=>{if(generatedBlob)downloadBlob(generatedBlob,generatedName)});
$('#sliceTower').addEventListener('click',async()=>{
  if(!generatedBlob)return;
  await sliceFile(new File([generatedBlob],generatedName,{type:'model/stl'}),generatedName,$('#towerStatus'),$('#sliceTower'),'off','terrain');
});

/* Model Doctor */
const doctorViewer=createViewer($('#doctorViewer'));
let doctorOriginal=null,doctorRepaired=null,doctorRepairedName='Repaired.stl';

$('#doctorModel').addEventListener('change',async e=>{
  const f=e.target.files[0];
  doctorOriginal=f||null;
  doctorRepaired=null;
  $('#doctorSummary').classList.add('hidden');
  $('#repairedActions').classList.remove('show');
  $('#doctorFileHelp').textContent=f?(f.name+' · '+(f.size/1048576).toFixed(1)+' MB'):'STL, OBJ or PLY · up to 75 MB';
  if(!f)return;
  if(f.name.toLowerCase().endsWith('.stl')){
    try{await doctorViewer.showFile(f,false)}catch{}
  }
});

function renderDoctor(report){
  $('#doctorSummary').classList.remove('hidden');
  $('#docDims').textContent=report.dimensions_mm.map(v=>Number(v).toFixed(1)).join(' × ');
  $('#docTriangles').textContent=Number(report.triangles).toLocaleString();
  $('#docParts').textContent=report.connected_parts;
  $('#docWater').textContent=report.watertight?'Watertight':'Needs repair';
  const list=$('#doctorIssues');list.innerHTML='';
  for(const issue of report.issues){
    const div=document.createElement('div');
    div.className='issue '+issue.level;
    div.innerHTML='<strong>'+issue.title+'</strong><span>'+issue.detail+'</span>';
    list.appendChild(div);
  }
  $('#repairActions').classList.add('show');
  $('#repairModel').style.display=report.repair_recommended?'block':'none';
}

$('#inspectModel').addEventListener('click',async()=>{
  const f=$('#doctorModel').files[0],s=$('#doctorStatus'),b=$('#inspectModel');
  if(!f){s.className='status bad';s.textContent='Choose a model first.';return;}
  b.disabled=true;s.className='status';s.textContent='Checking geometry…';
  const fd=new FormData();fd.append('model',f);fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/doctor/inspect',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    const report=await r.json();renderDoctor(report);
    s.className=report.fits_printer?'status ok':'status bad';
    s.textContent=report.fits_printer?'Check complete — model fits the Neptune 3 Pro.':'Check complete — this orientation does not fit the Neptune 3 Pro.';
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false;}
});

$('#repairModel').addEventListener('click',async()=>{
  const f=$('#doctorModel').files[0],s=$('#doctorStatus'),b=$('#repairModel');
  if(!f)return;
  b.disabled=true;s.className='status';s.textContent='Repairing mesh…';
  const fd=new FormData();fd.append('model',f);fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/doctor/repair',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    doctorRepaired=await r.blob();
    doctorRepairedName=f.name.replace(/\.(stl|obj|ply)$/i,'')+'_Repaired.stl';
    const repairedFile=new File([doctorRepaired],doctorRepairedName,{type:'model/stl'});
    await doctorViewer.showFile(repairedFile,false);
    $('#repairedActions').classList.add('show');
    s.className='status ok';
    s.textContent='Repair complete · mesh '+(r.headers.get('X-RQ-Watertight')==='yes'?'is now watertight':'still has complex open geometry')+'. Rotate the preview before printing.';
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false;}
});

$('#downloadRepaired').addEventListener('click',()=>{if(doctorRepaired)downloadBlob(doctorRepaired,doctorRepairedName)});
$('#sliceChecked').addEventListener('click',async()=>{
  if(!doctorOriginal)return;
  await sliceFile(doctorOriginal,doctorOriginal.name,$('#doctorStatus'),$('#sliceChecked'));
});
$('#sliceRepaired').addEventListener('click',async()=>{
  if(!doctorRepaired)return;
  await sliceFile(new File([doctorRepaired],doctorRepairedName,{type:'model/stl'}),doctorRepairedName,$('#doctorStatus'),$('#sliceRepaired'));
});

/* PWA */
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#install').style.display='block'});
$('#install').addEventListener('click',async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
  $('#install').style.display='none';
});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});

renderHistory();
