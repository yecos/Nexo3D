// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {RENDER_STUDIO_DEFAULTS,withRenderStudioDefaults,validateRenderStudio,sunPosition,qualityOptions} from './render-studio.js';
import {makeProject,saveProject,parseProject} from './domain.js';
test('renderer configuration preserves existing pre-R1 v3 projects',()=>{
  const project=makeProject();
  const old={...project,render:{
    background:'#1b2327',sunIntensity:2,ambientIntensity:1.2}};
  const restored=parseProject(JSON.stringify(old));
  assert.equal(restored.render.quality,'balanced');
  assert.equal(restored.render.exposure,1.1);
  assert.equal(restored.render.ambientOcclusion,false);
  assert.equal(restored.cad.shapes.length,0);
});
test('architectural render settings are persisted in canonical NEXO project',()=>{
  const p=makeProject();
  p.render={...p.render,sunElevation:18,sunAzimuth:260,
    exposure:1.45,ambientOcclusion:true,aoIntensity:1.2,
    shadows:true,showGrid:false,quality:'studio',groundColor:'#bdb5a8'};
  const out=parseProject(saveProject(p));
  assert.deepEqual(out.render,p.render);
  assert.equal(out.hew,null);
});
test('sun position is physically consistent with azimuth/elevation convention',()=>{
  const [x,y,z]=sunPosition(0,0,10);
  assert(Math.abs(x)<1e-8);
  assert.equal(y,0);
  assert.equal(z,10);
  const n=sunPosition(90,90,10);
  assert(Math.abs(n[0])<1e-8);
  assert(Math.abs(n[1]-10)<1e-8);
});
test('quality controls cap pixel ratio and do not select proprietary engines',()=>{
  assert.deepEqual(qualityOptions('fast',3),{pixelRatio:1,shadowMap:1024,aoSamples:4});
  assert.deepEqual(qualityOptions('studio',3),{pixelRatio:2,shadowMap:2048,aoSamples:12});
  assert.equal(qualityOptions('balanced',1).pixelRatio,1);
});
test('invalid visualization data is rejected',()=>{
  for(const bad of [{exposure:-1},{sunElevation:95},{sunAzimuth:361},
    {ambientOcclusion:'true'},{quality:'lumen'},{groundColor:'purple'},
    {aoIntensity:Infinity},{showGrid:null}]){
      assert.throws(()=>validateRenderStudio(bad));
  }
  const p=makeProject();
  p.render.exposure=4;
  assert.throws(()=>saveProject(p),/visual/);
});
test('applying defaults never mutates old data',()=>{
  const old={background:'#222222',sunIntensity:3,ambientIntensity:1};
  const next=withRenderStudioDefaults(old);
  assert.equal(old.exposure,undefined);
  assert.equal(next.exposure,RENDER_STUDIO_DEFAULTS.exposure);
});
