#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const root=resolve(process.argv[2]||'artifacts');
const manifest=JSON.parse(await readFile(join(root,'source-manifest.json'),'utf8'));
assert.equal(manifest.sourceProjectId,'example-room-4x3');
assert.equal(manifest.objects.length,4,'room perimeter should have 4 independent walls');
assert(manifest.objects.every(o=>o.status==='generated'&&o.hewObjectId),
  'missing Hew traceability ids');
assert.equal(manifest.objects.filter(o=>o.height===2.6&&o.thickness===.15).length,4);
const total=manifest.objects.reduce((sum,o)=>sum+o.length,0);
assert(Math.abs(total-14)<1e-6,'room perimeter must be 14 m');
const names=['scene.hew','scene.glb','scene.skp','cad-to-hew.json','hew-api.jsonl'];
for(const name of names){
  assert((await stat(join(root,name))).size>60,`Missing or empty file ${name}`);
}
const glb=await readFile(join(root,'scene.glb'));
assert.equal(glb.readUInt32LE(0),0x46546c67);
assert.equal(glb.readUInt32LE(4),2);
assert.equal(glb.readUInt32LE(8),glb.length);
assert(glb.length>1000);
if(manifest.outputs?.png){
  const png=await readFile(join(root,manifest.outputs.png));
  assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  assert.equal(png.readUInt32BE(16),640);
  assert.equal(png.readUInt32BE(20),400);
  assert(png.length>1024);
}
console.log(JSON.stringify({result:'PASS',walls:manifest.objects.length,
  perimeter:total,ids:manifest.objects.map(o=>o.hewObjectId),
  glbBytes:glb.length,render:manifest.outputs?.png||'not tested in this OS'},null,2));
