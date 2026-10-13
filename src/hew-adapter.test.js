// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject, parseProject, saveProject} from './domain.js';
import {createCadShape, liftShape, rectanglePoints} from './cad-domain.js';
import {buildHewCommands} from './hew-adapter.js';

function room() {
  const p=makeProject();
  p.id='nexo-test-room';
  p.name='Habitación de ejemplo';
  p.nodes=[]; // Pure architectural fixture; viewer objects are optional in the source.
  p.cad.shapes.push(liftShape(createCadShape('line',[[0,0],[4,0]],
    p.cad.activeLayerId,'wall-a','Muro principal'),2.6,0.15));
  return p;
}
const convert = p => buildHewCommands(p);

test('CAD is passed to Hew as a real sketch and extrusion, not a prebuilt box mesh',()=>{
  const {script,manifest}=convert(room());
  assert.deepEqual(script.map(x=>x.method),
    ['hew.meta.hello','hew.doc.new','hew.doc.transact','hew.query.scene']);
  const commands=script[2].params.commands;
  assert.deepEqual(commands.map(x=>x.method),
    ['hew.sketch.draw_rect','hew.solid.extrude','hew.entity.rename']);
  assert.deepEqual(commands[0].params.corner_a,[0,-.075,0]);
  assert.deepEqual(commands[0].params.corner_b,[4,.075,0]);
  assert.equal(commands[1].params.distance,2.6);
  assert.deepEqual(commands[1].params.region,{$ref:'sketch0#/region_id'});
  assert.equal(manifest.objects[0].cadShapeId,'wall-a');
  assert.equal(manifest.objects[0].length,4);
});
test('NEXO CAD Y-positive maps to Hew Y-negative and diagonals rotate about vertical Z',()=>{
  const p=room();
  p.cad.shapes[0].points=[[2,3],[5,7]];
  const {script,manifest}=convert(p), ops=script[2].params.commands;
  assert.deepEqual(ops.map(o=>o.method),[
    'hew.sketch.draw_rect','hew.solid.extrude',
    'hew.entity.rotate','hew.entity.move','hew.entity.rename'
  ]);
  assert.equal(ops[0].params.corner_b[0],5);
  assert.equal(ops[2].params.angle,Number(Math.atan2(-4,3).toFixed(10)));
  assert.deepEqual(ops[2].params.axis,[0,0,1]);
  assert.deepEqual(ops[3].params.translation,[2,-3,0]);
  assert.equal(manifest.objects[0].length,5);
});
test('rectangle lifts to four segments; local CAD document is unmodified',()=>{
  const p=room();
  p.cad.shapes=[liftShape(createCadShape('rectangle',
    rectanglePoints([0,0],[4,3]),p.cad.activeLayerId,'room','Perímetro'),2.6,0.15)];
  const before=saveProject(p);
  const {manifest,script}=convert(p);
  assert.equal(manifest.objects.length,4);
  assert.equal(script[2].params.commands.filter(x=>x.method==='hew.solid.extrude').length,4);
  assert.equal(saveProject(p),before);
});
test('hidden layers remain hidden, drafts are not silently converted',()=>{
  const p=room();
  const hidden=createCadShape('line',[[10,0],[12,0]],p.cad.layers[1].id,'hidden');
  p.cad.layers[1].visible=false;
  p.cad.shapes.push(liftShape(hidden,3,0.2));
  p.cad.shapes.push(createCadShape('line',[[12,0],[14,0]],p.cad.layers[0].id,'draft'));
  const {manifest}=convert(p);
  assert.equal(manifest.objects.length,1);
  assert.match(manifest.warnings.join(' '),/no tiene levantamiento/);
  const forced=buildHewCommands(p,{includeHidden:true});
  assert.equal(forced.manifest.objects.length,2);
});
test('no lift or invalid/unsupported projects fail closed',()=>{
  const p=room();
  p.cad.shapes[0].extrusion=null;
  assert.throws(()=>convert(p),/no contiene trazos CAD/);
  p.cad.shapes[0].extrusion={height:0,thickness:.15};
  assert.throws(()=>convert(p),/extrusión CAD/);
  assert.throws(()=>parseProject('{"schemaVersion":2,"format":"bad"}'),/compatible/);
});
test('adapter is deterministic after save/reopen',()=>{
  const p=room();
  const first=convert(p);
  const next=convert(parseProject(saveProject(p)));
  assert.deepEqual(next,first);
});
