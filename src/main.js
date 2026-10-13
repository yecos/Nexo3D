// SPDX-License-Identifier: AGPL-3.0-only
import './style.css';
import {
  makeProject, makeBox, cloneForEdit, newId, addGLB, parseProject,
  saveProject, validateGLB, MAX_PROJECT_BYTES
} from './domain.js';
import { Viewer } from './viewer.js';
import { CADWorkspace } from './cad-ui.js';
import { validateCad } from './cad-domain.js';
import { HewWorkspace } from './hew-workspace.js';

const el = id => document.getElementById(id);
const escaped = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const formatter = num => Number(num).toFixed(2);
let project = makeProject();
let selectedId = project.nodes[0].id;
let workspace = 'cad';
const undo = [], redo = [];
const MAX_UNDO = 40;

function status(text, isError = false) {
  el('status').textContent = text;
  el('status').classList.toggle('error', isError);
}
function remember() {
  undo.push(cloneForEdit(project));
  if (undo.length > MAX_UNDO) undo.shift();
  redo.length = 0;
}
function changed(next, message) {
  project = next;
  refresh();
  if (message) status(message);
}
function update(mutator, message) {
  const next = cloneForEdit(project);
  try {
    mutator(next);
    validateCad(next.cad);
  } catch (error) {
    status('No se aplicó el cambio: ' + error.message, true);
    return false;
  }
  remember();
  changed(next, message);
  return true;
}
function nodeById() {
  return project.nodes.find(node => node.id === selectedId);
}
const viewer = new Viewer(el('viewport'), id => {
  selectedId = id;
  refresh();
}, (id, group) => {
  const current = project.nodes.find(n => n.id === id);
  if (!current) return;
  const position = group.position.toArray();
  const rotation = [group.rotation.x, group.rotation.y, group.rotation.z];
  const scale = group.scale.toArray();
  if (JSON.stringify(current.transform) === JSON.stringify({ position, rotation, scale })) return;
  update(p => {
    const node = p.nodes.find(n => n.id === id);
    node.transform = { position, rotation, scale };
  }, 'Transformación registrada.');
});
viewer.onLoadError = e => status('No se pudo interpretar el modelo: ' + e.message, true);
const hew = new HewWorkspace(el('hew-frame'), () => project, buffer => {
  try {
    validateGLB(buffer);
    const next = addGLB(project, 'Hew · Render actualizado', buffer);
    const removed = new Set(project.nodes.filter(node => node.source === 'hew-interactive').map(n => n.id));
    next.nodes = next.nodes.filter(node => !removed.has(node.id));
    for (const old of project.nodes.filter(node => removed.has(node.id))) delete next.assets[old.assetId];
    next.nodes.at(-1).source = 'hew-interactive';
    remember();
    changed(next, 'Render actualizado desde las herramientas de Hew. Guarda el proyecto NEXO.');
  } catch (error) { status('Error de GLB desde Hew: ' + error.message, true); }
}, (text, error = false) => {
  el('hew-state').textContent = text;
  status(text, error);
});
const cad = new CADWorkspace(
  el('cad-surface'), el('cad-tools'), el('cad-controls'), el('cad-layers'),
  () => project, update, status
);

function renderList() {
  const list = el('scene-list');
  list.replaceChildren();
  for (const node of project.nodes) {
    const btn = document.createElement('button');
    btn.className = 'scene-row' + (node.id === selectedId ? ' selected' : '');
    btn.dataset.id = node.id;
    btn.textContent = (node.kind === 'box' ? '◻ ' : '⬡ ') + node.name;
    btn.title = node.name;
    list.append(btn);
  }
  const walls = project.cad.shapes.filter(shape => shape.extrusion).length;
  el('object-count').textContent = String(project.nodes.length) + ' objeto(s) · ' +
    String(walls) + ' trazo(s) levantado(s)';
}

function renderInspector() {
  if (workspace === 'cad') return;
  const n = nodeById();
  const inspector = el('inspector');
  if (!n) {
    el('inspector-title').textContent = 'Propiedades';
    inspector.innerHTML = '<p class="small">Selecciona un objeto para editar sus propiedades.</p>';
    return;
  }
  el('inspector-title').textContent = n.name;
  const input = (kind, axis, value, min, max, step) =>
    '<label class="numeric"><span>' + axis.toUpperCase() + '</span><input type="number" data-field="' +
    kind + '" data-axis="' + axis + '" value="' + formatter(value) +
    '" min="' + min + '" max="' + max + '" step="' + step + '"></label>';
  inspector.innerHTML =
    '<div class="field"><span class="caption">Posición (metros)</span><div class="vec">' +
    n.transform.position.map((v, i) => input('position', 'xyz'[i], v, -100000, 100000, '0.1')).join('') +
    '</div></div><div class="field"><span class="caption">Rotación (grados)</span><div class="vec">' +
    n.transform.rotation.map((v, i) => input('rotation', 'xyz'[i], v * 180 / Math.PI, -36000, 36000, '1')).join('') +
    '</div></div><div class="field"><span class="caption">Escala</span><div class="vec">' +
    n.transform.scale.map((v, i) => input('scale', 'xyz'[i], v, 0.001, 10000, '0.1')).join('') +
    '</div></div><div class="field render-field"><span class="caption">Material PBR</span>' +
    '<label>Color <input type="color" data-material="color" value="' + escaped(n.material.color) + '"></label>' +
    '<label>Rugosidad <input type="range" data-material="roughness" min="0" max="1" step="0.01" value="' +
      n.material.roughness + '"></label>' +
    '<label>Metalizado <input type="range" data-material="metalness" min="0" max="1" step="0.01" value="' +
      n.material.metalness + '"></label></div>' +
    '<div class="tool-row"><button id="tool-move">Mover</button><button id="tool-rotate">Rotar</button><button id="tool-scale">Escalar</button></div>';
}

function refresh() {
  const isCAD = workspace === 'cad';
  const isHew = workspace === 'model';
  el('app').classList.toggle('hew-layout-active', isHew);
  el('hew-model-wrap').hidden = !isHew;
  el('cad-surface-wrap').hidden = !isCAD;
  el('viewport').hidden = workspace !== 'render';
  el('viewport-overlay').hidden = workspace !== 'render';
  el('viewport-hint').hidden = workspace !== 'render';
  el('cad-layers').hidden = !isCAD;
  el('scene-panel').hidden = isCAD || isHew;
  el('prototype-note').hidden = isHew;
  el('model-inspector').hidden = isCAD || isHew;
  el('cad-inspector').hidden = !isCAD;
  cad.setVisible(isCAD);
  renderList();
  renderInspector();
  el('render-settings').hidden = workspace !== 'render';
  for (const button of document.querySelectorAll('[data-workspace]')) {
    const active = button.dataset.workspace === workspace;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  el('workspace-label').textContent = workspace === 'cad' ? 'Dibujo técnico · metros · capas'
    : workspace === 'render' ? 'Materiales e iluminación en tiempo real'
    : 'Transformaciones y geometría';
  el('sun-light').value = String(project.render.sunIntensity);
  el('ambient-light').value = String(project.render.ambientIntensity);
  el('background-color').value = project.render.background;
  viewer.setSelection(selectedId);
  void viewer.sync(project);
  if (workspace === 'render') viewer.resize();
  if (isHew) void hew.init().then(() => {
    el('hew-missing').hidden = true;
  }).catch(() => {
    el('hew-missing').hidden = false;
    el('hew-frame').hidden = true;
  });
}
el('scene-list').addEventListener('click', event => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  selectedId = button.dataset.id;
  refresh();
});
document.querySelectorAll('[data-workspace]').forEach(button => {
  button.addEventListener('click', () => {
    workspace = button.dataset.workspace;
    refresh();
    status('Espacio ' + ({cad:'CAD 2D',model:'Modelado Hew',render:'Render'}[workspace]) +
      ' activo. Para reflejar cambios de Hew en Render pulsa Actualizar Render.');
  });
});
el('hew-send-cad').addEventListener('click', async () => {
  const button = el('hew-send-cad');
  if (hew.generatedIds.length && !confirm('Reemplazar los muros anteriores de CAD en Hew. Los retoques directos realizados en esos muros podrían perderse. ¿Continuar?')) return;
  button.disabled = true;
  try { await hew.syncCad(); }
  catch(error){ status('Hew rechazó el plano: ' + error.message,true); }
  finally { button.disabled = false; }
});
el('hew-to-render').addEventListener('click', async () => {
  const button = el('hew-to-render');
  button.disabled = true;
  try { await hew.updateRender(); }
  catch(error){ status('No se pudo actualizar Render: ' + error.message,true); }
  finally { button.disabled = false; }
});
el('inspector').addEventListener('change', event => {
  const input = event.target;
  if (!selectedId) return;
  if (input.dataset.field) {
    const kind = input.dataset.field;
    const index = 'xyz'.indexOf(input.dataset.axis);
    let value = Number(input.value);
    if (!Number.isFinite(value) || (kind === 'scale' && value === 0)) return;
    if (kind === 'rotation') value *= Math.PI / 180;
    const id = selectedId;
    update(p => { p.nodes.find(n => n.id === id).transform[kind][index] = value; },
      'Transformación actualizada.');
  } else if (input.dataset.material) {
    const id = selectedId, field = input.dataset.material;
    const value = field === 'color' ? input.value : Number(input.value);
    update(p => {
      const node = p.nodes.find(n => n.id === id);
      node.material[field] = value;
      node.materialOverrideEnabled = true;
    },
      'Material actualizado.');
  } else if (['tool-move', 'tool-rotate', 'tool-scale'].includes(input.id)) {
    viewer.controls.setMode(input.id.replace('tool-', '') === 'rotate' ? 'rotate' :
      input.id === 'tool-scale' ? 'scale' : 'translate');
  }
});
el('inspector').addEventListener('click', event => {
  if (event.target.id === 'tool-move') viewer.controls.setMode('translate');
  if (event.target.id === 'tool-rotate') viewer.controls.setMode('rotate');
  if (event.target.id === 'tool-scale') viewer.controls.setMode('scale');
});
el('add-box').addEventListener('click', () => {
  const n = makeBox('Volumen ' + String(project.nodes.length + 1));
  n.id = newId();
  update(p => { p.nodes.push(n); }, 'Volumen añadido.');
  selectedId = n.id; refresh();
});
el('import-glb').addEventListener('click', () => el('model-file').click());
el('model-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    validateGLB(buffer);
    const next = addGLB(project, file.name.replace(/\.glb$/i, ''), buffer);
    remember();
    changed(next, 'GLB incorporado localmente: ' + file.name);
    selectedId = next.nodes.at(-1).id; refresh();
  } catch (e) { status(e.message, true); }
  finally { event.target.value = ''; }
});
el('new-project').addEventListener('click', () => {
  if (!confirm('¿Crear un proyecto nuevo? Guarda el actual antes de continuar.')) return;
  project = makeProject(); selectedId = project.nodes[0].id;
  undo.length = 0; redo.length = 0;
  hew.generatedIds = [];
  el('hew-frame').src && (el('hew-frame').src = '/hew/index.html');
  refresh(); status('Nuevo proyecto local preparado.');
});
el('open-project').addEventListener('click', () => el('project-file').click());
el('project-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > MAX_PROJECT_BYTES) throw new Error('El proyecto excede 70 MB.');
    const parsed = parseProject(await file.text());
    project = parsed; selectedId = project.nodes[0]?.id ?? null;
    undo.length = 0; redo.length = 0;
    hew.generatedIds = [];
    if (hew.ready) el('hew-frame').src = '/hew/index.html';
    refresh(); status('Proyecto abierto desde disco, sin nube.');
  } catch (e) { status('No se pudo abrir el archivo: ' + e.message, true); }
  finally { event.target.value = ''; }
});
el('save-project').addEventListener('click', () => {
  try {
    const content = saveProject(project);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'nexo3d-proyecto.nexo3d.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    status('Proyecto descargado. Conserva el archivo en un lugar seguro.');
  } catch (e) { status('Error al guardar: ' + e.message, true); }
});
for (const [id, field] of [['sun-light', 'sunIntensity'], ['ambient-light', 'ambientIntensity'],
  ['background-color', 'background']]) {
  el(id).addEventListener('change', event => {
    const value = field === 'background' ? event.target.value : Number(event.target.value);
    update(p => { p.render[field] = value; }, 'Iluminación actualizada.');
  });
}
document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA'].includes(tag)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    const current = e.shiftKey ? redo.pop() : undo.pop();
    if (!current) return;
    (e.shiftKey ? undo : redo).push(cloneForEdit(project));
    changed(current, e.shiftKey ? 'Rehacer.' : 'Deshacer.');
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    const current = redo.pop(); if (!current) return;
    undo.push(cloneForEdit(project)); changed(current, 'Rehacer.');
  }
  if (workspace === 'model') return; // Hew owns its keyboard shortcuts in its iframe.
  if (workspace === 'cad') {
    if (cad.handleKey(e)) e.preventDefault();
    return;
  }
  if (e.key.toLowerCase() === 'g') viewer.controls.setMode('translate');
  if (e.key.toLowerCase() === 'r') viewer.controls.setMode('rotate');
  if (e.key.toLowerCase() === 's') viewer.controls.setMode('scale');
});
refresh();
status('CAD 2D listo. Dibuja líneas y levántalas como muros para verlas en Modelado y Render.');
