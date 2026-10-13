// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeProject, cloneForEdit, makeBox, saveProject, parseProject,
  validateGLB, addGLB, base64ToBytes, MAX_GLB_BYTES, withHewDocument, getHewDocument,
  MAX_HEW_BYTES, MAX_PROJECT_BYTES
} from './domain.js';

function sampleGLB() {
  // Structurally valid GLB header with 12-byte JSON chunk (loader tests are separate).
  const json = '{"asset":{"version":"2.0"}}';
  const encoded = new TextEncoder().encode(json);
  const length = Math.ceil(encoded.byteLength / 4) * 4;
  const buffer = new ArrayBuffer(20 + length);
  const v = new DataView(buffer);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, buffer.byteLength, true);
  v.setUint32(12, length, true);
  v.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20).fill(32);
  new Uint8Array(buffer, 20).set(encoded);
  return buffer;
}
test('project schema survives offline save/read round-trip', () => {
  const p = makeProject();
  p.nodes[0].transform.position = [4.5, 0.5, -3];
  p.nodes[0].material.roughness = 0.42;
  p.render.sunIntensity = 3.1;
  const restored = parseProject(saveProject(p));
  assert.deepEqual(restored.nodes, p.nodes);
  assert.deepEqual(restored.render, p.render);
  assert.equal(restored.units, 'm');
});
test('edits do not mutate prior scene; immutable asset bytes are shared', () => {
  const p = makeProject();
  const n = cloneForEdit(p);
  n.nodes[0].transform.position[0] = 55;
  assert.equal(p.nodes[0].transform.position[0], 0);
  assert.strictEqual(n.assets, p.assets);
});
test('GLB header and size validation', () => {
  assert.equal(validateGLB(sampleGLB()), true);
  assert.throws(() => validateGLB(new ArrayBuffer(0)), /incompleto/);
  assert.throws(() => validateGLB(new ArrayBuffer(MAX_GLB_BYTES + 1)), /30 MB/);
  const bad = sampleGLB(); new DataView(bad).setUint32(4, 1, true);
  assert.throws(() => validateGLB(bad), /2.0/);
});
test('a GLB can be referenced without losing binary representation', () => {
  const p = addGLB(makeProject(), 'Mueble', sampleGLB());
  const n = p.nodes.at(-1);
  assert.equal(n.kind, 'glb');
  assert.equal(n.name, 'Mueble');
  assert.equal(base64ToBytes(p.assets[n.assetId].data).byteLength, sampleGLB().byteLength);
  const restored = parseProject(saveProject(p));
  assert.equal(restored.nodes.length, 2);
});
test('reject malformed external documents', () => {
  assert.throws(() => parseProject('{"format":"wrong"}'), /compatible/);
  const p = makeProject();
  p.nodes.push({ ...makeBox(), id: p.nodes[0].id });
  assert.throws(() => saveProject(p), /repetido/);
});

test('schema v3 packs native editable Hew ZIP, CAD, GLB and render into one document', () => {
  const p = addGLB(makeProject(), 'Render GLB', sampleGLB());
  p.cad.shapes = [];
  p.render.sunIntensity = 4;
  const zip = new ArrayBuffer(160);
  const bytes = new Uint8Array(zip);
  bytes.set([0x50, 0x4b, 0x03, 0x04]);
  bytes[159] = 99;
  const bundled = withHewDocument(p, zip, ['obj_1','obj_7']);
  assert.equal(bundled.schemaVersion, 3);
  assert.equal(bundled.hew.format, 'hew');
  assert.deepEqual(bundled.hew.generatedIds, ['obj_1','obj_7']);
  const serialized = saveProject(bundled);
  const again = parseProject(serialized);
  assert.deepEqual(new Uint8Array(getHewDocument(again)), bytes);
  assert.deepEqual(again.cad,p.cad);
  assert.deepEqual(again.render,p.render);
  assert.deepEqual(again.nodes,p.nodes);
  assert.deepEqual(again.assets,p.assets);
  assert.equal(p.hew,null,'capture never mutates original');
});
test('v1 and v2 NEXO projects migrate to schema v3 without losing content', () => {
  const p=makeProject();
  const v2={...p,schemaVersion:2};
  delete v2.hew;
  const openedV2=parseProject(JSON.stringify(v2));
  assert.equal(openedV2.schemaVersion,3);
  assert.equal(openedV2.hew,null);
  assert.deepEqual(openedV2.nodes,p.nodes);
  const v1={...v2,schemaVersion:1};
  delete v1.cad;
  const openedV1=parseProject(JSON.stringify(v1));
  assert.equal(openedV1.schemaVersion,3);
  assert.equal(openedV1.cad.shapes.length,0);
  assert.equal(openedV1.hew,null);
});
test('native Hew data fails closed for damaged, oversized or noncanonical data', () => {
  const p=makeProject();
  assert.throws(()=>withHewDocument(p,new ArrayBuffer(2)),/vacío/);
  assert.throws(()=>withHewDocument(p,new ArrayBuffer(MAX_HEW_BYTES+1)),/30 MB/);
  assert.throws(()=>withHewDocument(p,new ArrayBuffer(100)),/ZIP/);
  const zip = new Uint8Array(40);
  zip.set([0x50,0x4b,0x03,0x04]);
  const valid=withHewDocument(p,zip.buffer,['obj_4']);
  const malformed=structuredClone(valid);
  malformed.hew.data='%%%';
  assert.throws(()=>saveProject(malformed),/Hew/);
  const invalidId=structuredClone(valid);
  invalidId.hew.generatedIds=['../../evil'];
  assert.throws(()=>saveProject(invalidId),/Hew/);
  assert(MAX_PROJECT_BYTES>=MAX_HEW_BYTES);
});
