// SPDX-License-Identifier: AGPL-3.0-only
// Servidor solo de desarrollo: no exponer directamente a Internet.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {join,resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const path=new URL(req.url,'http://localhost').pathname;
    const decoded=decodeURIComponent(path);
    const file=resolve(join(root,decoded==='/'?'index.html':decoded.replace(/^\/+/,'')));
    if(file!==root && !file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    if(!types[extname(file)]){res.writeHead(404);res.end();return;}
    const s=await stat(file);if(!s.isFile()){res.writeHead(404);res.end();return;}
    const data=await readFile(file);
    res.writeHead(200,{'content-type':types[extname(file)],
      'x-content-type-options':'nosniff','cache-control':'no-store'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('NEXO BIM web: http://127.0.0.1:4173'));
