#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Offline after dependencies have been installed. Build upstream Hew at an exact commit.
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const pin='f36661fb726253e501ef26a4d5fff3cc6381d814';
const dir=resolve('upstream-hew');
const run=(bin,args,cwd=process.cwd())=>{
  console.log('>',bin,...args);
  const result=spawnSync(bin,args,{cwd,stdio:'inherit',shell:false,env:process.env});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error(bin+' exited '+result.status);
};
const get=(bin,args,cwd)=> {
  const r=spawnSync(bin,args,{cwd,encoding:'utf8',shell:false});
  if(r.status!==0)throw Error(bin+' '+args.join(' ')+' failed: '+r.stderr);
  return r.stdout.trim();
};
try{
  if (!existsSync(dir)) {
    run('git',['clone','--filter=blob:none','https://github.com/hew3d/hew.git',dir]);
    run('git',['checkout',pin],dir);
  }
  const current=get('git',['rev-parse','HEAD'],dir);
  if(current!==pin) throw Error('Upstream Hew está en otro commit: '+current+
    '. No se modificarán tus archivos: usa un checkout limpio en '+dir+' de '+pin);
  if(!existsSync(resolve(dir,'app','src','wasm','pkg','wasm_api.js'))){
    try{run('wasm-pack',['--version'],dir);}catch{
      throw Error('Instala wasm-pack 0.15.0 y Rust 1.97.1; consulta docs/HEW_INTERACTIVE.md.');
    }
  }
  run(process.execPath,['scripts/patch-hew-web.mjs',dir],process.cwd());
} catch(error){ console.error('NEXO Hew setup failed:',error.message);process.exitCode=1;}
