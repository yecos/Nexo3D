// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleProject,validateProject,wallPrisms,newWall,addOpening,wallVolume,duplicateLevel,sceneTriangles,projectStats} from './model.js';
import {projectToGLB} from './glb.js';
test('proyecto inicial con muros y vanos válidos',()=>{
  const p=exampleProject();assert.equal(validateProject(p),p);
  assert.equal(projectStats(p).walls,6);
  assert.ok(projectStats(p).volume>0);
});
test('vano de puerta retira volumen correctamente',()=>{
  const w=newWall([0,0],[5,0],'l1');w.thickness=.2;w.height=3;
  addOpening(w,'door',2.5);
  assert.ok(Math.abs(wallVolume(w)-(5*3-.9*2.1)*.2)<1e-7);
  assert.equal(wallPrisms(w).length,3);
});
test('no se admiten vanos solapados ni documentos inseguros',()=>{
  const w=newWall([0,0],[6,0],'l1');
  addOpening(w,'door',2);
  assert.throws(()=>addOpening(w,'window',2),/interfiere/);
  const p=exampleProject();p.walls[0].height=Infinity;
  assert.throws(()=>validateProject(p),/Muro inválido/);
});
test('duplicar planta conserva geometría con ids independientes',()=>{
  const p=exampleProject(),src=p.walls.length;
  const l=duplicateLevel(p,'l1');
  assert.equal(p.walls.length,src*2);
  assert.equal(l.elevation,2.8);
  assert.equal(new Set(p.walls.map(w=>w.id)).size,p.walls.length);
  validateProject(p);
});
test('geometría conserva elevación y no tapa el vano',()=>{
  const w=newWall([0,0],[4,0],'l1');w.height=2.8;
  addOpening(w,'door',2);
  const prisms=wallPrisms(w,3);
  assert.ok(prisms.every(pr=>pr.every(v=>v[2]>=3)));
  assert.equal(prisms.length,3);
  assert.ok(sceneTriangles(exampleProject()).length>0);
});
test('GLB 2.0 con jerarquía por elementos y chunk JSON parseable',async()=>{
  const blob=projectToGLB(exampleProject());
  const buf=await blob.arrayBuffer(),view=new DataView(buf);
  assert.equal(view.getUint32(0,true),0x46546c67);
  assert.equal(view.getUint32(4,true),2);
  assert.equal(view.getUint32(8,true),buf.byteLength);
  const n=view.getUint32(12,true);
  const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,n)));
  assert.equal(gltf.asset.version,'2.0');
  assert.equal(gltf.nodes.length,7); // 6 muros + losa de vista previa
  assert.equal(gltf.meshes.length,gltf.nodes.length);
  assert.ok(gltf.accessors.every(a=>a.count>0));
});
