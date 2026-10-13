#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Applies a minimal, auditable NEXO overlay to a pinned, cloned Hew checkout.
// Upstream code is never checked into the NEXO repository.
import {readFile,writeFile,existsSync,mkdir,cp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const origin=process.argv[2] ? resolve(process.argv[2]):resolve('upstream-hew');
const app=join(origin,'app'),tsx=join(app,'src','App.tsx'),vite=join(app,'vite.config.ts');
const target=resolve('public/hew');
const must=(value,what)=>{if(!value) throw Error('Hew incompatible con parche NEXO: '+what)};
const run=(file,args,cwd)=>{
  const r=spawnSync(file,args,{cwd,stdio:'inherit',shell:false,env:process.env});
  if(r.error)throw r.error;
  if(r.status!==0)throw Error(file+' failed with '+r.status);
};
const INJECTION=`
  // NEXO integration (upstream Hew unchanged in Git history): same-origin,
  // opt-in bridge for this embedded modeler only; not an open RPC endpoint.
  useEffect(() => {
    if (window.parent === window || !window.location.pathname.startsWith('/hew/')) return
    if (sceneRef.current === null) return
    let currentScene = sceneRef.current
    let connectionId = currentScene.api_connection_open()
    const hello = () => {
      currentScene.api_dispatch(connectionId, JSON.stringify({
        jsonrpc:'2.0', id:0, method:'hew.meta.hello',
        params:{protocol:1, client:{name:'nexo3d-embedded', version:'0.1.0'}}
      }))
    }
    hello()
    const send = (message: unknown) => window.parent.postMessage(message, window.location.origin)
    const ready = () => send({type:'nexo:hew.ready',version:1})
    const ensureCurrent = () => {
      const next = sceneRef.current
      if (next === null) throw Error('El documento Hew no está listo')
      if (next !== currentScene) {
        currentScene.api_connection_close(connectionId)
        currentScene = next
        connectionId = next.api_connection_open()
        hello()
      }
    }
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return
      const request = event.data
      if (request?.type === 'nexo:hew.ping') {ready();return}
      if (!request || !Number.isSafeInteger(request.id) || request.id <= 0) return
      if (request.type === 'nexo:hew.command') {
        if (!['hew.doc.transact','hew.query.scene','hew.history.status'].includes(request.method)) return
        try {
          ensureCurrent()
          const reply = currentScene.api_dispatch(connectionId,JSON.stringify({
            jsonrpc:'2.0',id:request.id,method:request.method,params:request.params || {}
          }))
          const result = reply === undefined ? undefined : JSON.parse(reply)
          if (result && !result.error && currentScene.api_method_mutates(request.method)) {
            viewportApi.current?.refreshScene()
            reconcileRef.current()
          }
          send({type:'nexo:hew.reply',id:request.id,result})
        } catch (error) {
          send({type:'nexo:hew.reply',id:request.id,error:String(error)})
        }
      } else if (request.type === 'nexo:hew.export') {
        void (async () => {
          try {
            ensureCurrent()
            const bytes = await viewportApi.current?.exportGlb()
            if (!bytes?.byteLength) throw Error('No hay sólidos para exportar')
            if (bytes.byteLength > 30 * 1024 * 1024) throw Error('GLB mayor de 30 MB')
            // Transfer the raw GLB binary to NEXO Render; never upload to a server.
            const data = bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset + bytes.byteLength)
            window.parent.postMessage({type:'nexo:hew.glb',id:request.id,data},
              window.location.origin,[data])
          } catch(error) {
            send({type:'nexo:hew.reply',id:request.id,error:String(error)})
          }
        })()
      }
    }
    window.addEventListener('message',onMessage)
    ready()
    return () => {
      window.removeEventListener('message',onMessage)
      currentScene.api_connection_close(connectionId)
    }
  }, [state?.kernelVersion])

`;
try {
  let file=await readFile(tsx,'utf8');
  if (!file.includes('NEXO integration (upstream Hew unchanged')) {
    const marker='  const handleToast = useCallback((message: string, code?: string) => {';
    must(file.includes(marker),'App.tsx no contiene el ancla del puente');
    file=file.replace(marker,INJECTION+marker);
    await writeFile(tsx,file);
  }
  let settings=await readFile(vite,'utf8');
  if(!settings.includes("base: '/hew/'")){
    const anchor='export default defineConfig(({ command }) => ({';
    must(settings.includes(anchor),'Vite base change');
    settings=settings.replace(anchor,anchor+"\n  base: '/hew/',");
    await writeFile(vite,settings);
  }
  const mode=process.argv.includes('--patch-only');
  if(mode){
    console.log('NEXO: patched Hew source (no build requested)');
  } else {
    must(existsSync(join(origin,'pnpm-lock.yaml')),'pnpm-lock.yaml not present');
    run('corepack',['pnpm','install','--frozen-lockfile'],origin);
    run('corepack',['pnpm','--dir','app','build'],origin);
    await mkdir(target,{recursive:true});
    await cp(join(app,'dist'),target,{recursive:true,force:true});
    const stat=await readFile(join(target,'index.html'),'utf8');
    must(stat.includes('/hew/'),'Build sin base /hew/');
    console.log('NEXO: built upstream Hew with embedded WebAssembly into '+target);
  }
} catch(error){console.error(error);process.exitCode=1}
