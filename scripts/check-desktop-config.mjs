#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const config=JSON.parse(await readFile('src-tauri/tauri.conf.json','utf8'));
const cargo=await readFile('src-tauri/Cargo.toml','utf8');
const cargoVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
assert.equal(pkg.version,config.version,'npm and desktop package mismatch');
assert.equal(config.version,cargoVersion,'Cargo and Tauri versions mismatch');
assert(config.build.frontendDist==='../dist','desktop must bundle local web assets');
assert.equal(config.identifier,'com.nexo3d.desktop');
assert(config.app.windows[0].minWidth>=900,'desktop workspaces need adequate width');
console.log('PASS NEXO Desktop metadata: version',pkg.version,'identifier',config.identifier);
