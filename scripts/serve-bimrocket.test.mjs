// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {mapRequest} from './serve-bimrocket.mjs';
const root=resolve('/tmp','bimrocket-static-root');
test('apunta a la aplicación fuente, no a una copia modificada',()=>{
  assert.equal(mapRequest('/',root),resolve(root,'app.html'));
  assert.equal(mapRequest('/modules/bim/module.js',root),
    resolve(root,'modules','bim','module.js'));
});
test('bloquea traversal, rutas codificadas y separadores de Windows',()=>{
  assert.equal(mapRequest('/%2e%2e/secrets.txt',root),null);
  assert.equal(mapRequest('/%5cwindows',root),null);
  assert.equal(mapRequest('/foo/%00bar.js',root),null);
});
test('el comando informa requisitos sin ejecutar una aplicación',()=>{
  const result=spawnSync(process.execPath,['scripts/serve-bimrocket.mjs','--help'],{
    cwd:resolve(import.meta.dirname,'..'),encoding:'utf8'});
  assert.equal(result.status,0);
  assert.match(result.stdout,/BIMROCKET/);
});
