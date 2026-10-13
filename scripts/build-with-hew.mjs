#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// One local command: NEXO CAD JSON → Hew .hew + GLB (+ Blender Cycles PNG).
// The official Hew CLI and Blender are EXTERNAL executables, not vendored.
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {parseProject} from '../src/domain.js';
import {buildHewCommands} from '../src/hew-adapter.js';

const usage = 'Uso: node scripts/build-with-hew.mjs proyecto.nexo3d.json directorio_salida /ruta/hew-cli [ruta/blender]';
const args=process.argv.slice(2);
if (args.length<3 || args.length>4 || args.includes('--help')) {
  console.error(usage);process.exitCode=2;
} else {
  const [input, output, hewBinary, blenderBinary]=args;
  const root=resolve(output);
  const hew=resolve(hewBinary);
  const source=resolve(input);
  const run=(bin,binArgs,timeout=180000)=>{
    try {return execFileSync(bin,binArgs,{
      cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,
      timeout,windowsHide:true,stdio:['ignore','pipe','pipe']
    });}
    catch(error){
      const detail=String(error.stderr||error.stdout||error.message).slice(-1800);
      throw new Error(`Fallo ${bin}: ${detail}`);
    }
  };
  try {
    if ((await stat(source)).size>70*1024*1024) throw new Error('El archivo supera 70 MB.');
    const project=parseProject(await readFile(source,'utf8'));
    const {script,manifest}=buildHewCommands(project);
    await mkdir(root,{recursive:true});
    const scriptFile=join(root,'cad-to-hew.json');
    const model=join(root,'scene.hew');
    const glb=join(root,'scene.glb');
    const skp=join(root,'scene.skp');
    await writeFile(scriptFile,JSON.stringify(script,null,2)+'\n');
    await writeFile(join(root,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    const result=run(hew,['run',scriptFile,'--out',model]);
    await writeFile(join(root,'hew-api.jsonl'),result);
    const replies=result.trim().split(/\r?\n/).filter(Boolean).map(s=>JSON.parse(s));
    const transaction=replies.find(x=>x.id===3);
    if (!transaction?.result?.results) throw new Error('Hew no devolvió la transacción de modelado.');
    const commands=script[2].params.commands;
    for(let i=0;i<commands.length;i++){
      const alias=commands[i].as;
      if(!alias?.startsWith('wall'))continue;
      const row=manifest.objects.find(o=>o.hewResultAlias===alias);
      if(row && transaction.result.results[i]?.object_id) {
        row.hewObjectId=transaction.result.results[i].object_id;
        row.status='generated';
      }
    }
    if (manifest.objects.some(o=>o.status!=='generated'))
      throw new Error('Falta un identificador de objeto Hew en la respuesta.');
    const exportFormat=(format,dest)=>{
      const reply=run(hew,['dispatch','hew.doc.export',JSON.stringify({format,path:dest}),'--file',model]);
      return reply;
    };
    await writeFile(join(root,'hew-glb-export.jsonl'),exportFormat('glb',glb));
    await writeFile(join(root,'hew-skp-export.jsonl'),exportFormat('skp2017',skp));
    const binary=await readFile(glb);
    if(binary.length<40 || binary.readUInt32LE(0)!==0x46546c67 ||
      binary.readUInt32LE(4)!==2 || binary.readUInt32LE(8)!==binary.length)
      throw new Error('Hew no produjo un GLB 2.0 válido.');
    const doc=JSON.parse(binary.subarray(20,20+binary.readUInt32LE(12)).toString('utf8'));
    if(doc.asset?.version!=='2.0' || !doc.meshes?.length)
      throw new Error('GLB sin mallas o glTF 2.0 inválido.');
    manifest.outputs={model:'scene.hew', glb:'scene.glb',skp:'scene.skp'};
    manifest.glbMeshCount=doc.meshes.length;
    if(blenderBinary) {
      const blender=resolve(blenderBinary);
      const scriptPath=resolve('scripts/render-hew-preview.py');
      const png=join(root,'scene-cycles.png');
      const stdout=run(blender,[
        '--background','--factory-startup','--threads','2','--python',scriptPath,
        '--',glb,png
      ],180000);
      await writeFile(join(root,'blender.log'),stdout);
      if((await stat(png)).size<1024)throw new Error('Blender produjo PNG vacío.');
      manifest.outputs.png='scene-cycles.png';
    }
    await writeFile(join(root,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log('PASS: NEXO CAD → geometría Hew → GLB/SKP'+(blenderBinary?' → Blender PNG':''));
    console.log(JSON.stringify({source:project.name,wallSegments:manifest.objects.length,
      meshCount:doc.meshes.length,outputs:manifest.outputs,warnings:manifest.warnings},null,2));
  } catch(error) {
    console.error('ERROR:',error.message);
    process.exitCode=1;
  }
}
