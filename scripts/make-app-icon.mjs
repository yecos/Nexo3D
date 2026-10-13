#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Generate a simple original placeholder icon without downloading third-party fonts.
import {deflateSync} from 'node:zlib';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const W=512,H=512;
const raw=Buffer.alloc(H*(1+W*4));
function rgbAt(x,y){
  const pad=22, r=90;
  const xx=Math.max(pad-x,0,x-(W-pad-1));
  const yy=Math.max(pad-y,0,y-(H-pad-1));
  if(xx*xx+yy*yy>r*r)return [0,0,0,0];
  const base=[23+Math.round(x/W*9),32+Math.round(y/H*12),39+Math.round(x/W*10)];
  // Two heavy vertical strokes and the diagonal make an N, with ample whitespace.
  const u=x/W,v=y/H;
  const left=u>=.235&&u<=.34&&v>=.215&&v<=.785;
  const right=u>=.66&&u<=.765&&v>=.215&&v<=.785;
  const diag=u>=.28&&u<=.72&&Math.abs(v-(.16+u*.68))<.069;
  return left||right||diag?[219,188,144,255]:[...base,255];
}
for(let y=0;y<H;y++){
  const row=y*(1+W*4);raw[row]=0;
  for(let x=0;x<W;x++){
    const p=rgbAt(x,y),i=row+1+x*4;
    for(let k=0;k<4;k++)raw[i+k]=p[k];
  }
}
const table=new Uint32Array(256);
for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[i]=c>>>0;}
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,bytes){
  const label=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);
  len.writeUInt32BE(bytes.length);crc.writeUInt32BE(crc32(Buffer.concat([label,bytes])));
  return Buffer.concat([len,label,bytes,crc]);
}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),
  chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
const file=resolve('src-tauri/icon-source.png');
await mkdir(resolve('src-tauri'),{recursive:true});
await writeFile(file,png);
console.log('Icono original NEXO 3D generado:',file,png.length,'bytes');
