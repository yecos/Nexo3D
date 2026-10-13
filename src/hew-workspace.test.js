// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject, withHewDocument, parseProject, saveProject, getHewDocument} from './domain.js';
import {createCadShape,liftShape} from './cad-domain.js';
import {HewWorkspace} from './hew-workspace.js';

function mock(){
  const messages=[];
  const listeners=new Map();
  globalThis.window={
    location:{origin:'http://127.0.0.1:5173'},
    addEventListener(type,fn){listeners.set(type,fn)},
    removeEventListener(type){listeners.delete(type)}
  };
  const project=makeProject();
  project.nodes=[];
  project.cad.shapes=[liftShape(createCadShape('line',
    [[0,0],[4,0]],project.cad.activeLayerId,'wall-1','Muro 1'),2.6,.15)];
  const frame={
    listeners:new Map(),src:'',
    addEventListener(name,fn){this.listeners.set(name,fn)},
    contentWindow:{
      postMessage(data,origin){
        assert.equal(origin,'http://127.0.0.1:5173');
        messages.push(data);
        if(data.type==='nexo:hew.command'){
          const result={results:data.params.commands.map((command,i)=>
            command.as?.startsWith('wall') ? {object_id:'obj_'+messages.length+'_'+i} : {})};
          listeners.get('message')({
            origin,source:frame.contentWindow,
            data:{type:'nexo:hew.reply',id:data.id,result:{result}}
          });
        } else if(data.type==='nexo:hew.save'){
          const content = new ArrayBuffer(56);
          new Uint8Array(content).set([0x50,0x4b,0x03,0x04]);
          listeners.get('message')({
            origin,source:frame.contentWindow,
            data:{type:'nexo:hew.native',id:data.id,data:content}
          });
        } else if(data.type==='nexo:hew.load'){
          if(data.data !== null){
            assert(data.data instanceof ArrayBuffer);
          }
          listeners.get('message')({
            origin,source:frame.contentWindow,
            data:{type:'nexo:hew.reply',id:data.id,
              result:{result:{loaded:true}}}
          });
        } else if(data.type==='nexo:hew.export'){
          listeners.get('message')({
            origin,source:frame.contentWindow,
            data:{type:'nexo:hew.glb',id:data.id,data:new ArrayBuffer(16)}
          });
        }
      }
    }
  };
  const updates=[];
  const hew=new HewWorkspace(frame,()=>project,bytes=>updates.push(bytes),
    (msg,err)=>updates.push([msg,err]));
  return {frame,hew,project,messages,listeners,updates,ready:(session='session-1')=>
    listeners.get('message')({origin:'http://127.0.0.1:5173',
      source:frame.contentWindow,data:{type:'nexo:hew.ready',version:1,session}})};
}
test('bridge only accepts messages from pinned same-origin iframe',()=>{
  const m=mock();
  m.listeners.get('message')({
    origin:'https://example.org',source:m.frame.contentWindow,
    data:{type:'nexo:hew.ready',version:1,session:'bad'}
  });
  assert.equal(m.hew.ready,false);
  m.ready();
  assert.equal(m.hew.ready,true);
  m.hew.dispose();
});
test('CAD wall is sent to live Hew via transaction; regenerated wall replaces its ID',async()=>{
  const m=mock();m.ready();
  const first=await m.hew.syncCad();
  assert.equal(first.objects.length,1);
  assert.equal(m.hew.generatedIds.length,1);
  const second=await m.hew.syncCad();
  assert.equal(second.objects.length,1);
  const txs=m.messages.filter(x=>x.type==='nexo:hew.command');
  assert.equal(txs.length,2);
  assert.equal(txs[0].method,'hew.doc.transact');
  assert.equal(txs[0].params.commands[0].method,'hew.sketch.draw_rect');
  assert.equal(txs[1].params.commands[0].method,'hew.entity.delete');
  m.hew.dispose();
});
test('Hew GLB export is handed back to NEXO Render without network',async()=>{
  const m=mock();m.ready();
  const data=await m.hew.updateRender();
  assert.equal(data.byteLength,16);
  assert(m.updates.some(v=>v instanceof ArrayBuffer));
  m.hew.dispose();
});
test('switching to Render waits for staged Hew native restore before exporting',async()=>{
  const m=mock();
  const zip=new Uint8Array(40);zip.set([0x50,0x4b,0x03,0x04]);
  const project=withHewDocument(m.project,zip.buffer,['obj_1']);
  assert.equal(await m.hew.loadProject(project),false);
  m.ready();
  const glb=await m.hew.updateRender();
  assert.equal(glb.byteLength,16);
  assert.deepEqual(
    m.messages.filter(x=>['nexo:hew.load','nexo:hew.export'].includes(x.type)).map(x=>x.type),
    ['nexo:hew.load','nexo:hew.export']
  );
  assert.deepEqual(m.hew.generatedIds,['obj_1']);
  m.hew.dispose();
});
test('session reset drops stale wall identifiers and pending operations',()=>{
  const m=mock();m.ready();
  m.hew.generatedIds=['obj-12'];
  m.ready('session-2');
  assert.deepEqual(m.hew.generatedIds,[]);
  assert.equal(m.hew.bootId,'session-2');
  m.hew.dispose();
});

test('single project saves real-style Hew binary with CAD-linked object IDs',async()=>{
  const m=mock();m.ready();
  await m.hew.syncCad();
  const bundle=await m.hew.captureProject(m.project);
  assert(bundle.hew);
  assert.equal(bundle.hew.generatedIds.length,1);
  const restored=parseProject(saveProject(bundle));
  assert.equal(new Uint8Array(getHewDocument(restored))[0],0x50);
  assert.deepEqual(restored.cad,m.project.cad);
  assert.deepEqual(restored.hew.generatedIds,m.hew.generatedIds);
  m.hew.dispose();
});
test('load editable Hew from bundled project and restore CAD-wall associations',async()=>{
  const m=mock();m.ready();
  const fixture=new Uint8Array(40);fixture.set([0x50,0x4b,0x03,0x04]);
  const project=withHewDocument(m.project,fixture.buffer,['obj_2','obj_5']);
  assert.equal(await m.hew.loadProject(project),true);
  const load=m.messages.find(x=>x.type==='nexo:hew.load');
  assert(load.data instanceof ArrayBuffer);
  assert.equal(load.data.byteLength,40);
  assert.deepEqual(m.hew.generatedIds,['obj_2','obj_5']);
  m.hew.dispose();
});
test('opening an old CAD project resets Hew to blank instead of leaking prior scene',async()=>{
  const m=mock();m.ready();
  m.hew.generatedIds=['obj_10'];
  await m.hew.loadProject(m.project);
  assert.equal(m.messages.find(x=>x.type==='nexo:hew.load').data,null);
  assert.deepEqual(m.hew.generatedIds,[]);
  m.hew.dispose();
});
test('load before Hew is ready is staged; opening iframe auto-restores native model',async()=>{
  const m=mock();
  const zip=new Uint8Array(40);zip.set([0x50,0x4b,0x03,0x04]);
  const project=withHewDocument(m.project,zip.buffer,['obj_1']);
  const ok=await m.hew.loadProject(project);
  assert.equal(ok,false);
  assert.equal(m.messages.length,0);
  m.ready('session-abc');
  await new Promise(resolve=>setImmediate(resolve));
  assert(m.messages.some(msg=>msg.type==='nexo:hew.load'));
  assert.deepEqual(m.hew.generatedIds,['obj_1']);
  m.hew.dispose();
});
test('no editor available preserves native bundle without data loss on save',async()=>{
  const m=mock();
  const zip=new Uint8Array(36);zip.set([0x50,0x4b,0x03,0x04]);
  const project=withHewDocument(m.project,zip.buffer,['obj_42']);
  const captured=await m.hew.captureProject(project);
  assert.strictEqual(captured,project);
  assert.deepEqual(captured.hew.generatedIds,['obj_42']);
  m.hew.dispose();
});
