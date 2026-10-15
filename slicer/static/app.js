import { createViewer } from '/assets/viewer.js';

const $=s=>document.querySelector(s);
const pin=$('#access_pin');
pin.value=localStorage.getItem('rqs_pin')||'';
pin.addEventListener('change',()=>localStorage.setItem('rqs_pin',pin.value));

const nozzleLayers={
  '0.2':{mini:0.08,normal:0.12,terrain:0.14,strong:0.12,draft:0.16},
  '0.4':{mini:0.12,normal:0.20,terrain:0.24,strong:0.20,draft:0.28},
  '0.6':{mini:0.18,normal:0.28,terrain:0.32,strong:0.28,draft:0.36},
  '0.8':{mini:0.24,normal:0.36,terrain:0.44,strong:0.36,draft:0.52},
  '1.0':{mini:0.30,normal:0.45,terrain:0.55,strong:0.45,draft:0.65}
};
const presetMeta={
  normal:'3 walls · 20% infill',
  mini:'3 walls · detail focused',
  terrain:'3 walls · 12% infill',
  strong:'5 walls · 35% infill',
  draft:'2 walls · quickest test'
};
const nozzleNotes={
  '0.2':{title:'0.2 mm · Mini/detail',text:'Finest detail and slowest output. Best for miniatures and small engraved features.',tone:'safe'},
  '0.4':{title:'0.4 mm · Standard',text:'Balanced default. Make sure the physical nozzle fitted to the Neptune matches this selection.',tone:'safe'},
  '0.6':{title:'0.6 mm · Terrain/strong',text:'Thicker lines and layers. Faster for terrain and practical parts; detail is reduced.',tone:'safe'},
  '0.8':{title:'0.8 mm · Large prints',text:'Large layers with deliberately reduced extrusion speeds to keep PLA+ flow sensible.',tone:'warn'},
  '1.0':{title:'1.0 mm · Coarse/huge prints',text:'Very coarse detail. Speeds are heavily limited to avoid demanding excessive flow from the stock hotend.',tone:'warn'}
};
function updatePresetNote(){
  const n=$('#nozzle_diameter').value,p=$('#preset').value;
  $('#presetNote').textContent=nozzleLayers[n][p].toFixed(2)+' mm layers · '+presetMeta[p];
}
function updateNozzleNote(){
  const n=nozzleNotes[$('#nozzle_diameter').value],box=$('#nozzleNote');
  box.className='support-note '+n.tone;box.innerHTML='<strong>'+n.title+'</strong><span>'+n.text+'</span>';
  updatePresetNote();
}
$('#preset').addEventListener('change',updatePresetNote);
$('#nozzle_diameter').addEventListener('change',updateNozzleNote);
updateNozzleNote();

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
    $('#aiPanel').classList.toggle('active',b.dataset.tab==='ai');
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
    const bits=[item.preset,(item.nozzle?item.nozzle+' mm nozzle':null),supportLabel(item.support)].filter(Boolean);
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
  fd.append('nozzle_diameter',$('#nozzle_diameter').value);
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
    const nozzleUsed=r.headers.get('X-RQ-Nozzle-MM')||$('#nozzle_diameter').value;
    downloadBlob(await r.blob(),name.replace(/\.(stl|3mf|obj|ply)$/i,'')+'_'+nozzleUsed+'mm_N3Pro.gcode');
    const bits=[];
    if(printTime&&printTime!=='unknown')bits.push(printTime);
    if(filamentG&&filamentG!=='unknown')bits.push(Number(filamentG).toFixed(1)+' g filament');
    else if(filamentMM&&filamentMM!=='unknown')bits.push((Number(filamentMM)/1000).toFixed(2)+' m filament');
    statusEl.className='status ok';
    statusEl.textContent='Done — G-code downloaded'+(bits.length?' · '+bits.join(' · '):'')+'.';
    try{
      const history=JSON.parse(localStorage.getItem('rqs_history')||'[]');
      history.unshift({name,when:new Date().toISOString(),preset:presetMode||$('#preset').value,nozzle:nozzleUsed,support:supportMode||$('#supports').value,time:printTime||'',filament_g:filamentG||''});
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
    $('#useEditedForSplit').disabled=false;
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false}
});

$('#downloadEdit').addEventListener('click',()=>{if(editBlob)downloadBlob(editBlob,editName)});
$('#sliceEdit').addEventListener('click',async()=>{
  if(!editBlob)return;
  await sliceFile(new File([editBlob],editName,{type:'model/stl'}),editName,$('#editStatus'),$('#sliceEdit'));
});

/* Model Splitter */
const splitViewer=createViewer($('#splitViewer'));
let splitSource=null;

function splitOpts(){
  return {axis:$('#splitAxis').value,percent:Number($('#splitPercent').value||50)};
}
function updateSplitPreview(){
  $('#splitPercentValue').textContent=$('#splitPercent').value+'%';
  const d=splitViewer.splitPreview(splitOpts());
  if(!d)return;
  const fmt=v=>v.map(x=>x.toFixed(0)).join('×');
  $('#splitACheck').innerHTML='<strong>'+fmt(d.a)+'</strong>Part A mm';
  $('#splitACheck').className='check '+(d.aFit?'good':'bad');
  $('#splitBCheck').innerHTML='<strong>'+fmt(d.b)+'</strong>Part B mm';
  $('#splitBCheck').className='check '+(d.bFit?'good':'bad');
  const both=d.aFit&&d.bFit;
  $('#splitFitCheck').innerHTML='<strong>'+(both?'Yes':'No')+'</strong>Both fit';
  $('#splitFitCheck').className='check '+(both?'good':'bad');
}
async function loadSplitSource(file,label){
  splitSource=file;
  $('#splitFileHelp').textContent=label+' · '+(file.size/1048576).toFixed(1)+' MB';
  try{
    await splitViewer.showFile(file,true);
    updateSplitPreview();
    $('#splitStatus').className='status ok';
    $('#splitStatus').textContent='Split preview ready.';
  }catch(x){
    $('#splitStatus').className='status bad';$('#splitStatus').textContent='Preview failed: '+x.message;
  }
}
$('#splitModel').addEventListener('change',async e=>{
  const f=e.target.files[0];if(f)await loadSplitSource(f,f.name);
});
$('#useEditedForSplit').addEventListener('click',async()=>{
  if(!editBlob)return;
  const f=new File([editBlob],editName,{type:'model/stl'});
  await loadSplitSource(f,'Using '+editName);
});
for(const id of ['splitAxis','splitPercent']){
  $('#'+id).addEventListener('input',updateSplitPreview);
  $('#'+id).addEventListener('change',updateSplitPreview);
}
$('#buildSplit').addEventListener('click',async()=>{
  const s=$('#splitStatus'),b=$('#buildSplit');
  if(!splitSource){s.className='status bad';s.textContent='Choose an STL or use the last edited STL first.';return}
  b.disabled=true;s.className='status';s.textContent='Cutting model into two STL parts…';
  const o=splitOpts(),fd=new FormData();
  fd.append('model',splitSource);fd.append('axis',o.axis);fd.append('split_percent',o.percent);fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/edit/split',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    const a=r.headers.get('X-RQ-Part-A'),bb=r.headers.get('X-RQ-Part-B'),fit=r.headers.get('X-RQ-Both-Fit');
    const zipName=splitSource.name.replace(/\.stl$/i,'')+'_Split_Parts.zip';
    downloadBlob(await r.blob(),zipName);
    s.className=fit==='yes'?'status ok':'status bad';
    s.textContent='Split complete — ZIP downloaded'+(a&&bb?' · A: '+a.replaceAll(',','×')+' mm · B: '+bb.replaceAll(',','×')+' mm':'')+(fit==='yes'?' · both parts fit the Neptune.':' · at least one part is still too large.');
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false}
});

/* Dice Tower Builder */
const viewer=createViewer($('#viewer'));
let towerIsDemo=true;
// This real mesh can be rotated; exports still require an uploaded STL.
window.rqSoftwareViewer?.hideTower();
viewer.showDemoTower();
let generatedBlob=null,generatedName='Rookie_Quest_Dice_Tower.stl';
function towerOpts(){
  return {
    scale:Number($('#towerScale').value),
    rotation:Number($('#towerRotation').value),
    dice:Number($('#diceSize').value),
    tray:Number($('#trayDepth').value),
    trayX:Number($('#trayX').value||0),
    chuteX:Number($('#chuteX').value||0),
    chuteY:Number($('#chuteY').value||0),
    chuteStyle:$('#chuteStyle').value
  };
}
const chuteStyleNotes={
  straight:{title:'Straight Drop',text:'Shortest route. Least internal geometry and the fastest dice exit. Good when the tower is narrow or compact.',tone:'safe'},
  zigzag:{title:'Zig-Zag Platforms',text:'Alternating ramps force side-to-side impacts for a more satisfying tumble and slower exit.',tone:'safe'},
  spiral:{title:'Spiral / Spring',text:'A real helical tunnel gives the longest travel. It needs more width and height than the other styles.',tone:'warn'}
};
function updateChuteStyleNote(){
  const v=$('#chuteStyle').value,n=chuteStyleNotes[v],box=$('#chuteStyleNote');
  box.className='support-note '+n.tone;
  box.innerHTML='<strong>'+n.title+'</strong><span>'+n.text+'</span>';
}

function towerChecks(){
  const d=viewer.preview(towerOpts());
  if(!d)return;
  $('#dimCheck').innerHTML='<strong>'+d.w.toFixed(0)+'×'+d.d.toFixed(0)+'×'+d.h.toFixed(0)+'</strong>Model mm';
  $('#dimCheck').className='check good';
  const min=d.channel+14,minH=d.minH||Math.max(95,towerOpts().dice+65),good=d.w>=min&&d.d>=min&&d.h>=minH;
  $('#chuteCheck').innerHTML='<strong>'+(good?'Good':'Too small')+'</strong>'+d.channel.toFixed(0)+' mm chute';
  $('#chuteCheck').className='check '+(good?'good':'bad');
  const fit=d.outW<=225&&d.outD<=225&&d.h<=280;
  $('#bedCheck').innerHTML='<strong>'+(fit?'Fits':'Too large')+'</strong>'+d.outW.toFixed(0)+'×'+d.outD.toFixed(0);
  $('#bedCheck').className='check '+(fit?'good':'bad');
  if(!d.chuteSafe){
    $('#chuteCheck').innerHTML='<strong>Path unsafe</strong>'+d.transitionAngle.toFixed(1)+'° tray turn';
    $('#chuteCheck').className='check bad';
  }else{
    $('#chuteCheck').innerHTML='<strong>'+(good?'Good':'Too small')+'</strong>'+d.style+' · '+d.minClearance.toFixed(1)+' mm clearance';
    $('#chuteCheck').className='check '+(good?'good':'bad');
  }
}
$('#towerModel').addEventListener('change',async e=>{
  const f=e.target.files[0];
  generatedBlob=null;
  $('#resultActions').classList.remove('show');
  $('#towerFileHelp').textContent=f?(f.name+' · '+(f.size/1048576).toFixed(1)+' MB'):'STL · up to 125 MB · AI/Meshy files supported';
  if(!f)return;
  try{
    await viewer.showFile(f,true);
    towerIsDemo=false;
    towerChecks();
  }catch(x){
    $('#towerStatus').className='status bad';
    $('#towerStatus').textContent='Preview failed: '+x.message;
  }
});
for(const id of ['towerScale','towerRotation','diceSize','chuteStyle','trayDepth','trayX','chuteX','chuteY']){
  $('#'+id).addEventListener('input',()=>{
    $('#towerScaleValue').textContent=$('#towerScale').value+'%';
    $('#trayDepthValue').textContent=$('#trayDepth').value+' mm';
    const tx=Number($('#trayX').value||0);
    $('#trayXValue').textContent=(Math.abs(tx)<.5?'Centre':(tx<0?'Left ':'Right ')+Math.abs(tx).toFixed(0)+' mm');
    if(id==='chuteStyle')updateChuteStyleNote();
    towerChecks();
  });
}
updateChuteStyleNote();
towerChecks();
$('#towerDemoReset').addEventListener('click',()=>{
  $('#towerModel').value='';
  towerIsDemo=true;
  generatedBlob=null;
  $('#resultActions').classList.remove('show');
  viewer.showDemoTower();
  towerChecks();
  $('#towerStatus').className='status ok';
  $('#towerStatus').textContent='Sample 3D tower reloaded. You can test its chute and D20; upload your own STL to build or export.';
});
$('#jumpTowerBuilder').addEventListener('click',()=>{
  document.querySelector('.tab[data-tab="design"]').click();
  $('#designPanel').scrollIntoView({behavior:'smooth',block:'start'});
});
async function requestTowerSuggestion(keepTray){
  const f=$('#towerModel').files[0],s=$('#towerStatus');
  const b=keepTray?$('#smartFromTray'):$('#smartTower'),note=$('#smartTowerNote');
  if(!f){s.className='status bad';s.textContent='Choose an STL first.';return}
  b.disabled=true;s.className='status';
  s.textContent=keepTray?'Keeping the tray here and calculating a path…':'Scanning tray side, tray position and chute path…';
  const fd=new FormData();
  fd.append('model',f);
  fd.append('scale_percent',$('#towerScale').value);
  fd.append('dice_mm',$('#diceSize').value);
  fd.append('tray_depth',$('#trayDepth').value);
  fd.append('front_rotation',keepTray?$('#towerRotation').value:'auto');
  fd.append('tray_x_mm',keepTray?$('#trayX').value:'auto');
  fd.append('chute_style',$('#chuteStyle').value);
  fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/design/dice-tower-suggest',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    const result=await r.json(),rec=result.recommendation;
    $('#towerRotation').value=String(rec.rotation_z);
    $('#trayX').value=Math.max(-60,Math.min(60,Number(rec.tray_x_mm))).toFixed(0);
    $('#chuteX').value=Number(rec.chute_x_mm).toFixed(1);
    $('#chuteY').value=Number(rec.chute_y_mm).toFixed(1);
    const tx=Number($('#trayX').value||0);
    $('#trayXValue').textContent=(Math.abs(tx)<.5?'Centre':(tx<0?'Left ':'Right ')+Math.abs(tx).toFixed(0)+' mm');
    towerChecks();
    note.className='support-note '+(result.confidence==='high'?'safe':'warn');
    note.innerHTML='<strong>Path suggestion · '+result.confidence+' confidence</strong><span>'+result.reasons.join(' · ')+'</span>';
    s.className=rec.fits_printer&&rec.physically_possible?'status ok':'status bad';
    s.textContent='Applied · front '+rec.rotation_z+'° · tray '+rec.tray_x_mm+' mm · chute '+rec.chute_x_mm+' / '+rec.chute_y_mm+' mm · '+rec.transition_angle_deg+'° transition.';
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false}
}
$('#smartTower').addEventListener('click',()=>requestTowerSuggestion(false));
$('#smartFromTray').addEventListener('click',()=>requestTowerSuggestion(true));

$('#simulateDice').addEventListener('click',async()=>{
  const f=$('#towerModel').files[0],box=$('#diceSimResult'),b=$('#simulateDice');
  if(!f && !towerIsDemo){
    box.className='support-note warn';
    box.innerHTML='<strong>No model loaded</strong><span>Choose an STL or reload the sample tower.</span>';
    return;
  }
  b.disabled=true;
  box.className='support-note neutral';
  box.innerHTML='<strong>Running virtual drop…</strong><span>Following the planned '+$('#chuteStyle').value+' path.</span>';
  try{
    const result=await viewer.runDiceSimulation(towerOpts());
    box.className='support-note '+(result.ok?'safe':'warn');
    if(result.ok){
      const seconds=(result.durationMs/1000).toFixed(1);
      box.innerHTML='<strong>Visual centreline completed · '+seconds+' s path</strong><span>Estimated clearance: '+Number(result.minClearance).toFixed(1)+' mm'
        +(result.turns?(' · '+Number(result.turns).toFixed(2)+' spiral turns'):'')
        +' · This is not a full collision-physics test or final STL certification.</span>';
    }else{
      box.innerHTML='<strong>Potential jam / geometry problem</strong><span>'+result.message+' Minimum planned clearance: '+Number(result.minClearance||0).toFixed(1)+' mm.</span>';
    }
  }catch(x){
    box.className='support-note warn';
    box.innerHTML='<strong>Simulation error</strong><span>'+x.message+'</span>';
  }finally{b.disabled=false}
});

$('#rescueTower').addEventListener('click',async()=>{
  const f=$('#towerModel').files[0],s=$('#towerStatus'),b=$('#rescueTower');
  if(!f){s.className='status bad';s.textContent='Choose the solid AI-generated STL first.';return}
  if(f.size>125*1024*1024){s.className='status bad';s.textContent='That file is over the 125 MB AI Rescue limit.';return}
  b.disabled=true;s.className='status';
  s.textContent='AI Rescue: rebuilding mesh, fixing scale, detecting tray and carving dice path…';
  const fd=new FormData();
  fd.append('model',f);
  fd.append('dice_mm',$('#diceSize').value);
  fd.append('target_height_mm',$('#aiTowerHeight').value);
  fd.append('tray_depth',$('#trayDepth').value);
  fd.append('tray_mode',$('#aiTrayMode').value);
  fd.append('rotation_z',$('#towerRotation').value);
  fd.append('chute_style',$('#chuteStyle').value);
  fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/design/ai-dice-tower',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    generatedBlob=await r.blob();
    generatedName=f.name.replace(/\.stl$/i,'')+'_AI_Rescued_Dice_Tower.stl';
    await viewer.showFile(new File([generatedBlob],generatedName,{type:'model/stl'}),false);
    const dm=r.headers.get('X-RQ-Dimensions');
    const tris=r.headers.get('X-RQ-Source-Triangles');
    const tray=r.headers.get('X-RQ-Tray-Mode');
    const existing=r.headers.get('X-RQ-Existing-Tray');
    const channel=r.headers.get('X-RQ-Channel');
    const bf=r.headers.get('X-RQ-Baffles');
    const style=r.headers.get('X-RQ-Chute-Style');
    const turns=r.headers.get('X-RQ-Spiral-Turns');
    s.className='status ok';
    s.textContent='AI Rescue complete'
      +(dm?' · '+dm.replaceAll(',',' × ')+' mm':'')
      +(tris?' · source '+Number(tris).toLocaleString()+' triangles':'')
      +(style?' · '+style+' chute':'')
      +(channel?' · channel '+channel+' mm':'')
      +(bf&&Number(bf)>0?' · '+bf+' baffles':'')
      +(turns&&Number(turns)>0?' · '+Number(turns).toFixed(2)+' spiral turns':'')
      +(tray?' · tray '+tray+(existing==='yes'?' (detected in model)':''):'')
      +'. Rotate the result before printing.';
    $('#resultActions').classList.add('show');
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false}
});

$('#buildTower').addEventListener('click',async()=>{
  const f=$('#towerModel').files[0],s=$('#towerStatus'),b=$('#buildTower');
  if(!f){s.className='status bad';s.textContent='Choose an STL first.';return;}
  b.disabled=true;s.className='status';s.textContent='Building chute, ramps and catch tray…';
  const fd=new FormData(),o=towerOpts();
  fd.append('model',f);fd.append('scale_percent',o.scale);fd.append('rotation_z',o.rotation);
  fd.append('dice_mm',o.dice);fd.append('tray_depth',o.tray);fd.append('tray_x_mm',o.trayX);
  fd.append('chute_x_mm',o.chuteX);fd.append('chute_y_mm',o.chuteY);
  fd.append('chute_style',o.chuteStyle);
  fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/design/dice-tower',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    generatedBlob=await r.blob();
    generatedName=f.name.replace(/\.stl$/i,'')+'_Dice_Tower.stl';
    await viewer.showFile(new File([generatedBlob],generatedName,{type:'model/stl'}),false);
    const dm=r.headers.get('X-RQ-Dimensions'),bf=r.headers.get('X-RQ-Baffles'),cx=r.headers.get('X-RQ-Chute-X'),cy=r.headers.get('X-RQ-Chute-Y'),tx=r.headers.get('X-RQ-Tray-X'),angle=r.headers.get('X-RQ-Transition-Angle'),style=r.headers.get('X-RQ-Chute-Style'),turns=r.headers.get('X-RQ-Spiral-Turns');
    s.className='status ok';
    s.textContent='Tower built'+(dm?' · '+dm.replaceAll(',',' × ')+' mm':'')+(style?' · '+style:'')+(bf&&Number(bf)>0?' · '+bf+' baffles':'')+(turns&&Number(turns)>0?' · '+Number(turns).toFixed(2)+' turns':'')+(tx?' · tray '+tx+' mm':'')+(cx&&cy?' · chute '+cx+' / '+cy+' mm':'')+(angle?' · path '+angle+'°':'')+'. Rotate the preview and check it.';
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
let doctorOriginal=null,doctorRepaired=null,doctorRepairedName='Repaired.stl',suggestedSupportMode='gentle_bed';

$('#doctorModel').addEventListener('change',async e=>{
  const f=e.target.files[0];
  doctorOriginal=f||null;
  doctorRepaired=null;
  $('#doctorSummary').classList.add('hidden');
  $('#repairedActions').classList.remove('show');
  $('#doctorFileHelp').textContent=f?(f.name+' · '+(f.size/1048576).toFixed(1)+' MB'):'STL, OBJ or PLY · up to 125 MB';
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
  const advice=report.support_advice||{};
  suggestedSupportMode=advice.recommended_mode||'gentle_bed';
  const supportBox=$('#supportAdvisor');
  supportBox.className='support-note '+(suggestedSupportMode==='off'||suggestedSupportMode.includes('_bed')?'safe':'warn');
  $('#supportMode').textContent='Suggested · '+(advice.recommended_label||supportLabel(suggestedSupportMode))+(advice.confidence?' · '+advice.confidence+' confidence':'');
  $('#supportReasons').textContent=(advice.reasons||['Support analysis unavailable.']).join(' · ')+' · Preview: amber = overhang, red = steep underside.';
  $('#supportOverhang').textContent=advice.overhang_area_pct==null?'—':Number(advice.overhang_area_pct).toFixed(1)+'%';
  $('#supportBlocked').textContent=advice.blocked_overhang_pct==null?'—':Number(advice.blocked_overhang_pct).toFixed(0)+'%';
  const list=$('#doctorIssues');list.innerHTML='';
  for(const issue of report.issues){
    const div=document.createElement('div');
    div.className='issue '+issue.level;
    div.innerHTML='<strong>'+issue.title+'</strong><span>'+issue.detail+'</span>';
    list.appendChild(div);
  }
  $('#repairActions').classList.add('show');
  $('#repairModel').style.display=report.repair_recommended?'block':'none';
  doctorViewer.overhangHeatmap();
}

$('#useSuggestedSupport').addEventListener('click',()=>{
  $('#supports').value=suggestedSupportMode;
  updateSupportNote();
  const sliceTab=document.querySelector('.tab[data-tab="slice"]');
  if(sliceTab)sliceTab.click();
  $('#sliceStatus').className='status ok';
  $('#sliceStatus').textContent='Support Advisor applied: '+supportLabel(suggestedSupportMode)+'. Review the model orientation before slicing.';
});

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

/* AI Link */
const MCP_PUBLIC_ENDPOINT='https://rookie-quest-slicer-ai.onrender.com/mcp';
$('#mcpEndpoint').textContent=MCP_PUBLIC_ENDPOINT;
$('#mcpStatus').textContent='Use this remote MCP endpoint after adding the private connector token.';

$('#aiModel').addEventListener('change',e=>{
  const f=e.target.files[0];
  $('#aiFileHelp').textContent=f?(f.name+' · '+(f.size/1048576).toFixed(1)+' MB'):'STL, 3MF, OBJ or PLY · up to 125 MB';
  $('#aiResult').classList.add('hidden');
});

$('#uploadAI').addEventListener('click',async()=>{
  const f=$('#aiModel').files[0],s=$('#aiStatus'),b=$('#uploadAI');
  if(!f){s.className='status bad';s.textContent='Choose a model first.';return}
  b.disabled=true;s.className='status';s.textContent='Creating temporary AI asset…';
  const fd=new FormData();fd.append('model',f);fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/ai/assets',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    const data=await r.json();
    $('#aiAssetId').textContent=data.asset_id;
    $('#aiPromptAsset').textContent=data.asset_id;
    const report=data.report||{};
    $('#aiDims').textContent=report.dimensions_mm?report.dimensions_mm.map(v=>Number(v).toFixed(0)).join(' × '):'—';
    $('#aiMesh').textContent=report.watertight===true?'Watertight':(report.watertight===false?'Needs repair':'Stored');
    const link=$('#aiPreviewLink');
    if(data.preview_url){link.href=data.preview_url;link.style.display='block'}else{link.style.display='none'}
    $('#aiResult').classList.remove('hidden');
    s.className='status ok';
    s.textContent='AI asset ready · expires in about '+data.expires_in_hours+' hours.';
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false}
});

$('#createConnectorKey').addEventListener('click',async()=>{
  const s=$('#connectorStatus'),b=$('#createConnectorKey');
  b.disabled=true;s.className='status';s.textContent='Creating private expiring connection…';
  const fd=new FormData();
  fd.append('label',$('#connectorLabel').value.trim()||"Friend's AI");
  fd.append('days',$('#connectorDays').value);
  fd.append('access_pin',pin.value);
  try{
    const r=await fetch('/ai/connector-key',{method:'POST',body:fd});
    if(!r.ok)throw Error(await err(r));
    const data=await r.json();
    $('#connectorUrl').textContent=data.connection_url;
    $('#connectorResult').classList.remove('hidden');
    const date=new Date(data.expires_at*1000);
    s.className='status ok';
    s.textContent='Connection ready for '+data.label+' · expires '+date.toLocaleString()+'.';
  }catch(x){
    s.className='status bad';s.textContent=x.message;
  }finally{b.disabled=false}
});

$('#copyConnectorUrl').addEventListener('click',async()=>{
  const url=$('#connectorUrl').textContent;
  if(!url||url==='—')return;
  try{
    await navigator.clipboard.writeText(url);
    $('#connectorStatus').className='status ok';
    $('#connectorStatus').textContent='Private connection URL copied.';
  }catch{
    $('#connectorStatus').className='status bad';
    $('#connectorStatus').textContent='Could not use clipboard — press and hold the URL to copy it.';
  }
});

$('#copyAssetId').addEventListener('click',async()=>{
  const id=$('#aiAssetId').textContent;
  if(!id||id==='—')return;
  try{await navigator.clipboard.writeText(id);$('#aiStatus').className='status ok';$('#aiStatus').textContent='Asset ID copied.'}
  catch{$('#aiStatus').className='status bad';$('#aiStatus').textContent='Could not use clipboard — press and hold the asset ID to copy it.'}
});

const requestedTab=new URLSearchParams(location.search).get('tab');
if(requestedTab){
  const target=document.querySelector('.tab[data-tab="'+requestedTab+'"]');
  if(target)target.click();
}

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

window.rqAppReady=true;
