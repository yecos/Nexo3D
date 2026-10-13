// SPDX-License-Identifier: AGPL-3.0-only
// Shared, renderer-independent architectural visualization presets.
// Everything remains in the canonical local NEXO document.
export const RENDER_STUDIO_DEFAULTS = Object.freeze({
  exposure: 1.1,
  sunAzimuth: 135,
  sunElevation: 48,
  groundColor: '#77746c',
  quality: 'balanced',
  ambientOcclusion: false,
  aoIntensity: 0.8,
  showGrid: false,
  shadows: true
});
export const RENDER_QUALITY = Object.freeze({
  fast: Object.freeze({pixelRatio: 1, shadowMap: 1024, aoSamples: 4}),
  balanced: Object.freeze({pixelRatio: 1.5, shadowMap: 2048, aoSamples: 8}),
  studio: Object.freeze({pixelRatio: 2, shadowMap: 2048, aoSamples: 12})
});
const color=/^#[0-9a-fA-F]{6}$/;
const numerical={ exposure:[0.2,3],sunAzimuth:[0,360],sunElevation:[0,90],aoIntensity:[0,2] };
export function withRenderStudioDefaults(settings) {
  return {...RENDER_STUDIO_DEFAULTS,...settings};
}
export function validateRenderStudio(settings){
  if(!settings || typeof settings!=='object'||Array.isArray(settings))
    throw new Error('Opciones de visualización inválidas.');
  for(const [key,[min,max]] of Object.entries(numerical)) {
    if(settings[key]===undefined)continue; // Accept existing schema v3 files.
    if(typeof settings[key]!=='number'||!Number.isFinite(settings[key])||settings[key]<min||settings[key]>max)
      throw new Error('Parámetro visual inválido: '+key);
  }
  if(settings.groundColor!==undefined && (typeof settings.groundColor!=='string'||!color.test(settings.groundColor)))
    throw new Error('Color de suelo inválido.');
  if(settings.quality!==undefined && !Object.hasOwn(RENDER_QUALITY,settings.quality))
    throw new Error('Calidad visual inválida.');
  for(const key of ['ambientOcclusion','showGrid','shadows'])
    if(settings[key]!==undefined && typeof settings[key]!=='boolean')
      throw new Error('Opción visual inválida: '+key);
  return true;
}
export function sunPosition(azimuth,elevation, radius=20){
  if(!Number.isFinite(azimuth)||!Number.isFinite(elevation)||!Number.isFinite(radius))
    throw new Error('Posición solar inválida.');
  const a=azimuth*Math.PI/180, e=elevation*Math.PI/180;
  const planar=radius*Math.cos(e);
  return [planar*Math.sin(a), radius*Math.sin(e), planar*Math.cos(a)];
}
export function qualityOptions(quality,devicePixelRatio=1) {
  const p=RENDER_QUALITY[quality]??RENDER_QUALITY.balanced;
  return {pixelRatio:Math.min(Math.max(devicePixelRatio,1),p.pixelRatio),shadowMap:p.shadowMap,aoSamples:p.aoSamples};
}
