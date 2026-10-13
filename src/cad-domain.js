// SPDX-License-Identifier: AGPL-3.0-only
// Geometría CAD 2D editable, independiente del visor y de la plataforma.
export const CAD_LIMIT = 500;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const color = s => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
export const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const segmentPairs = shape => {
  const pairs = [];
  for (let i = 1; i < shape.points.length; i++) pairs.push([shape.points[i - 1], shape.points[i]]);
  if (shape.kind === 'rectangle') pairs.push([shape.points.at(-1), shape.points[0]]);
  return pairs.filter(([a,b]) => distance(a,b) > 1e-6);
};
export function defaultCad() {
  return {
    layers: [{ id: 'layer-architecture', name: 'Arquitectura', color: '#d6c5a7', visible: true },
      { id: 'layer-references', name: 'Referencias', color: '#7eabb9', visible: true }],
    activeLayerId: 'layer-architecture', shapes: []
  };
}
export function cloneCad(cad) {
  return {
    ...cad, layers: cad.layers.map(l => ({ ...l })),
    shapes: cad.shapes.map(s => ({
      ...s, points: s.points.map(p => [...p]),
      extrusion: s.extrusion ? { ...s.extrusion } : null
    }))
  };
}
export function rectanglePoints(a, b) {
  return [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]];
}
export function createCadShape(kind, points, layerId, id, name = '') {
  const shape = { id, kind, name: name || {
    line: 'Línea', polyline: 'Polilínea', rectangle: 'Rectángulo'
  }[kind] || 'Trazo', layerId, points: points.map(p => [...p]), extrusion: null };
  validateCad({ layers: [{ id: layerId, name: 'Capa', color: '#ffffff', visible: true }],
    activeLayerId: layerId, shapes: [shape] });
  return shape;
}
export function liftShape(shape, height = 2.6, thickness = 0.15) {
  if (!finite(height) || height < 0.1 || height > 20 ||
      !finite(thickness) || thickness < 0.02 || thickness > 3)
    throw new Error('Altura o espesor fuera de rango.');
  return { ...shape, extrusion: { height, thickness } };
}
export function wallSegments(shape) {
  if (!shape.extrusion) return [];
  const { height, thickness } = shape.extrusion;
  return segmentPairs(shape).map(([a,b]) => ({
    center: [(a[0] + b[0]) / 2, height / 2, -(a[1] + b[1]) / 2],
    size: [distance(a,b), height, thickness],
    rotationY: Math.atan2(b[1] - a[1], b[0] - a[0])
  }));
}
export function validateCad(cad) {
  if (!cad || !Array.isArray(cad.layers) || cad.layers.length < 1 ||
      cad.layers.length > 50 || !Array.isArray(cad.shapes) ||
      cad.shapes.length > CAD_LIMIT) throw new Error('Documento CAD inválido.');
  const layerIds = new Set();
  for (const l of cad.layers) {
    if (!l || typeof l.id !== 'string' || !l.id || l.id.length > 120 ||
      layerIds.has(l.id) || typeof l.name !== 'string' || l.name.length > 120 ||
      !color(l.color) || typeof l.visible !== 'boolean') throw new Error('Capa CAD inválida.');
    layerIds.add(l.id);
  }
  if (!layerIds.has(cad.activeLayerId)) throw new Error('Capa activa inexistente.');
  const ids = new Set();
  for (const s of cad.shapes) {
    if (!s || typeof s.id !== 'string' || !s.id || s.id.length > 120 ||
      ids.has(s.id) || !layerIds.has(s.layerId) || typeof s.name !== 'string' ||
      s.name.length > 120 || !['line','polyline','rectangle'].includes(s.kind) ||
      !Array.isArray(s.points) || s.points.length < 2 || s.points.length > 200 ||
      (s.kind === 'line' && s.points.length !== 2) ||
      (s.kind === 'rectangle' && s.points.length !== 4) ||
      s.points.some(p => !Array.isArray(p) || p.length !== 2 ||
        p.some(v => !finite(v) || Math.abs(v) > 100000)) ||
      segmentPairs(s).length < 1) throw new Error('Trazo CAD inválido.');
    if (s.extrusion != null) {
      if (!finite(s.extrusion.height) || !finite(s.extrusion.thickness) ||
        s.extrusion.height < 0.1 || s.extrusion.height > 20 ||
        s.extrusion.thickness < 0.02 || s.extrusion.thickness > 3)
        throw new Error('Extrusión CAD inválida.');
    }
    ids.add(s.id);
  }
  return cad;
}
export function snapToGrid(point, increment = 0.25) {
  return point.map(value => Math.round(value / increment) * increment);
}
export function endpointSnap(point, cad, radius = 0.15) {
  let best = null, bestDistance = radius;
  for (const s of cad.shapes) {
    if (cad.layers.find(l => l.id === s.layerId)?.visible === false) continue;
    for (const p of s.points) {
      const d = distance(point,p);
      if (d < bestDistance) { best = p; bestDistance = d; }
    }
  }
  return best ? [...best] : null;
}
