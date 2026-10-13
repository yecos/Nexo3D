// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject} from './domain.js';
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
            command.as?.startsWith('wall') ? {object_id:'obj-'+messages.length+'-'+i} : {})};
          listeners.get('message')({
            origin,source:frame.contentWindow,
            data:{type:'nexo:hew.reply',id:data.id,result:{result}}
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
test('session reset drops stale wall identifiers and pending operations',()=>{
  const m=mock();m.ready();
  m.hew.generatedIds=['obj-12'];
  m.ready('session-2');
  assert.deepEqual(m.hew.generatedIds,[]);
  assert.equal(m.hew.bootId,'session-2');
  m.hew.dispose();
});
