// SPDX-License-Identifier: AGPL-3.0-only
// Herramientas de análisis documentado, sin instalador automático ni copia de código externo.
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lab = join(root, '.rea-lab');
const lockPath = join(root, 'upstreams', 'bimrocket.lock.json');
const usage = `NEXO BIM · Investigación con REA, basada en software abierto
Uso:
  node scripts/rea-bim-audit.mjs plan
  node scripts/rea-bim-audit.mjs prepare --run
  node scripts/rea-bim-audit.mjs analyze --run
  node scripts/rea-bim-audit.mjs analyze --source /ruta/absoluta --run

Por defecto ninguna acción modifica archivos. El flag --run autoriza la acción concreta.
No instala REA ni configura agentes; esa instalación se aprueba por separado.`;

function processArgs(argv) {
  const [action = 'plan', ...rest] = argv;
  if (!['plan', 'prepare', 'analyze'].includes(action)) throw Error('Acción inválida.');
  let run = false, source = null;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--run') run = true;
    else if (rest[i] === '--source' && rest[i+1]) source = rest[++i];
    else throw Error('Argumento no reconocido: ' + rest[i]);
  }
  return { action, run, source };
}
function runCommand(program, args, cwd) {
  const child = spawnSync(program, args, {cwd, stdio:'inherit', shell:false});
  if (child.error) throw Error(program + ': ' + child.error.message);
  if (child.status !== 0) throw Error(program + ' terminó con código ' + child.status);
}
async function prepare(lock, run) {
  const destination = join(lab, 'upstreams', 'bimrocket');
  const commands = [
    ['git','clone','--branch',lock.ref,'--single-branch',lock.repository,destination],
    ['git','-C',destination,'checkout','--detach',lock.commit],
    ['git','-C',destination,'rev-parse','HEAD']
  ];
  if (!run) {
    console.log('PLAN (no se ejecutó):');
    commands.forEach(([cmd,...args])=>console.log([cmd,...args].join(' ')));
    console.log('Se clonará el upstream abierto fuera del árbol versionado en .rea-lab/.');
    return;
  }
  const targetExists = await stat(destination).then(()=>true,()=>false);
  if (targetExists) throw Error('Ya existe el checkout upstream. No se sobrescribirá: '+destination);
  await mkdir(dirname(destination),{recursive:true});
  runCommand('git',commands[0].slice(1),root);
  runCommand('git',commands[1].slice(1),root);
  const result=spawnSync('git',['-C',destination,'rev-parse','HEAD'],{encoding:'utf8'});
  if(result.error || result.status!==0 || result.stdout.trim()!==lock.commit)
    throw Error('El commit local no coincide con la revisión autorizada. No continuar.');
  console.log('BIMROCKET fijado a '+lock.commit+'. Revisar avisos de terceros antes de reutilizar.');
}
async function analyze(lock, source, run) {
  const target=source ? resolve(source) : join(lab,'upstreams','bimrocket','bimrocket-webapp','src','main','webapp');
  if (source && !isAbsolute(source)) throw Error('--source requiere una ruta absoluta para REA.');
  const filename=join(lab,'evidence','bimrocket-javascript-evidence.json');
  const args=['analyze-javascript-application',target,'--json'];
  if(!run) {
    console.log('PLAN (no se ejecutó): rea '+args.map(x=>JSON.stringify(x)).join(' '));
    console.log('Evidencia prevista: '+filename);
    console.log('Se examina una característica por vez: primero herramientas design/bim e importación IFC.');
    return;
  }
  const info=await stat(target).catch(()=>null);
  if(!info?.isDirectory())throw Error('Directorio de código no encontrado: '+target+'; ejecutar prepare --run primero.');
  const resultPath=join(lab,'evidence');
  await mkdir(resultPath,{recursive:true});
  if (await stat(filename).then(()=>true,()=>false))
    throw Error('Ya hay evidencia guardada. No sobrescribir automáticamente: '+filename);
  const command=spawn('rea',args,{cwd:root,stdio:['ignore','pipe','inherit'],shell:false});
  let bytes=0;
  command.stdout.on('data',chunk=>{
    bytes+=chunk.length;
    if(bytes>512*1024*1024)command.kill('SIGTERM');
  });
  const write=pipeline(command.stdout,createWriteStream(filename,{flags:'wx'}));
  const result=await new Promise((accept,reject)=>{
    command.on('error',e=>reject(Error('REA no está instalado en PATH. Instalar y aprobar su configuración según https://rea.tools. '+e.message)));
    command.on('close',(code)=>accept(code));
  });
  await write;
  if(result!==0)throw Error('REA falló. Evidencia parcial retenida para diagnóstico: '+filename);
  const buffer=await readFile(filename);
  let parsed;
  try {parsed=JSON.parse(buffer.toString('utf8'));}
  catch {throw Error('REA no produjo un JSON válido; revisar archivo: '+filename);}
  const metadata={upstream:lock.repository,upstreamCommit:lock.commit,target,
    evidenceFile:filename,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex'),
    analyzedAt:new Date().toISOString(),format:'rea-javascript-application'};
  await writeFile(join(resultPath,'bimrocket-audit-manifest.json'),JSON.stringify(metadata,null,2));
  console.log('Evidencia REA verificada como JSON y registrada: '+filename);
}
async function main() {
  const options=processArgs(process.argv.slice(2));
  const lock=JSON.parse(await readFile(lockPath,'utf8'));
  if(!/^[0-9a-f]{40}$/.test(lock.commit))throw Error('Commit upstream inválido.');
  if(options.action==='plan')console.log(usage);
  else if(options.action==='prepare')await prepare(lock,options.run);
  else await analyze(lock,options.source,options.run);
}
main().catch(error=>{console.error('Error: '+error.message);process.exitCode=1;});
