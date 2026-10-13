// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 NEXO 3D contributors
export const FORMAT = 'nexo3d-prototype';
export const SCHEMA_VERSION = 1;
export const MAX_GLB_BYTES = 30 * 1024 * 1024;
export const MAX_PROJECT_BYTES = 70 * 1024 * 1024;

const hex = /^#[0-9a-fA-F]{6}$/;
const isVec = (value, size) =>
  Array.isArray(value) && value.length === size &&
  value.every(n => typeof n === 'number' && Number.isFinite(n));

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? 'id-' + Math.random().toString(36).slice(2);
}
export function makeBox(name = 'Volumen') {
  return {
    id: newId(), name, kind: 'box',
    transform: { position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    material: { color: '#b8aa94', metalness: 0, roughness: 0.65 }
  };
}
export function makeProject() {
  return {
    format: FORMAT, schemaVersion: SCHEMA_VERSION,
    id: newId(), name: 'Proyecto sin título', units: 'm',
    nodes: [makeBox('Volumen de prueba')], assets: {},
    render: { background: '#1b2327', sunIntensity: 2, ambientIntensity: 1.2 }
  };
}
export function cloneForEdit(project) {
  // Asset blobs are immutable; avoiding copies prevents megabytes duplicated per undo.
  return {
    ...project,
    nodes: project.nodes.map(n => ({
      ...n, transform: {
        position: [...n.transform.position],
        rotation: [...n.transform.rotation],
        scale: [...n.transform.scale]
      },
      material: { ...n.material }
    })),
    render: { ...project.render },
    assets: project.assets
  };
}
export function validateGLB(bytes) {
  if (!(bytes instanceof ArrayBuffer)) throw new Error('El modelo debe ser un archivo binario GLB.');
  if (bytes.byteLength > MAX_GLB_BYTES) throw new Error('GLB excede el límite temporal de 30 MB.');
  if (bytes.byteLength < 20) throw new Error('GLB incompleto.');
  const v = new DataView(bytes);
  if (v.getUint32(0, true) !== 0x46546c67) throw new Error('El archivo no tiene cabecera GLB.');
  if (v.getUint32(4, true) !== 2) throw new Error('Este prototipo solo admite GLB 2.0.');
  if (v.getUint32(8, true) !== bytes.byteLength) throw new Error('Longitud GLB incorrecta.');
  if (v.getUint32(16, true) !== 0x4e4f534a) throw new Error('Falta el bloque JSON del GLB.');
  const jsonLength = v.getUint32(12, true);
  if (jsonLength === 0 || jsonLength > bytes.byteLength - 20 || jsonLength % 4)
    throw new Error('Bloque JSON inválido o fuera de rango.');
  let json;
  try {
    const jsonBytes = new Uint8Array(bytes, 20, jsonLength);
    json = JSON.parse(new TextDecoder().decode(jsonBytes).replace(/\\u0000+$/g, '').trim());
  } catch { throw new Error('El GLB no tiene un JSON válido.'); }
  if (!json.asset || json.asset.version !== '2.0')
    throw new Error('Archivo glTF 2.0 inválido.');
  // A self-contained GLB must not silently fetch external models/textures.
  for (const item of [...(json.buffers || []), ...(json.images || [])]) {
    if (item.uri && (!String(item.uri).startsWith('data:')))
      throw new Error('GLB con recursos externos no permitido: usa un archivo autocontenido.');
  }
  return true;
}
export function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(result);
}
export function base64ToBytes(encoded) {
  const raw = atob(encoded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}
export function addGLB(project, name, buffer) {
  validateGLB(buffer);
  const assetId = newId();
  const id = newId();
  const node = {
    id, name: String(name || 'Modelo 3D').slice(0, 120), kind: 'glb', assetId,
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    material: { color: '#ffffff', metalness: 0, roughness: 0.65 },
    materialOverrideEnabled: false
  };
  return {
    ...project,
    nodes: [...project.nodes, node],
    assets: { ...project.assets, [assetId]: {
      name: node.name + '.glb', mime: 'model/gltf-binary',
      data: bytesToBase64(buffer)
    }}
  };
}
export function validateProject(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Proyecto inválido.');
  if (project.format !== FORMAT || project.schemaVersion !== SCHEMA_VERSION)
    throw new Error('Formato o versión no compatible con el prototipo.');
  if (project.units !== 'm' || !Array.isArray(project.nodes) || project.nodes.length > 500)
    throw new Error('Escena inválida o unidades incompatibles.');
  if (!project.assets || typeof project.assets !== 'object' || Array.isArray(project.assets))
    throw new Error('Contenedor de activos inválido.');
  if (!project.render || !hex.test(project.render.background) ||
      !Number.isFinite(project.render.sunIntensity) || !Number.isFinite(project.render.ambientIntensity) ||
      project.render.sunIntensity < 0 || project.render.sunIntensity > 6 ||
      project.render.ambientIntensity < 0 || project.render.ambientIntensity > 4)
    throw new Error('Parámetros de iluminación inválidos.');
  const ids = new Set();
  for (const n of project.nodes) {
    if (!n || typeof n.id !== 'string' || ids.has(n.id) || n.id.length > 120 ||
        typeof n.name !== 'string' || n.name.length > 120 ||
        !['box', 'glb'].includes(n.kind)) throw new Error('Nodo inválido o repetido.');
    ids.add(n.id);
    if (!n.transform || !isVec(n.transform.position, 3) ||
      !isVec(n.transform.rotation, 3) || !isVec(n.transform.scale, 3) ||
      n.transform.scale.some(x => x === 0)) throw new Error('Transformación inválida.');
    if (n.materialOverrideEnabled != null && typeof n.materialOverrideEnabled !== 'boolean')
      throw new Error('Indicador de material inválido.');
    if (!n.material || !hex.test(n.material.color) ||
      !Number.isFinite(n.material.roughness) || !Number.isFinite(n.material.metalness) ||
      n.material.roughness < 0 || n.material.roughness > 1 ||
      n.material.metalness < 0 || n.material.metalness > 1)
      throw new Error('Material PBR inválido.');
    if (n.kind === 'glb' && (typeof n.assetId !== 'string' || !project.assets[n.assetId]))
      throw new Error('Referencia de modelo GLB inexistente.');
  }
  const entries = Object.entries(project.assets);
  if (entries.length > 500) throw new Error('Demasiados activos.');
  for (const [id, asset] of entries) {
    if (!id || !asset || asset.mime !== 'model/gltf-binary' ||
      typeof asset.data !== 'string' || asset.data.length > MAX_GLB_BYTES * 1.4)
      throw new Error('Activo incompatible.');
    try { validateGLB(base64ToBytes(asset.data)); }
    catch { throw new Error('Un activo GLB está dañado.'); }
  }
  return project;
}
export function parseProject(text) {
  if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES)
    throw new Error('El proyecto excede el límite temporal de 70 MB.');
  return validateProject(JSON.parse(text));
}
export function saveProject(project) {
  validateProject(project);
  return JSON.stringify(project, null, 2);
}
