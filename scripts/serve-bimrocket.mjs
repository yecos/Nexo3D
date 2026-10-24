// SPDX-License-Identifier: AGPL-3.0-only
// Sirve el frontend upstream original sin modificar ni copiar su código al repositorio.
// Algunos servicios de BIMROCKET necesitan un backend externo, no los proporciona este script.
import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {dirname,extname,isAbsolute,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const defaultWebapp=resolve(repoRoot,'.rea-lab','upstreams','bimrocket',
  'bimrocket-webapp','src','main','webapp');
const usage=`NEXO BIM — lanzar frontend BIMROCKET local (sin backend)
Uso:
  node scripts/serve-bimrocket.mjs
  node scripts/serve-bimrocket.mjs --source /ruta/absoluta/a/webapp
  node scripts/serve-bimrocket.mjs --help
Preparar el checkout antes: node scripts/rea-bim-audit.mjs prepare --run
Abrir: http://127.0.0.1:4183/
No apto para redes públicas ni despliegue de producción.`;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.wasm':'application/wasm',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.gif':'image/gif','.webp':'image/webp','.ico':'image/x-icon',
  '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf',
  '.glb':'model/gltf-binary','.gltf':'model/gltf+json','.ifc':'text/plain; charset=utf-8',
  '.bin':'application/octet-stream','.xml':'application/xml; charset=utf-8',
  '.txt':'text/plain; charset=utf-8','.map':'application/json; charset=utf-8'};
function parseArgs(args) {
  if(args.length===1 && args[0]==='--help')return {help:true,source:defaultWebapp};
  if(args.length===0)return {help:false,source:defaultWebapp};
  if(args.length===2 && args[0]==='--source' && isAbsolute(args[1]))
    return {help:false,source:resolve(args[1])};
  throw Error('Argumentos inválidos. --source debe ser una ruta absoluta.');
}
export function mapRequest(url,root) {
  let path;
  try{path=decodeURIComponent(String(url).split(/[?#]/,1)[0]);}
  catch{return null;}
  if(path.includes('\\') || path.includes('\0'))return null;
  const segments=path.split('/');
  if(segments.includes('..')||segments.includes('.'))return null;
  if(path==='/')path='/app.html';
  const p=resolve(root,'.'+path);
  return p.startsWith(root+sep)?p:null;
}
async function main(){
  const {help,source}=parseArgs(process.argv.slice(2));
  if(help){console.log(usage);return;}
  const root=await realpath(source).catch(()=>null);
  if(!root || !(await stat(root)).isDirectory())
    throw Error('No existe la webapp upstream. Ejecuta prepare --run primero: '+source);
  const server=createServer(async(req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const file=mapRequest(req.url,root);
    if(!file){res.writeHead(403);res.end();return;}
    const type=mime[extname(file).toLowerCase()];
    if(!type){res.writeHead(404);res.end();return;}
    try{
      const actual=await realpath(file);
      if(!actual.startsWith(root+sep)){res.writeHead(403);res.end();return;}
      if(!(await stat(actual)).isFile()){res.writeHead(404);res.end();return;}
      const body=await readFile(actual);
      res.writeHead(200,{'content-type':type,'x-content-type-options':'nosniff',
        'cache-control':'no-store'});
      res.end(req.method==='HEAD'?undefined:body);
    }catch{res.writeHead(404);res.end('Not Found');}
  });
  server.listen(4183,'127.0.0.1',()=>{
    console.log('Frontend BIMROCKET sin modificar: http://127.0.0.1:4183/');
    console.log('Funciones que requieren bimrocket-server pueden estar inactivas.');
  });
}
const isMain=process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain)main().catch(err=>{console.error(err.message);process.exitCode=1;});
