// SPDX-License-Identifier: AGPL-3.0-only
// Modelo editable en metros, independiente de la UI y del formato de render.
export const SCHEMA = 1;
export const uid = () => globalThis.crypto?.randomUUID?.() ?? 'id-' + Math.random().toString(36).slice(2);
export const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
export const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
export const roundGrid = (p, grid=0.25) => p.map(v => Math.round(v/grid)*grid);
export const lengthOf = wall => dist(wall.a,wall.b);
export function newWall(a,b,levelId) {
  if (dist(a,b) < .25) throw Error('El muro debe medir al menos 0,25 m.');
  return { id:uid(), levelId, a:[...a], b:[...b], thickness:.15, height:2.8, openings:[] };
}
export function exampleProject() {
  const levels=[{id:'l1',name:'Nivel 1',elevation:0,height:2.8}];
  const coords=[[[0,0],[8,0]],[[8,0],[8,6]],[[8,6],[0,6]],[[0,6],[0,0]],[[4,0],[4,6]],[[0,3],[4,3]]];
  const walls=coords.map(([a,b])=>newWall(a,b,'l1'));
  walls[0].openings.push({id:uid(),kind:'door',offset:1.5,width:1,height:2.1,sill:0});
  walls[1].openings.push({id:uid(),kind:'window',offset:3,width:1.5,height:1.2,sill:.9});
  walls[2].openings.push({id:uid(),kind:'window',offset:2,width:1.5,height:1.2,sill:.9});
  return {schemaVersion:SCHEMA,name:'Vivienda piloto',levels,walls};
}
export function nearestWall(project,levelId,point,maxDistance=.25) {
  let selected=null;
  for(const wall of project.walls.filter(w=>w.levelId===levelId)) {
    const vx=wall.b[0]-wall.a[0],vy=wall.b[1]-wall.a[1],len2=vx*vx+vy*vy;
    const t=clamp(((point[0]-wall.a[0])*vx+(point[1]-wall.a[1])*vy)/len2,0,1);
    const p=[wall.a[0]+t*vx,wall.a[1]+t*vy], d=dist(point,p);
    if(d<=maxDistance && (!selected || d<selected.distance))
      selected={wall,offset:t*Math.sqrt(len2),distance:d,point:p};
  }
  return selected;
}
export function addOpening(wall,kind,offset) {
  const width=kind==='door'?.9:1.2, height=kind==='door'?2.1:1.2, sill=kind==='door'?0:.9;
  const length=lengthOf(wall);
  offset=clamp(offset,width/2+.05,length-width/2-.05);
  const candidate={id:uid(),kind,offset,width,height,sill};
  if (length<width+.1) throw Error('Muro demasiado corto.');
  if (wall.openings.some(o=>Math.abs(o.offset-offset)<(o.width+width)/2+.05))
    throw Error('El vano interfiere con otro existente.');
  wall.openings.push(candidate);
  return candidate;
}
export function validateProject(project) {
  if(!project || project.schemaVersion!==SCHEMA || typeof project.name!=='string' ||
    project.name.length>120 || !Array.isArray(project.levels) ||
    project.levels.length<1 || project.levels.length>30 ||
    !Array.isArray(project.walls) || project.walls.length>1500)
    throw Error('Archivo NEXO BIM inválido o versión no compatible.');
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const ids=new Set();
  const levelIds=new Set();
  for(const l of project.levels) {
    if(!l || typeof l.id!=='string'||!l.id||ids.has(l.id) ||
      typeof l.name!=='string'||l.name.length>80 ||
      !finite(l.elevation)||Math.abs(l.elevation)>3000 ||
      !finite(l.height)||l.height<1.8||l.height>20) throw Error('Nivel inválido.');
    ids.add(l.id);levelIds.add(l.id);
  }
  for(const w of project.walls) {
    if(!w || typeof w.id!=='string'||!w.id||ids.has(w.id) ||
      !levelIds.has(w.levelId)||![w.a,w.b].every(a=>Array.isArray(a)&&a.length===2&&a.every(n=>finite(n)&&Math.abs(n)<=10000)) ||
      lengthOf(w)<.25||lengthOf(w)>1000 ||
      !finite(w.thickness)||w.thickness<.05||w.thickness>1 ||
      !finite(w.height)||w.height<.2||w.height>20 ||
      !Array.isArray(w.openings)||w.openings.length>40) throw Error('Muro inválido.');
    ids.add(w.id);
    for(const o of w.openings) {
      if(!o||typeof o.id!=='string'||!o.id||ids.has(o.id)||
        !['door','window'].includes(o.kind)||
        ![o.offset,o.width,o.height,o.sill].every(finite)||
        o.width<.3||o.height<.3||o.sill<0||
        o.sill+o.height>w.height+.00001||
        o.offset-o.width/2<.049||o.offset+o.width/2>lengthOf(w)-.049)
        throw Error('Vano inválido.');
      ids.add(o.id);
    }
    const ordered=[...w.openings].sort((a,b)=>a.offset-b.offset);
    for(let i=1;i<ordered.length;i++)
      if(ordered[i-1].offset+ordered[i-1].width/2+.05 >
        ordered[i].offset-ordered[i].width/2) throw Error('Vanos superpuestos.');
  }
  return project;
}
export function wallVolume(wall) {
  const gross=lengthOf(wall)*wall.thickness*wall.height;
  return gross-wall.openings.reduce((s,o)=>s+o.width*o.height*wall.thickness,0);
}
export function projectStats(project) {
  return { walls:project.walls.length,
    openings:project.walls.reduce((s,w)=>s+w.openings.length,0),
    length:project.walls.reduce((s,w)=>s+lengthOf(w),0),
    volume:project.walls.reduce((s,w)=>s+wallVolume(w),0) };
}
export function duplicateLevel(project,sourceId) {
  const source=project.levels.find(l=>l.id===sourceId);
  if(!source)throw Error('Nivel no encontrado.');
  if(project.levels.length>=30)throw Error('Máximo 30 niveles.');
  const top=Math.max(...project.levels.map(l=>l.elevation+l.height));
  const next={id:uid(),name:'Nivel '+(project.levels.length+1),elevation:top,height:source.height};
  project.levels.push(next);
  for(const w of project.walls.filter(w=>w.levelId===sourceId)) {
    project.walls.push({...structuredClone(w),id:uid(),levelId:next.id,
      openings:w.openings.map(o=>({...o,id:uid()}))});
  }
  validateProject(project);
  return next;
}
export function wallPrisms(wall, elevation=0) {
  const length=lengthOf(wall),ux=(wall.b[0]-wall.a[0])/length,uy=(wall.b[1]-wall.a[1])/length;
  const nx=-uy,ny=ux;
  const at=(u,v,z)=>[wall.a[0]+ux*u+nx*v,wall.a[1]+uy*u+ny*v,elevation+z];
  const marks=[0,length];
  for(const o of wall.openings) marks.push(o.offset-o.width/2,o.offset+o.width/2);
  marks.sort((a,b)=>a-b);
  const prisms=[];
  for(let i=1;i<marks.length;i++) {
    const a=marks[i-1],b=marks[i]; if(b-a<1e-6) continue;
    const opening=wall.openings.find(o=>o.offset-o.width/2 <= (a+b)/2 &&
      o.offset+o.width/2 >= (a+b)/2);
    const spans=opening?[[0,opening.sill],[opening.sill+opening.height,wall.height]]:[[0,wall.height]];
    for(const [bottom,top] of spans) {
      if(top-bottom<1e-6)continue;
      const t=wall.thickness/2;
      prisms.push([at(a,-t,bottom),at(b,-t,bottom),at(b,t,bottom),at(a,t,bottom),
                   at(a,-t,top),at(b,-t,top),at(b,t,top),at(a,t,top)]);
    }
  }
  return prisms;
}
const FACE_INDICES=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
function faces(prism,id,color) {
  const triangles=[];
  for(const ix of FACE_INDICES) {
    for(const sub of [[0,1,2],[0,2,3]]) {
      const vertices=sub.map(k=>prism[ix[k]]);
      const a=vertices[0],b=vertices[1],c=vertices[2];
      const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
      let normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      const n=Math.hypot(...normal)||1;normal=normal.map(x=>x/n);
      triangles.push({vertices,normal,id,color});
    }
  }
  return triangles;
}
export function sceneTriangles(project, selectedId=null) {
  const result=[];
  for(const level of project.levels) {
    for(const wall of project.walls.filter(w=>w.levelId===level.id))
      for(const prism of wallPrisms(wall,level.elevation))
        result.push(...faces(prism,wall.id,wall.id===selectedId?'#c99a50':'#d9d3c9'));
    // Losas DEMO: envolvente rectangular provisional, no elementos IFC.
    const local=project.walls.filter(w=>w.levelId===level.id);
    if(local.length) {
      const pts=local.flatMap(w=>[w.a,w.b]);
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
      const xmin=Math.min(...xs)-.14,xmax=Math.max(...xs)+.14,ymin=Math.min(...ys)-.14,ymax=Math.max(...ys)+.14;
      const z=level.elevation;
      const b=[[xmin,ymin,z-.16],[xmax,ymin,z-.16],[xmax,ymax,z-.16],[xmin,ymax,z-.16],
        [xmin,ymin,z],[xmax,ymin,z],[xmax,ymax,z],[xmin,ymax,z]];
      result.push(...faces(b,'slab-'+level.id,'#b8b5b0'));
    }
  }
  return result;
}
