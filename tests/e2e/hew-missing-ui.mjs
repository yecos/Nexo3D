// SPDX-License-Identifier: AGPL-3.0-only
// Genuine Chromium regression test: missing Hew must not collapse the modeler.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--disable-dev-shm-usage'
]});
const context=await browser.newContext({viewport:{width:1366,height:768}});
const page=await context.newPage();
page.setDefaultTimeout(15000);
const errors=[];
page.on('pageerror',err=>errors.push(err.message));
try {
  await page.goto('http://127.0.0.1:4181/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-workspace="model"]').click();
  await page.locator('#hew-missing').waitFor({state:'visible'});
  assert(await page.locator('#hew-toolbar').isVisible(),'Hew toolbar must not disappear');
  assert(await page.locator('#hew-retry').isVisible(),'retry button must be available');
  const viewport=await page.locator('.viewport-wrap').boundingBox();
  assert(viewport && viewport.width>700, 'modeling canvas got zero width: '+JSON.stringify(viewport));
  const headline=await page.locator('#hew-missing h2').textContent();
  assert.match(headline,/Hew todavía no está disponible/);
  const message=await page.locator('#hew-error-detail').textContent();
  assert.match(message,/Faltan los archivos locales de Hew/);
  assert(!message.includes('Unexpected token'), 'raw JSON error must not reach user');
  assert.equal(await page.locator('#hew-frame').isVisible(),false,
    'empty iframe should be hidden while Hew is not installed');
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/hew-missing-visible.png',fullPage:true});
  await page.locator('#hew-retry').click();
  await page.locator('#hew-missing').waitFor({state:'visible'});
  await page.locator('[data-workspace="cad"]').click();
  assert(await page.locator('#cad-surface').isVisible(),'CAD must still work without Hew');
  await page.locator('[data-workspace="model"]').click();
  assert(await page.locator('#hew-missing').isVisible(),'modeling error must remain recoverable');
  assert.equal(errors.length,0,'unexpected JavaScript page errors: '+errors.join(' | '));
  console.log('PASS: missing Hew shows visible full-width diagnostic, retry, and CAD survives.');
} catch(error){
  console.error('FAIL:',error);
  console.error('PAGE ERRORS:',errors);
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/hew-missing-error.png',fullPage:true}).catch(()=>{});
  process.exitCode=1;
} finally {
  await browser.close();
}
