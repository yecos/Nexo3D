// SPDX-License-Identifier: AGPL-3.0-only
// Transitional adapter: NEXO CAD v2 document -> official Hew JSON-RPC.
// Models are built by Hew, NOT by duplicating Hew's geometry engine.
import { validateProject } from './domain.js';
import { segmentPairs, distance } from './cad-domain.js';

const near = (x,y) => Math.abs(x-y)<1e-10;
const clean = n => near(n,0) ? 0 : Number(n.toFixed(10));
const point = a => a.map(clean);

/**
 * Map screen-plan CAD XY (meters, north = +Y) to Hew right-handed XY (+Z up).
 * Hew GLB output follows glTF Y-up. The original document remains authoritative.
 * No save/undo semantics are transferred to the source CAD document in this PoC.
 */
export function buildHewCommands(project, { includeHidden = false } = {}) {
  validateProject(project);
  const cmds = [];
  const objects = [];
  const warnings = [];
  let segmentNumber = 0;
  const ignored = project.nodes.length;
  if (ignored) warnings.push(`Se omiten ${ignored} nodos 3D del visor (cajas/GLB); este puente solo transforma trazos CAD levantados.`);
  for (const shape of project.cad.shapes) {
    const layer = project.cad.layers.find(l => l.id === shape.layerId);
    if (!layer || (!includeHidden && !layer.visible)) continue;
    if (!shape.extrusion) { warnings.push(`El trazo ${shape.name} no tiene levantamiento 3D y se omite.`); continue; }
    const { height, thickness } = shape.extrusion;
    for (const [a,b] of segmentPairs(shape)) {
      const length = distance(a,b);
      if (length <= 1e-6) continue;
      const deltaX = b[0]-a[0], deltaY = -(b[1]-a[1]);
      const angle = Math.atan2(deltaY,deltaX);
      const key = `segment${segmentNumber++}`;
      const sketch = `sketch${objects.length}`;
      const wall = `wall${objects.length}`;
      const ref = { $ref: `${wall}#/object_id` };
      const name = `${shape.name} · paño ${objects.filter(x=>x.cadShapeId===shape.id).length+1}`.slice(0,120);
      // Work in local coordinates. Hew rotates and positions watertight solids.
      cmds.push({
        method:'hew.sketch.draw_rect', as:sketch, params:{
          plane:{ground:true},
          corner_a:point([0,-thickness/2,0]),
          corner_b:point([length,thickness/2,0])
        }
      });
      cmds.push({
        method:'hew.solid.extrude', as:wall,
        params:{region:{$ref:`${sketch}#/region_id`},distance:height}
      });
      if (!near(angle,0)) cmds.push({
        method:'hew.entity.rotate',
        params:{ids:[ref], pivot:[0,0,0],axis:[0,0,1],angle:clean(angle)}
      });
      if (!near(a[0],0) || !near(a[1],0)) cmds.push({
        method:'hew.entity.move',
        params:{ids:[ref],translation:point([a[0],-a[1],0])}
      });
      cmds.push({method:'hew.entity.rename',params:{id:ref,name}});
      objects.push({
        cadShapeId:shape.id, cadLayerId:shape.layerId, cadName:shape.name,
        hewResultAlias:wall, length:clean(length),height,thickness,
        startCAD:point(a),endCAD:point(b),status:'planned'
      });
    }
  }
  if (objects.length>400) throw new Error('Demasiados muros para este puente experimental (máx. 400).');
  if (!objects.length) throw new Error('El proyecto no contiene trazos CAD levantados y visibles.');
  const script=[
    {jsonrpc:'2.0',id:1,method:'hew.meta.hello',params:{protocol:1,client:{name:'nexo3d-hew-adapter',version:'0.1.0'}}},
    {jsonrpc:'2.0',id:2,method:'hew.doc.new',params:{}},
    // Each segment is independent. Hew remains the only implementation of solids.
    {jsonrpc:'2.0',id:3,method:'hew.doc.transact',params:{label:'NEXO CAD → modelado Hew',commands:cmds}},
    {jsonrpc:'2.0',id:4,method:'hew.query.scene',params:{}}
  ];
  return {script, manifest:{
    version:1,sourceFormat:project.format,sourceSchema:project.schemaVersion,
    sourceProjectId:project.id, sourceProjectName:project.name,units:'m',
    coordinateMap:'NEXO CAD XY → Hew XYZ=(x,-y,0), Z vertical',
    objects,warnings,generatedBy:'nexo3d-hew-adapter'
  }};
}
