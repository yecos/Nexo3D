// SPDX-License-Identifier: AGPL-3.0-only
// Exportador GLB 2.0 sin dependencias: malla por elemento, material básico PBR.
import {sceneTriangles,validateProject} from './model.js';
const encoder=new TextEncoder();
const pad4=n=>(n+3)&~3;
function chunk(buffer,offset,u8) {new Uint8Array(buffer,offset,u8.length).set(u8);}
function hexToRgb(hex) {return [1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255);}
export function projectToGLB(project) {
  validateProject(project);
  const triangles=sceneTriangles(project);
  if(!triangles.length) throw Error('No hay geometría para exportar.');
  const grouped=new Map();
  for(const t of triangles) {
    if(!grouped.has(t.id))grouped.set(t.id,[]);
    grouped.get(t.id).push(t);
  }
  const bufferViews=[],accessors=[],meshes=[],nodes=[];
  const parts=[];let binarySize=0;
  function addData(bytes,target) {
    const padded=pad4(bytes.byteLength);
    const start=binarySize;binarySize+=padded;
    parts.push({bytes,start});
    const idx=bufferViews.length;
    bufferViews.push({buffer:0,byteOffset:start,byteLength:bytes.byteLength,target});
    return idx;
  }
  const materials=[{name:'Material BIM',doubleSided:true,pbrMetallicRoughness:{
    baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.84}}];
  for(const [id,items] of grouped) {
    const positions=[],normals=[],colors=[];
    for(const tri of items) {
      const color=hexToRgb(tri.color);
      for(const v of tri.vertices) {
        // BIM Z-up -> glTF Y-up (rotación, no espejo).
        positions.push(v[0],v[2],-v[1]);
        normals.push(tri.normal[0],tri.normal[2],-tri.normal[1]);
        colors.push(...color);
      }
    }
    const posView=addData(new Uint8Array(new Float32Array(positions).buffer),34962);
    const normView=addData(new Uint8Array(new Float32Array(normals).buffer),34962);
    const colView=addData(new Uint8Array(new Float32Array(colors).buffer),34962);
    const count=positions.length/3;
    const bounds=[0,1,2].map(k=>positions.filter((_,i)=>i%3===k));
    const posAcc=accessors.push({bufferView:posView,componentType:5126,count,type:'VEC3',
      min:bounds.map(a=>Math.min(...a)),max:bounds.map(a=>Math.max(...a))})-1;
    const normAcc=accessors.push({bufferView:normView,componentType:5126,count,type:'VEC3'})-1;
    const colAcc=accessors.push({bufferView:colView,componentType:5126,count,type:'VEC3'})-1;
    const mesh=meshes.push({name:id,primitives:[{attributes:{
      POSITION:posAcc,NORMAL:normAcc,COLOR_0:colAcc},material:0,mode:4}]})-1;
    const wall=project.walls.find(w=>w.id===id);
    nodes.push({name:wall?'Muro '+id.slice(0,8):'Losa '+id.slice(5),mesh,
      extras:wall?{bimType:'IfcWall',levelId:wall.levelId,thickness:wall.thickness,
      height:wall.height}: {bimType:'SlabPreview'}});
  }
  const gltf={asset:{version:'2.0',generator:'NEXO BIM web MVP'},scene:0,
    scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,
    buffers:[{byteLength:binarySize}],bufferViews,accessors,
    extras:{projectName:project.name,unit:'meter',note:'La geometría GLB no sustituye un IFC.'}};
  const jsonBytes=encoder.encode(JSON.stringify(gltf));
  const jsonSize=pad4(jsonBytes.length);
  const size=12+8+jsonSize+8+binarySize;
  const buffer=new ArrayBuffer(size),dv=new DataView(buffer);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,size,true);
  dv.setUint32(12,jsonSize,true);dv.setUint32(16,0x4e4f534a,true);
  new Uint8Array(buffer,20,jsonSize).fill(0x20);chunk(buffer,20,jsonBytes);
  const cursor=20+jsonSize;
  dv.setUint32(cursor,binarySize,true);dv.setUint32(cursor+4,0x004e4942,true);
  for(const {bytes,start} of parts) chunk(buffer,cursor+8+start,bytes);
  return new Blob([buffer],{type:'model/gltf-binary'});
}
