// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function run(...args) {
  return spawnSync(process.execPath,['scripts/rea-bim-audit.mjs',...args],
    {cwd:root,encoding:'utf8'});
}
test('publica instrucciones sin cambiar nada',()=>{
  const r=run('plan');assert.equal(r.status,0);assert.match(r.stdout,/REA/);
});
test('preparación necesita --run explícito',()=>{
  const r=run('prepare');assert.equal(r.status,0);assert.match(r.stdout,/PLAN/);
});
test('análisis es simulación por defecto',()=>{
  const r=run('analyze');assert.equal(r.status,0);assert.match(r.stdout,/no se ejecutó/);
});
test('rechaza rutas relativas por seguridad',()=>{
  const r=run('analyze','--source','./bimrocket');assert.equal(r.status,1);
  assert.match(r.stderr,/ruta absoluta/);
});
test('lock contiene hash versionado y opciones de licencia',async()=>{
  const lock=JSON.parse(await readFile(resolve(root,'upstreams/bimrocket.lock.json'),'utf8'));
  assert.match(lock.commit,/^[0-9a-f]{40}$/);
  assert.ok(lock.license.options.includes('LGPL-3.0-or-later'));
});
