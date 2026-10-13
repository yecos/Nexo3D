// SPDX-License-Identifier: AGPL-3.0-only
// Real browser smoke of same-window real-time Render and v3 project save/reopen.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({
  headless:true,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader','--disable-dev-shm-usage']
});
const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:900}});
const page=await context.newPage();
page.setDefaultTimeout(35000);
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:4175',{waitUntil:'domcontentloaded'});
  await page.locator('[data-workspace="render"]').click();
  assert.equal(await page.locator('#render-settings').isVisible(),true);
  assert.equal(await page.locator('#viewport canvas').count(),1);
  await page.locator('#render-quality').selectOption('studio');
  await page.locator('#render-sun-elevation').evaluate(input=>{
    input.value='22';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#render-exposure').evaluate(input=>{
    input.value='1.45';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#render-ao').check();
  await page.locator('#render-shadows').check();
  await page.locator('#render-grid').uncheck();
  assert.equal(await page.locator('#render-quality').inputValue(),'studio');
  await page.waitForTimeout(600);
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/render-studio.png',fullPage:true});
  const dlPromise=page.waitForEvent('download');
  await page.locator('#save-project').click();
  const dl=await dlPromise;
  const saved=JSON.parse(await readFile(await dl.path(),'utf8'));
  assert.equal(saved.schemaVersion,3);
  assert.equal(saved.render.quality,'studio');
  assert.equal(saved.render.sunElevation,22);
  assert.equal(saved.render.exposure,1.45);
  assert.equal(saved.render.ambientOcclusion,true);
  page.once('dialog',d=>d.accept());
  await page.locator('#new-project').click();
  await page.locator('#project-file').setInputFiles(await dl.path());
  await page.locator('#render-quality').waitFor();
  assert.equal(await page.locator('#render-quality').inputValue(),'studio');
  assert.equal(await page.locator('#render-sun-elevation').inputValue(),'22');
  assert.equal(await page.locator('#render-ao').isChecked(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: real Chromium Render Studio controls, WebGL viewport and persistent project v3.');
} catch(error) {
  console.error('E2E:',error);
  console.error('PAGE ERRORS:',errors);
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/render-studio-error.png',fullPage:true}).catch(()=>{});
  process.exitCode=1;
} finally {await browser.close();}
