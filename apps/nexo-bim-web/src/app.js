// SPDX-License-Identifier: AGPL-3.0-only
import {exampleProject,validateProject,nearestWall,newWall,addOpening,
  duplicateLevel,projectStats,lengthOf,sceneTriangles,roundGrid,clamp} from './model.js';
import {projectToGLB} from './glb.js';

const el=id=>document.getElementById(id);
const plan=el('plan'), canvas=el('model'),ctx=canvas.getContext('2d');
const W=1000,H=700,OX=160,OY=575;
let ppm=60, project=exampleProject(),levelId='l1',selectedId=null,tool='select';
let firstPoint=null,hover=null,view='split',undoStack=[];
let yaw=-.75,pitch=.65,zoom=1.0,drag=null;
const fmt=(n,p=2)=>Number(n).toLocaleString('es-CO',{minimumFractionDigits:p,maximumFractionDigits:p});
const pos=p=>[OX+p[0]*ppm,OY-p[1]*ppm];
const world=p=>[(p[0]-OX)/ppm,(OY-p[1])/ppm];
const svgPoint=e=>{
  const point=plan.createSVGPoint();point.x=e.clientX;point.y=e.clientY;
  return point.matrixTransform(plan.getScreenCTM().inverse());
};
const pointFromEvent=e=>world(([{x:svgPoint(e).x,y:svgPoint(e).y}][0] && [svgPoint(e).x,svgPoint(e).y]));
function safeMessage(message,isError=false) {
  el('status').textContent=message;el('status').classList.toggle('error',isError);
}
function getLevel(){return project.levels.find(l=>l.id===levelId)||project.levels[0];}
function getWall(){return project.walls.find(w=>w.id===selectedId);}
function download(blob,filename) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function nameForFile(ext) {
  return (project.name||'proyecto').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,65).replace(/^-|-$/g,'')+'.'+ext;
}
function saveLocal() {
  try{localStorage.setItem('nexo-bim-project-v1',JSON.stringify(project));}
  catch{safeMessage('No se pudo guardar automáticamente. Descarga el JSON.',true);}
}
function transact(edit,message) {
  const previous=structuredClone(project);
  try {
    edit();validateProject(project);
    undoStack.push(previous);if(undoStack.length>60)undoStack.shift();
    saveLocal();renderAll();safeMessage(message);
    return true;
  } catch(err) {
    project=previous;renderAll();safeMessage('Cambio rechazado: '+err.message,true);return false;
  }
}
function gridSnap(p,orthogonal=false) {
  const out=roundGrid(p);
  if(firstPoint&&orthogonal) {
    if(Math.abs(out[0]-firstPoint[0])>Math.abs(out[1]-firstPoint[1]))out[1]=firstPoint[1];
    else out[0]=firstPoint[0];
  }
  return out;
}
function line(p,q,attrs='') {
  const a=pos(p),b=pos(q);return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" '+attrs+'/>';
}
function renderPlan() {
  const grid=[];
  for(let x=-4;x<17;x+=.25) {
    const sx=pos([x,0])[0];
    grid.push('<line x1="'+sx+'" y1="0" x2="'+sx+'" y2="'+H+'" stroke="'+(Math.round(x*4)%4===0?'#e6e3db':'#f1eee8')+'" stroke-width=".7"/>');
  }
  for(let y=-3;y<13;y+=.25) {
    const sy=pos([0,y])[1];
    grid.push('<line x1="0" y1="'+sy+'" x2="'+W+'" y2="'+sy+'" stroke="'+(Math.round(y*4)%4===0?'#e6e3db':'#f1eee8')+'" stroke-width=".7"/>');
  }
  grid.push(line([-3,0],[14,0],'stroke="#a2b8ae" stroke-width="1.6"'));
  grid.push(line([0,-2],[0,11],'stroke="#a2b8ae" stroke-width="1.6"'));
  el('svg-grid').innerHTML=grid.join('');
  const items=[];
  for(const wall of project.walls.filter(w=>w.levelId===levelId)) {
    const a=pos(wall.a),b=pos(wall.b),t=Math.max(wall.thickness*ppm,6);
    const chosen=wall.id===selectedId;
    items.push('<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+
      '" stroke="'+(chosen?'#b8925b':'#89918e')+'" stroke-linecap="square" stroke-width="'+(t+2)+'"/>');
    items.push('<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+
      '" stroke="'+(chosen?'#d8b984':'#e6e5df')+'" stroke-linecap="square" stroke-width="'+t+'"/>');
    const dx=(b[0]-a[0])/lengthOf(wall),dy=(b[1]-a[1])/lengthOf(wall);
    for(const opening of wall.openings) {
      const p0=[a[0]+dx*(opening.offset-opening.width/2),a[1]+dy*(opening.offset-opening.width/2)];
      const p1=[a[0]+dx*(opening.offset+opening.width/2),a[1]+dy*(opening.offset+opening.width/2)];
      items.push('<line x1="'+p0[0]+'" y1="'+p0[1]+'" x2="'+p1[0]+'" y2="'+p1[1]+
        '" stroke="#fdfcf9" stroke-width="'+(t+3)+'"/>');
      const c=opening.kind==='window'?'#609fa5':'#a98e65';
      items.push('<line x1="'+p0[0]+'" y1="'+p0[1]+'" x2="'+p1[0]+'" y2="'+p1[1]+
        '" stroke="'+c+'" stroke-width="'+(opening.kind==='window'?4:2)+'"/>');
      if(opening.kind==='door') {
        const center=p0;
        items.push('<path d="M '+center[0]+' '+center[1]+' A '+(opening.width*ppm)+' '+(opening.width*ppm)+
          ' 0 0 1 '+(center[0]+(p1[1]-p0[1]))+' '+(center[1]-(p1[0]-p0[0]))+
          '" fill="none" stroke="'+c+'" stroke-width="1" stroke-dasharray="4 4"/>');
      }
    }
    if(chosen) {
      const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      items.push('<text x="'+mid[0]+'" y="'+(mid[1]-16)+'" text-anchor="middle" font-size="14" fill="#957147" font-weight="700">'+fmt(lengthOf(wall))+' m</text>');
      for(const p of [a,b])items.push('<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" stroke="#8e6d43" stroke-width="2" fill="white"/>');
    }
  }
  el('svg-walls').innerHTML=items.join('');
  const overlays=[];
  if(firstPoint) {
    const a=pos(firstPoint);
    overlays.push('<circle cx="'+a[0]+'" cy="'+a[1]+'" r="6" fill="#b59563" stroke="white" stroke-width="2"/>');
    if(hover)overlays.push(line(firstPoint,hover,'stroke="#bb9660" stroke-width="7" stroke-linecap="round" stroke-dasharray="10 7" opacity=".7"'));
  }
  if(hover) {
    const p=pos(hover);
    overlays.push('<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#bd9969"/>');
  }
  el('svg-overlay').innerHTML=overlays.join('');
  el('floor-label').textContent=getLevel().name.toUpperCase();
}
function renderLevels() {
  const parent=el('levels');parent.replaceChildren();
  for(const l of project.levels) {
    const b=document.createElement('button');b.className='level'+(l.id===levelId?' active':'');
    const title=document.createElement('span');title.textContent=l.name;
    const elevation=document.createElement('small');elevation.textContent='+'+fmt(l.elevation)+' m';
    b.append(title,elevation);b.addEventListener('click',()=>{
      levelId=l.id;selectedId=null;firstPoint=null;renderAll();
    });parent.append(b);
  }
}
function inputField(title,key,value,min,max,step='0.01') {
  return '<div class="field"><label>'+title+'</label><input data-field="'+key+
    '" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"></div>';
}
function renderInspector() {
  const panel=el('inspector'),w=getWall();
  if(!w){panel.innerHTML='<div class="empty"><span>▧</span>Selecciona un muro en planta para editar sus propiedades.</div>';return;}
  const openings=w.openings.map((o,i)=>'<div class="opening-row"><span>'+
    (o.kind==='door'?'Puerta':'Ventana')+' · '+fmt(o.width)+' × '+fmt(o.height)+' m</span>'+
    '<button data-delete-opening="'+i+'" title="Eliminar vano">✕</button></div>').join('');
  panel.innerHTML='<h3 class="inspector-heading">Muro arquitectónico</h3>'+
    '<div class="meta">Elemento paramétrico · '+fmt(lengthOf(w))+' m de longitud</div>'+
    '<div class="fields-2">'+inputField('Espesor (m)','thickness',w.thickness,.05,1)+
    inputField('Altura (m)','height',w.height,.2,20)+'</div>'+
    '<div class="section-name">PUNTO INICIAL</div><div class="fields-2">'+
    inputField('X (m)','a0',w.a[0],-10000,10000)+inputField('Y (m)','a1',w.a[1],-10000,10000)+'</div>'+
    '<div class="section-name">PUNTO FINAL</div><div class="fields-2">'+
    inputField('X (m)','b0',w.b[0],-10000,10000)+inputField('Y (m)','b1',w.b[1],-10000,10000)+'</div>'+
    '<div class="section-name">VANOS ('+w.openings.length+')</div>'+
    (openings||'<p class="micro">Sin puertas ni ventanas.</p>')+
    '<button class="danger" id="delete-wall">Eliminar muro</button>';
}
function renderStats() {
  const s=projectStats(project);
  el('stat-walls').textContent=s.walls;el('stat-openings').textContent=s.openings;
  el('stat-length').textContent=fmt(s.length,1)+' m';
  el('stat-volume').textContent=fmt(s.volume,1)+' m³';
}
function updateView(){
  const parent=el('viewports');
  parent.className='viewports '+(view==='3d'?'three-d':view);
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  requestAnimationFrame(render3d);
}
function renderAll() {
  renderPlan();renderLevels();renderInspector();renderStats();
  el('project-name').value=project.name;el('undo').disabled=undoStack.length===0;updateView();
}
function shade(hex,brightness) {
  const parts=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  return 'rgb('+parts.map(v=>Math.round(clamp(v*brightness,0,255))).join(',')+')';
}
function render3d() {
  const rect=canvas.getBoundingClientRect();
  if(rect.width<2||rect.height<2)return;
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const width=rect.width,height=rect.height;
  const bg=ctx.createLinearGradient(0,0,0,height);
  bg.addColorStop(0,'#ebe9e5');bg.addColorStop(1,'#d6d9d6');
  ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  const triangles=sceneTriangles(project,selectedId);
  const points=project.walls.flatMap(w=>[w.a,w.b]);
  const cx=points.length?points.reduce((s,p)=>s+p[0],0)/points.length:0;
  const cy=points.length?points.reduce((s,p)=>s+p[1],0)/points.length:0;
  const centerZ=(Math.min(...project.levels.map(l=>l.elevation))+
    Math.max(...project.levels.map(l=>l.elevation+l.height)))/2;
  const scale=Math.min(width/15,height/11)*zoom;
  const cs=Math.cos(yaw),sn=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const projectVertex=([x,y,z])=>{
    const dx=x-cx,dy=y-cy,dz=z-centerZ;
    const u=dx*cs+dy*sn,depth=-dx*sn+dy*cs;
    return {x:width/2+u*scale,y:height/2+(depth*sp-dz*cp)*scale,
      depth:depth*cp+dz*sp};
  };
  const rendered=triangles.map(t=>{
    const vertices=t.vertices.map(projectVertex);
    return {...t,vertices,depth:vertices.reduce((s,p)=>s+p.depth,0)/3};
  }).sort((a,b)=>b.depth-a.depth);
  for(const tri of rendered) {
    const p=tri.vertices;
    ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
    ctx.lineTo(p[1].x,p[1].y);ctx.lineTo(p[2].x,p[2].y);ctx.closePath();
    const n=tri.normal,light=clamp(.79+n[2]*.16+n[0]*.07-n[1]*.09,.54,1.13);
    ctx.fillStyle=shade(tri.color,light);ctx.fill();
    ctx.strokeStyle=shade(tri.color,light*.86);ctx.lineWidth=.45;ctx.stroke();
  }
  if(!triangles.length){ctx.fillStyle='#7f837e';ctx.font='15px sans-serif';
    ctx.textAlign='center';ctx.fillText('Dibuja un muro para ver el modelo',width/2,height/2);}
}
function setTool(name) {
  tool=name;firstPoint=null;hover=null;
  document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===name));
  safeMessage(({select:'Selecciona un muro sobre la planta.',
    wall:'Muro: marca el inicio y el final. Cuadrícula de 0,25 m.',
    door:'Puerta: haz clic sobre el muro donde quieras instalarla.',
    window:'Ventana: haz clic sobre el muro donde quieras instalarla.'})[name]);
  renderPlan();
}
plan.addEventListener('pointermove',e=>{
  const pt=svgPoint(e),w=world([pt.x,pt.y]);hover=gridSnap(w,e.shiftKey);
  if(tool==='wall')renderPlan();
});
plan.addEventListener('pointerleave',()=>{hover=null;if(tool==='wall')renderPlan();});
plan.addEventListener('click',e=>{
  const p=svgPoint(e),wp=world([p.x,p.y]);
  if(tool==='wall') {
    const snapped=gridSnap(wp,e.shiftKey);
    if(!firstPoint){firstPoint=snapped;renderPlan();safeMessage('Primer punto definido. Marca el punto final.');return;}
    const a=firstPoint;firstPoint=null;
    if(transact(()=>{project.walls.push(newWall(a,snapped,levelId));},'Muro creado y sincronizado con el modelo 3D.'))
      selectedId=project.walls.at(-1).id;
    renderAll();return;
  }
  const match=nearestWall(project,levelId,wp,.4);
  if(tool==='select'){selectedId=match?.wall.id||null;renderAll();return;}
  if(!match){safeMessage('Haz clic cerca del eje de un muro.',true);return;}
  const kind=tool==='door'?'door':'window';
  if(transact(()=>addOpening(match.wall,kind,match.offset),'Vano agregado: '+kind+'.'))
    selectedId=match.wall.id;
  renderAll();
});
plan.addEventListener('contextmenu',e=>{e.preventDefault();firstPoint=null;renderPlan();});
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw,pitch};
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(!drag)return;
  yaw=drag.yaw+(e.clientX-drag.x)*.009;
  pitch=clamp(drag.pitch+(e.clientY-drag.y)*.006,.15,1.47);render3d();
});
canvas.addEventListener('pointerup',e=>{drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY>0?.9:1.1),.25,5);render3d();},{passive:false});
el('inspector').addEventListener('change',e=>{
  const key=e.target.dataset.field;if(!key)return;
  const w=getWall();if(!w)return;const value=Number(e.target.value);
  if(!Number.isFinite(value)){safeMessage('Introduce un número válido.',true);renderInspector();return;}
  transact(()=>{
    if(['thickness','height'].includes(key))w[key]=value;
    else w[key[0]][Number(key[1])]=value;
  },'Propiedad modificada. Plan y 3D actualizados.');
});
el('inspector').addEventListener('click',e=>{
  const w=getWall();if(!w)return;
  const del=e.target.closest('[data-delete-opening]');
  if(del)transact(()=>w.openings.splice(Number(del.dataset.deleteOpening),1),'Vano eliminado.');
  if(e.target.id==='delete-wall') {
    transact(()=>{project.walls=project.walls.filter(x=>x.id!==selectedId);selectedId=null;},'Muro eliminado.');
  }
});
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;updateView();}));
el('duplicate-level').addEventListener('click',()=>{
  let next=null;if(transact(()=>{next=duplicateLevel(project,levelId);},'Nivel duplicado con sus muros y vanos.')) {
    levelId=next.id;selectedId=null;renderAll();
  }
});
el('project-name').addEventListener('change',e=>{
  transact(()=>{project.name=e.target.value.trim()||'Proyecto sin nombre';},'Nombre del proyecto actualizado.');
});
el('undo').addEventListener('click',()=>{
  if(!undoStack.length)return;project=undoStack.pop();selectedId=null;
  if(!project.levels.some(l=>l.id===levelId))levelId=project.levels[0].id;
  saveLocal();renderAll();safeMessage('Cambio deshecho.');
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){firstPoint=null;setTool('select');}
  if(e.key.toLowerCase()==='z'&&(e.ctrlKey||e.metaKey)&&
    !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
    e.preventDefault();el('undo').click();}
});
el('save-json').addEventListener('click',()=>download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),nameForFile('nexobim.json')));
el('load-json').addEventListener('click',()=>el('import-file').click());
el('import-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>2*1024*1024)throw Error('Archivo superior al límite de 2 MB.');
    const imported=JSON.parse(await file.text());validateProject(imported);
    project=imported;levelId=project.levels[0].id;selectedId=null;undoStack=[];
    saveLocal();renderAll();safeMessage('Proyecto abierto y validado.');
  }catch(err){safeMessage('No se pudo abrir: '+err.message,true);}
  e.target.value='';
});
el('export-glb').addEventListener('click',()=>{
  try{download(projectToGLB(project),nameForFile('glb'));safeMessage('GLB generado: geometría separada por muro, listo para Blender.');}
  catch(err){safeMessage('Error GLB: '+err.message,true);}
});
el('export-svg').addEventListener('click',()=>{
  const clone=plan.cloneNode(true);clone.querySelector('#svg-grid')?.remove();
  clone.querySelector('#svg-overlay')?.remove();
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(clone);
  download(new Blob([xml],{type:'image/svg+xml'}),nameForFile('svg'));
});
el('print-plan').addEventListener('click',()=>window.print());
const ro=new ResizeObserver(()=>{if(view!=='plan')render3d();});ro.observe(canvas);
try{
  const raw=localStorage.getItem('nexo-bim-project-v1');
  if(raw){const saved=JSON.parse(raw);validateProject(saved);project=saved;levelId=project.levels[0].id;}
}catch{safeMessage('Se abrió un proyecto ejemplo porque el guardado local no es válido.',true);}
renderAll();
