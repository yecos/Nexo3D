// SPDX-License-Identifier: AGPL-3.0-only
import {buildHewCommands} from './hew-adapter.js';
import {getHewDocument, withHewDocument} from './domain.js';

export class HewWorkspace {
  constructor(frame, getProject, onPreview, onStatus) {
    this.frame=frame;
    this.getProject=getProject;
    this.onPreview=onPreview;
    this.onStatus=onStatus;
    this.ready=false;
    this.bootId=null;
    this.generatedIds=[];
    this.nextId=0;
    this.pending=new Map();
    this.pendingProject=null;
    this.loading=null;
    this.startupTimer=null;
    this.origin=window.location.origin;
    this.baseUrl=new URL('./',window.location.href);
    this.onMessage=this.onMessage.bind(this);
    window.addEventListener('message',this.onMessage);
    frame.addEventListener('load',()=>this.ping());
  }
  resourceUrl(path){
    return new URL(path,this.baseUrl).toString();
  }
  async init(){
    if (this.started) return this.started;
    this.started=(async()=>{
      const response=await fetch(this.resourceUrl('hew/nexo-manifest.json'),{
        cache:'no-store',headers:{Accept:'application/json'}
      });
      if(!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('application/json'))
        throw Error('Faltan los archivos locales de Hew. Ejecuta npm run hew:setup y reinicia la página.');
      let manifest;
      try { manifest=await response.json(); }
      catch { throw Error('El manifiesto local de Hew está dañado. Ejecuta npm run hew:setup.'); }
      if(manifest.integration!=='nexo-hew' || manifest.protocol!==1)
        throw Error('Esta compilación de Hew no contiene el enlace NEXO.');
      // WebView2 may defer hidden/lazy iframes indefinitely. Start the local
      // document before showing the loading overlay so the WASM runtime gets a
      // real navigation on both Vite and Tauri's tauri.localhost protocol.
      this.frame.hidden=false;
      this.frame.src=this.resourceUrl('hew/index.html');
      this.onStatus('Iniciando el modelador Hew (WebAssembly local)…');
      clearTimeout(this.startupTimer);
      this.startupTimer=setTimeout(()=>{
        if(!this.ready)
          this.onStatus('Hew no respondió en 30 segundos. Revisa su instalación, reinicia la página y vuelve a intentarlo.',true);
      },30000);
      this.startupTimer.unref?.();
      return manifest;
    })().catch(error=>{
      this.started=null;
      this.onStatus(error.message,true);
      throw error;
    });
    return this.started;
  }
  ping(){
    this.frame.contentWindow?.postMessage({type:'nexo:hew.ping'},this.origin);
  }
  onMessage(event){
    if(event.origin!==this.origin || event.source!==this.frame.contentWindow)return;
    const data=event.data;
    if(!data || typeof data!=='object')return;
    if(data.type==='nexo:hew.ready' && data.version===1){
      clearTimeout(this.startupTimer);
      this.startupTimer=null;
      if(data.session!==this.bootId){
        this.generatedIds=[];
        for(const {reject,timeout} of this.pending.values()){
          clearTimeout(timeout);reject(Error('Hew se ha reiniciado; vuelve a ejecutar la operación.'));
        }
        this.pending.clear();
        this.bootId=data.session;
      }
      this.ready=true;
      this.onStatus('Hew listo. Puedes usar Push/Pull, componentes y herramientas del modelador.');
      if (this.pendingProject && !this.loading) {
        const pending=this.pendingProject;
        void this.loadProject(pending).catch(e =>
          this.onStatus('No se restauró el proyecto Hew: '+e.message,true));
      }
      return;
    }
    if(!Number.isSafeInteger(data.id))return;
    const call=this.pending.get(data.id);
    if(!call)return;
    this.pending.delete(data.id);
    clearTimeout(call.timeout);
    if(data.type==='nexo:hew.glb' || data.type==='nexo:hew.native'){
      if(!(data.data instanceof ArrayBuffer))call.reject(Error('Hew no devolvió un GLB binario.'));
      else call.resolve(data.data);
    } else if(data.type==='nexo:hew.reply'){
      if(data.error||data.result?.error){
        call.reject(Error(String(data.error||data.result.error.message||'La operación fue rechazada por Hew.')));
      } else call.resolve(data.result?.result);
    }
  }
  request(type, method, params, data = undefined){
    if(!this.ready || !this.frame.contentWindow)
      return Promise.reject(Error('El modelador Hew aún no está listo.'));
    const id=++this.nextId;
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{
        this.pending.delete(id);
        reject(Error('Hew tardó demasiado en responder.'));
      },60000);
      this.pending.set(id,{resolve,reject,timeout});
      const message={type,id,method,params};
      if (data !== undefined) message.data=data;
      this.frame.contentWindow.postMessage(message,this.origin);
    });
  }
  /** Restore the editable Hew document (or a blank one) before exposing a new NEXO project. */
  async loadProject(project){
    if (!this.ready) {
      this.pendingProject=project;
      return false;
    }
    if (this.loading) await this.loading;
    this.pendingProject=project;
    const binary=getHewDocument(project);
    const task=(async()=>{
      const result=await this.request('nexo:hew.load',null,null,binary);
      if (!result?.loaded)throw Error('Hew no confirmó la restauración.');
      this.generatedIds=[...(project.hew?.generatedIds || [])];
      this.lastManifest=null;
      this.pendingProject=null;
      this.onStatus(binary ?
        'Modelo Hew editable recuperado dentro del proyecto NEXO.' :
        'Escena Hew limpiada para el nuevo proyecto.');
      return true;
    })();
    this.loading=task;
    try { return await task; }
    finally {if(this.loading===task)this.loading=null;}
  }

  /** Atomically capture the current, editable Hew WASM document for JSON v3. */
  async captureProject(project){
    if (!this.ready) return project; // preserved previous .hew blob survives unchanged
    if (this.loading)await this.loading;
    if (this.pendingProject)await this.loadProject(this.pendingProject);
    const buffer=await this.request('nexo:hew.save',null,null);
    if (!(buffer instanceof ArrayBuffer))throw Error('No llegaron bytes nativos desde Hew.');
    return withHewDocument(project,buffer,this.generatedIds);
  }

  async syncCad(){
    if (this.loading) await this.loading;
    if (this.pendingProject) await this.loadProject(this.pendingProject);
    const {script,manifest}=buildHewCommands(this.getProject());
    const replace=this.generatedIds.map(id=>({
      method:'hew.entity.delete',params:{id}
    }));
    const commands=[...replace,...script[2].params.commands];
    if(commands.length>2600)throw Error('Demasiadas operaciones para esta versión del puente Hew.');
    const result=await this.request('nexo:hew.command','hew.doc.transact',{
      label:'NEXO CAD sincronizado · '+manifest.sourceProjectName,
      commands
    });
    if(!Array.isArray(result?.results) || result.results.length!==commands.length)
      throw Error('Hew no confirmó todas las operaciones.');
    const ids=[];
    for(let i=0;i<script[2].params.commands.length;i++){
      const op=script[2].params.commands[i],reply=result.results[i+replace.length];
      if(op.as?.startsWith('wall')){
        if(typeof reply?.object_id!=='string')throw Error('Hew no devolvió ID para '+op.as);
        ids.push(reply.object_id);
        const item=manifest.objects.find(o=>o.hewResultAlias===op.as);
        if(item){item.hewObjectId=reply.object_id;item.status='generated';}
      }
    }
    this.generatedIds=ids;
    this.lastManifest=manifest;
    this.onStatus('Plano CAD enviado a Hew: '+ids.length+' muros. Edita ahora en Modelado.');
    return manifest;
  }
  async updateRender(){
    const glb=await this.request('nexo:hew.export',null,null);
    this.onPreview(glb);
    this.onStatus('Modelo Hew exportado localmente a Render. CAD sigue siendo la fuente del plano.');
    return glb;
  }
  dispose(){
    clearTimeout(this.startupTimer);
    this.startupTimer=null;
    window.removeEventListener('message',this.onMessage);
    for(const {reject,timeout} of this.pending.values()){
      clearTimeout(timeout);reject(Error('Editor Hew cerrado.'));
    }
    this.pending.clear();
    this.pendingProject=null;
    this.loading=null;
  }
}

