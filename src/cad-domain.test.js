// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, parseProject, saveProject, cloneForEdit } from './domain.js';
import {
  defaultCad, validateCad, rectanglePoints, createCadShape, liftShape,
  wallSegments, segmentPairs, snapToGrid, endpointSnap
} from './cad-domain.js';

test('CAD: líneas y medidas precisas conservan metros', () => {
  const cad = defaultCad();
  const shape = createCadShape('line', [[0,0],[4,0]], cad.activeLayerId, 'line-01');
  cad.shapes.push(shape);
  assert.equal(segmentPairs(shape).length,1);
  assert.equal(Math.hypot(4,0),4);
  assert.equal(validateCad(cad),cad);
});
test('CAD: rectángulo genera cuatro segmentos', () => {
  const shape = createCadShape('rectangle',rectanglePoints([0,0],[4,3]),
    'layer-architecture','rect-01');
  const pairs = segmentPairs(shape);
  assert.equal(pairs.length,4);
  assert.equal(pairs.reduce((sum,[a,b])=>sum+Math.hypot(b[0]-a[0],b[1]-a[1]),0),14);
});
test('CAD→3D: muro recto mantiene escala, altura y orientación', () => {
  const original = createCadShape('line',[[0,0],[4,0]],
    'layer-architecture','line-01');
  const shape=liftShape(original,2.6,0.15);
  assert.equal(original.extrusion,null);
  assert.deepEqual(wallSegments(shape), [{
    center:[2,1.3,0],size:[4,2.6,0.15],rotationY:0
  }]);
  shape.points[1][0]=5;
  assert.deepEqual(wallSegments(shape)[0].size,[5,2.6,0.15]);
});
test('CAD→3D: coordenada Y del plano se proyecta como -Z', () => {
  const shape=liftShape(createCadShape('line',[[0,0],[0,3]],
    'layer-architecture','line-02'),3,0.2);
  const wall=wallSegments(shape)[0];
  assert.deepEqual(wall.center,[0,1.5,-1.5]);
  assert.equal(wall.rotationY,Math.PI/2);
});
test('CAD: snap de rejilla y a extremos conserva valores elegidos', () => {
  assert.deepEqual(snapToGrid([1.12,2.38]),[1,2.5]);
  const cad=defaultCad();
  cad.shapes.push(createCadShape('line',[[1.13,2.38],[4,2]],
    cad.activeLayerId,'a'));
  assert.deepEqual(endpointSnap([1.14,2.37],cad,0.15),[1.13,2.38]);
});
test('CAD: guardado local y clonación son independientes', () => {
  const project=makeProject();
  const shape=liftShape(createCadShape('line',[[1,2],[4,2]],
    project.cad.activeLayerId,'w1'),2.6,0.15);
  project.cad.shapes.push(shape);
  const edit=cloneForEdit(project);
  edit.cad.shapes[0].points[0][0]=9;
  assert.equal(project.cad.shapes[0].points[0][0],1);
  assert.deepEqual(parseProject(saveProject(project)).cad,project.cad);
});
test('CAD: proyectos v1 migran a esquema v2 con CAD vacío', () => {
  const project=makeProject();
  delete project.cad;
  project.schemaVersion=1;
  const migrated=parseProject(JSON.stringify(project));
  assert.equal(migrated.schemaVersion,2);
  assert.deepEqual(migrated.cad.shapes,[]);
});
test('CAD: no acepta entidades malformadas ni parámetros peligrosos', () => {
  const cad=defaultCad();
  assert.throws(()=>createCadShape('line',[[0,0],[0,0]],
    cad.activeLayerId,'z'),/inválido/);
  assert.throws(()=>liftShape(createCadShape('line',[[0,0],[1,0]],
    cad.activeLayerId,'w'),0,0.15),/fuera de rango/);
  assert.throws(()=>createCadShape('line',[[0,0],[Infinity,4]],
    cad.activeLayerId,'x'),/inválido/);
  cad.shapes.push(createCadShape('line',[[0,0],[1,0]],
    cad.activeLayerId,'w'));
  cad.shapes.push({...cad.shapes[0]});
  assert.throws(()=>validateCad(cad),/repetido|inválido/);
});
