// SPDX-License-Identifier: AGPL-3.0-only
// Real Chromium E2E for a single NEXO project containing editable Hew ZIP.
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const upstreamRequire=createRequire(resolve('upstream-hew/app/package.json'));
const {chromium}=upstreamRequire('@playwright/test');
const browser=await chromium.launch({
  headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']
});
const context=await browser.newContext({acceptDownloads:true, viewport:{width:1440,height:900}});
const page=await context.newPage();
page.on('console',msg=>{if(msg.type()==='error') console.error('BROWSER:',msg.text().slice(0,600));});
page.on('pageerror',err=>console.error('PAGE ERROR:',err.message.slice(0,700)));
page.setDefaultTimeout(60000);
const fixture=resolve('examples/room-4x3.nexo3d.json');
const assertBundle=p=>{
  assert.equal(p.schemaVersion,3,'NEXO schema v3');
  assert.equal(p.hew?.format,'hew');
  assert.equal(p.hew?.encoding,'base64');
  assert.equal(p.hew?.generatedIds?.length,4,'Four CAD-linked Hew wall IDs persisted');
  const archive=Buffer.from(p.hew.data,'base64');
  assert(archive.length>256 && archive.subarray(0,2).equals(Buffer.from('PK')),'valid zip signature');
  assert.equal(p.cad.shapes.length,1,'CAD rectangle preserved');
  assert.equal(p.cad.shapes[0].extrusion.height,2.6);
  assert.equal(p.cad.shapes[0].extrusion.thickness,.15);
  assert(p.nodes.some(x=>x.source==='hew-interactive' && x.kind==='glb'),
    'Render GLB snapshot persisted');
};
async function save(){
  const downloadPromise=page.waitForEvent('download',{timeout:60000});
  await page.locator('#save-project').click();
  const download=await downloadPromise;
  const project=JSON.parse(await readFile(await download.path(),'utf8'));
  assertBundle(project);
  return {download,project};
}
try{
  await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded'});
  await page.locator('#project-file').setInputFiles(fixture);
  await page.locator('#status').filter({hasText:'Proyecto antiguo migrado'}).waitFor();
  await page.locator('[data-workspace="model"]').click();
  await page.locator('#hew-state').filter({hasText:/Hew listo|Escena Hew limpiada|Modelo Hew editable recuperado/}).waitFor({timeout:120000});
  await page.locator('#hew-send-cad').click();
  await page.locator('#hew-state').filter({hasText:/Plano CAD enviado a Hew: 4 muros/}).waitFor({timeout:90000});
  await page.locator('#hew-to-render').click();
  await page.locator('#hew-state').filter({hasText:/Modelo Hew exportado localmente/}).waitFor({timeout:90000});
  const saved=await save();
  console.log('SAVE 1:',saved.project.name, 'HEW ZIP bytes=',Buffer.from(saved.project.hew.data,'base64').length);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#new-project').click();
  await page.locator('#status').filter({hasText:'Nuevo proyecto CAD + Hew preparado'}).waitFor();
  await page.locator('#project-file').setInputFiles(await saved.download.path());
  await page.locator('#status').filter({hasText:/Proyecto CAD \+ Hew editable recuperado/).waitFor();
  await page.locator('#hew-state').filter({hasText:/Modelo Hew editable recuperado/}).waitFor({timeout:90000});
  const savedAgain=await save();
  assert.equal(savedAgain.project.id,saved.project.id,'project identity survives');
  assert.deepEqual(savedAgain.project.cad,saved.project.cad,'editable CAD survives');
  assert.deepEqual(savedAgain.project.hew.generatedIds,saved.project.hew.generatedIds,
    'Hew object mapping survives');
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/unified-project-e2e.png',fullPage:true});
  console.log('PASS: CAD -> interactive Hew -> GLB Render -> single file -> New -> Open -> editable Hew restored.');
}catch(error){
  console.error('E2E FAIL:',error);
  console.error('STATUS:',await page.locator('#status').textContent().catch(()=>'<no status>'));
  console.error('HEW:',await page.locator('#hew-state').textContent().catch(()=>'<no Hew>'));
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/unified-project-error.png',fullPage:true}).catch(()=>{});
  process.exitCode=1;
}finally{
  await browser.close();
}
