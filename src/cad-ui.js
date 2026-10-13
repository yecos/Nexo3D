// SPDX-License-Identifier: AGPL-3.0-only
// Interfaz CAD 2D (plano XY en metros). En 3D, Y del plano corresponde a -Z.
import { newId } from './domain.js';
import { createCadShape, rectanglePoints, liftShape, distance,
  segmentPairs, snapToGrid, endpointSnap, CAD_LIMIT } from './cad-domain.js';

const NS = 'http://www.w3.org/2000/svg';
const E = (tag, attrs = {}, text = '') => {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text) el.textContent = text;
  return el;
};
const escapeHTML = input => String(input).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const fmt = n => Number(n).toFixed(2);
const htmlNumber = (value, attrs = '') => '<input type="number" step="0.01" value="' +
  fmt(value) + '" ' + attrs + '>';

export class CADWorkspace {
  constructor(svg, controls, inspector, layerPanel, getProject, update, notify) {
    this.svg = svg;
    this.controls = controls;
    this.inspector = inspector;
    this.layerPanel = layerPanel;
    this.getProject = getProject;
    this.update = update;
    this.notify = notify;
    this.tool = 'select';
    this.selectedId = null;
    this.pending = [];
    this.cursor = null;
    this.scale = 58;
    this.center = [0, 0];
    this.panning = null;
    this.skipClick = false;
    this.visible = false;
    this.grid = true;
    this.ortho = false;
    this.install();
    this.resizeObserver = new ResizeObserver(() => { if (this.visible) this.drawSVG(); });
    this.resizeObserver.observe(this.svg);
  }
  get cad() { return this.getProject().cad; }
  setVisible(value) {
    this.visible = value;
    if (value) requestAnimationFrame(() => this.render());
  }
  size() { return { w: Math.max(1, this.svg.clientWidth), h: Math.max(1, this.svg.clientHeight) }; }
  toScreen(p) {
    const { w,h } = this.size();
    return [w / 2 + (p[0] - this.center[0]) * this.scale,
      h / 2 - (p[1] - this.center[1]) * this.scale];
  }
  toWorld(x, y) {
    const {w,h} = this.size();
    return [(x - w / 2) / this.scale + this.center[0],
      -(y - h / 2) / this.scale + this.center[1]];
  }
  snap(p, shift = false) {
    let result = this.grid ? snapToGrid(p) : p;
    // Endpoints override grid. Radius is measured in pixels.
    if (this.grid) result = endpointSnap(p, this.cad, 13 / this.scale) || result;
    if (shift && this.pending.length) {
      const anchor = this.pending.at(-1);
      result = Math.abs(result[0] - anchor[0]) >= Math.abs(result[1] - anchor[1])
        ? [result[0], anchor[1]] : [anchor[0], result[1]];
    }
    return result;
  }
  pointer(e) {
    const box = this.svg.getBoundingClientRect();
    return this.toWorld(e.clientX - box.left, e.clientY - box.top);
  }
  setTool(tool) {
    this.tool = tool;
    this.pending = [];
    this.cursor = null;
    this.controls.querySelectorAll('[data-cad-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cadTool === tool);
      btn.setAttribute('aria-pressed', String(btn.dataset.cadTool === tool));
    });
    this.notify(({select:'Seleccionar geometría',line:'Línea: marca dos puntos',
      rectangle:'Rectángulo: marca dos esquinas',
      polyline:'Polilínea: puntos consecutivos; Enter para terminar'})[tool]);
    this.render();
  }
  choose(id) {
    this.selectedId = id;
    this.render();
  }
  insertPoint(point) {
    const p = this.snap(point);
    if (this.tool === 'select') return;
    if (!this.pending.length) {
      this.pending = [p];
      this.notify('Primer punto: ' + fmt(p[0]) + ', ' + fmt(p[1]) + ' m');
      this.render(); return;
    }
    if (distance(p,this.pending.at(-1)) <= 1e-6) return;
    if (this.tool === 'polyline') {
      this.pending.push(p); this.render(); return;
    }
    const points = this.tool === 'rectangle' ? rectanglePoints(this.pending[0],p) : [this.pending[0],p];
    if (this.tool === 'rectangle' && 
        (Math.abs(points[0][0]-points[1][0]) < 1e-6 ||
         Math.abs(points[1][1]-points[2][1]) < 1e-6)) return;
    this.commitShape(this.tool, points);
  }
  finish() {
    if (this.tool === 'polyline' && this.pending.length >= 2) {
      this.commitShape('polyline',this.pending);
    } else {
      this.pending = [];
      this.cursor = null;
      this.render();
    }
  }
  commitShape(kind, points) {
    if (this.cad.shapes.length >= CAD_LIMIT) {
      this.notify('Se alcanzó el límite temporal de entidades CAD.'); return;
    }
    try {
      const newShape = createCadShape(kind,points,this.cad.activeLayerId,newId());
      this.update(p => p.cad.shapes.push(newShape), 'Entidad CAD creada: ' + newShape.name);
      this.selectedId = newShape.id;
      this.pending = [];
      this.cursor = null;
      this.render();
    } catch(err) { this.notify(err.message); }
  }
  deleteSelected() {
    const id = this.selectedId;
    if (!id) return;
    this.update(p => { p.cad.shapes = p.cad.shapes.filter(s => s.id !== id); },
      'Trazo CAD eliminado; su levantamiento 3D también se retiró.');
    this.selectedId = null;
    this.render();
  }
  install() {
    this.controls.addEventListener('click', e => {
      const btn = e.target.closest('[data-cad-tool]');
      if (btn) this.setTool(btn.dataset.cadTool);
      if (e.target.closest('#cad-finish')) this.finish();
      if (e.target.closest('#cad-point-go')) this.submitCoordinate();
    });
    this.controls.querySelector('#cad-snap').addEventListener('change', e => {
      this.grid = e.target.checked;
      this.render();
    });
    this.controls.querySelector('#cad-point').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.submitCoordinate(); }
    });
    this.svg.addEventListener('pointerdown', e => {
      if (e.button === 1 || e.button === 2 || e.altKey) {
        e.preventDefault();
        this.panning = { x:e.clientX, y:e.clientY, start:[...this.center], moved:false };
        this.svg.setPointerCapture(e.pointerId);
      }
    });
    this.svg.addEventListener('pointermove', e => {
      if (this.panning) {
        const dx = e.clientX - this.panning.x, dy = e.clientY - this.panning.y;
        if (Math.hypot(dx,dy) > 3) this.panning.moved = true;
        this.center = [this.panning.start[0] - dx / this.scale,
          this.panning.start[1] + dy / this.scale];
      } else {
        this.cursor = this.snap(this.pointer(e),e.shiftKey);
      }
      if (this.visible) this.drawSVG();
    });
    this.svg.addEventListener('pointerup', e => {
      if (this.panning) {
        this.skipClick = this.panning.moved && e.button === 0;
        this.panning = null;
        if (this.svg.hasPointerCapture(e.pointerId)) this.svg.releasePointerCapture(e.pointerId);
      }
    });
    this.svg.addEventListener('click', e => {
      if (this.skipClick) { this.skipClick = false; return; }
      if (this.tool === 'select') {
        const obj = e.target.closest('[data-cad-id]');
        this.choose(obj?.getAttribute('data-cad-id') || null);
      } else this.insertPoint(this.snap(this.pointer(e), e.shiftKey));
    });
    this.svg.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (!this.panning && this.tool === 'polyline') this.finish();
    });
    this.svg.addEventListener('wheel', e => {
      e.preventDefault();
      const r = this.svg.getBoundingClientRect();
      const x = e.clientX-r.left, y = e.clientY-r.top;
      const before = this.toWorld(x,y);
      this.scale = Math.min(280,Math.max(12,this.scale * (e.deltaY > 0 ? 0.9:1.1)));
      const after = this.toWorld(x,y);
      this.center[0] += before[0]-after[0];
      this.center[1] += before[1]-after[1];
      if (this.visible) this.drawSVG();
    },{passive:false});
    this.layerPanel.addEventListener('click', e => {
      if (e.target.closest('#cad-add-layer')) {
        const name = prompt('Nombre de la capa (máx. 60 caracteres):');
        if (!name?.trim()) return;
        if (this.cad.layers.length >= 50) return this.notify('Máximo 50 capas.');
        const id = newId();
        this.update(p => {
          p.cad.layers.push({id,name:name.trim().slice(0,60),color:'#8bc8e8',visible:true});
          p.cad.activeLayerId = id;
        },'Capa añadida.');
      }
      const chosen = e.target.closest('[data-cad-shape]');
      if (chosen) this.choose(chosen.dataset.cadShape);
    });
    this.layerPanel.addEventListener('change', e => {
      if (e.target.dataset.layerActive) {
        this.update(p=> {p.cad.activeLayerId=e.target.value;}, 'Capa activa actualizada.');
      }
      if (e.target.dataset.layerVisible) {
        const id=e.target.dataset.layerVisible;
        this.update(p=>{p.cad.layers.find(l=>l.id===id).visible=e.target.checked;},
          'Visibilidad de capa actualizada.');
      }
    });
    this.inspector.addEventListener('click', e => {
      const action=e.target.closest('[data-cad-action]')?.dataset.cadAction;
      if (!action) return;
      if (action==='delete') return this.deleteSelected();
      const id=this.selectedId;
      if (!id) return;
      if (action==='unlift') this.update(p=>{
        p.cad.shapes.find(s=>s.id===id).extrusion=null;
      },'Levantamiento 3D retirado; el trazo 2D se conserva.');
      if (action==='lift') {
        const height=Number(this.inspector.querySelector('[name=wall-height]').value);
        const thickness=Number(this.inspector.querySelector('[name=wall-thickness]').value);
        try {
          this.update(p=>{
            const index=p.cad.shapes.findIndex(s=>s.id===id);
            p.cad.shapes[index]=liftShape(p.cad.shapes[index],height,thickness);
          },'Muro 3D vinculado a la geometría 2D.');
        } catch(err) { this.notify(err.message); }
      }
    });
    this.inspector.addEventListener('change', e => {
      if (!e.target.matches('[data-point]')) return;
      const id=this.selectedId, value=Number(e.target.value);
      const pointIndex=Number(e.target.dataset.point), axis=Number(e.target.dataset.axis);
      if (!id || !Number.isFinite(value) || Math.abs(value)>100000) {
        this.notify('Coordenada fuera de rango.'); this.render(); return;
      }
      this.update(p=>{
        const shape=p.cad.shapes.find(s=>s.id===id);
        shape.points[pointIndex][axis]=value;
      },'Coordenada CAD editada. El muro vinculado se actualizará en 3D.');
    });
  }
  submitCoordinate() {
    if (this.tool==='select') { this.notify('Escoge Línea, Polilínea o Rectángulo.'); return; }
    const value=this.controls.querySelector('#cad-point').value.trim();
    const parts=value.split(/[,;\s]+/).filter(Boolean);
    if (parts.length!==2 || !parts.every(s=>/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(s))) {
      this.notify('Introduce dos coordenadas numéricas, por ejemplo: 4.5, 3'); return;
    }
    const p=parts.map(Number);
    if (p.some(n=>Math.abs(n)>100000)) return this.notify('Coordenadas fuera de rango.');
    const wasGrid=this.grid;
    this.grid=false; // entrada numérica exacta no debe redondearse a rejilla
    this.insertPoint(p);
    this.grid=wasGrid;
    this.controls.querySelector('#cad-point').value='';
  }
  handleKey(e) {
    if (e.key==='Escape') { this.pending=[]; this.cursor=null; this.setTool('select'); return true; }
    if (e.key==='Enter' && this.tool==='polyline') { this.finish(); return true; }
    if ((e.key==='Delete' || e.key==='Backspace') && this.tool==='select' && this.selectedId) {
      this.deleteSelected(); return true;
    }
    const tools={v:'select',l:'line',p:'polyline',r:'rectangle'};
    const tool=tools[e.key.toLowerCase()];
    if (tool && !e.ctrlKey && !e.metaKey && !e.altKey) {this.setTool(tool);return true;}
    return false;
  }
  render() {
    if (!this.visible) return;
    const cad=this.cad;
    if (this.selectedId && !cad.shapes.some(s=>s.id===this.selectedId)) this.selectedId=null;
    this.drawSVG();
    this.drawLayers();
    this.drawInspector();
  }
  drawSVG() {
    const {w,h}=this.size();
    this.svg.setAttribute('viewBox', '0 0 '+w+' '+h);
    this.svg.replaceChildren();
    this.svg.append(E('rect',{x:0,y:0,width:w,height:h,fill:'#151b20'}));
    const left=this.toWorld(0,h)[0],right=this.toWorld(w,0)[0];
    const bottom=this.toWorld(0,h)[1],top=this.toWorld(w,0)[1];
    const step=this.scale >= 28 ? 0.25 : 1;
    let count=0;
    for(let x=Math.ceil(left/step)*step;x<=right && count<400;x+=step,count++){
      const [sx]=this.toScreen([x,0]);
      const major=Math.abs(x-Math.round(x))<1e-7;
      this.svg.append(E('line',{x1:sx,y1:0,x2:sx,y2:h,stroke:major?'#37414a':'#263038','stroke-width':major?1.1:0.6}));
    }
    count=0;
    for(let y=Math.ceil(bottom/step)*step;y<=top && count<400;y+=step,count++){
      const [,sy]=this.toScreen([0,y]);
      const major=Math.abs(y-Math.round(y))<1e-7;
      this.svg.append(E('line',{x1:0,y1:sy,x2:w,y2:sy,stroke:major?'#37414a':'#263038','stroke-width':major?1.1:0.6}));
    }
    const [ox,oy]=this.toScreen([0,0]);
    this.svg.append(E('line',{x1:ox,y1:0,x2:ox,y2:h,stroke:'#5a8669','stroke-width':1.5}));
    this.svg.append(E('line',{x1:0,y1:oy,x2:w,y2:oy,stroke:'#a0776b','stroke-width':1.5}));
    for(const shape of this.cad.shapes) {
      const layer=this.cad.layers.find(l=>l.id===shape.layerId);
      if (!layer?.visible) continue;
      const selected=shape.id===this.selectedId;
      const color=selected?'#ffd28f':layer.color;
      const all=segmentPairs(shape);
      const group=E('g',{'data-cad-id':shape.id});
      for(const [a,b] of all) {
        const [x1,y1]=this.toScreen(a),[x2,y2]=this.toScreen(b);
        group.append(E('line',{x1,y1,x2,y2,stroke:color,'stroke-width':selected?3:2,
          'stroke-linecap':'round','data-cad-id':shape.id,'class':'cad-entity'}));
        if (this.scale>=32) {
          const [mx,my]=[(x1+x2)/2,(y1+y2)/2];
          group.append(E('text',{x:mx+4,y:my-8,fill:'#c4d1d0','font-size':11,
            'pointer-events':'none'},fmt(distance(a,b))+' m'));
        }
      }
      if(selected) for(const point of shape.points) {
        const [x,y]=this.toScreen(point);
        group.append(E('rect',{x:x-3.5,y:y-3.5,width:7,height:7,fill:'#ffd28f','pointer-events':'none'}));
      }
      this.svg.append(group);
    }
    if(this.pending.length) {
      const points=[...this.pending, ...(this.cursor?[this.cursor]:[])];
      for(let i=1;i<points.length;i++){
        const [x1,y1]=this.toScreen(points[i-1]),[x2,y2]=this.toScreen(points[i]);
        this.svg.append(E('line',{x1,y1,x2,y2,stroke:'#fae3ab','stroke-width':2,
          'stroke-dasharray':'6 5','pointer-events':'none'}));
      }
    }
    if(this.cursor) {
      const [x,y]=this.toScreen(this.cursor);
      this.svg.append(E('circle',{cx:x,cy:y,r:3.5,fill:'#fff1cf','pointer-events':'none'}));
      this.svg.append(E('text',{x:x+9,y:y-10,fill:'#ecf2f0','font-size':11,
        'pointer-events':'none'},fmt(this.cursor[0])+', '+fmt(this.cursor[1])));
    }
  }
  drawLayers() {
    const c=this.cad;
    this.layerPanel.innerHTML='<div class="panel-heading"><h2>Capas CAD</h2><button id="cad-add-layer">+ Capa</button></div>'+
      '<label class="caption">Capa activa <select data-layer-active>'+c.layers.map(l=>
        '<option value="'+escapeHTML(l.id)+'"'+(l.id===c.activeLayerId?' selected':'')+'>'+
        escapeHTML(l.name)+'</option>').join('')+'</select></label>'+
      c.layers.map(l=>'<label class="cad-layer"><input type="checkbox" data-layer-visible="'+
        escapeHTML(l.id)+'"'+(l.visible?' checked':'')+'><span style="color:'+l.color+
        '">■</span> '+escapeHTML(l.name)+'</label>').join('')+
      '<h2 style="margin-top:20px">Trazos ('+c.shapes.length+')</h2>'+
      c.shapes.map(s=>'<button class="scene-row'+(s.id===this.selectedId?' selected':'')+
        '" data-cad-shape="'+escapeHTML(s.id)+'">'+(s.extrusion?'▤ ':'— ')+
        escapeHTML(s.name)+' <small>'+s.points.length+' pt</small></button>').join('');
  }
  drawInspector() {
    const shape=this.cad.shapes.find(s=>s.id===this.selectedId);
    if (!shape) {
      this.inspector.innerHTML='<p class="small">Elige una herramienta, dibuja sobre el plano y selecciona un trazo para editarlo o convertirlo en muro.</p>'+
        '<p class="small">La escala del plano está en metros. La entrada X,Y admite valores exactos.</p>';
      return;
    }
    this.inspector.innerHTML='<p class="caption">'+escapeHTML(shape.name)+
      ' · '+shape.kind+' · '+fmt(segmentPairs(shape).reduce((n,[a,b])=>n+distance(a,b),0))+' m</p>'+
      '<div class="cad-coord-list"><h3>Vértices (metros)</h3>'+
      shape.points.map((p,i)=>'<div class="cad-vertex"><span>P'+(i+1)+'</span>'+
        '<label>X '+htmlNumber(p[0],'data-point="'+i+'" data-axis="0"')+'</label>'+
        '<label>Y '+htmlNumber(p[1],'data-point="'+i+'" data-axis="1"')+'</label></div>').join('')+
      '</div><div class="cad-lift"><h3>Levantar en 3D</h3>'+
      '<label>Altura muro (m) '+htmlNumber(shape.extrusion?.height??2.6,
        'name="wall-height" min="0.1" max="20"')+'</label>'+
      '<label>Espesor muro (m) '+htmlNumber(shape.extrusion?.thickness??0.15,
        'name="wall-thickness" min="0.02" max="3"')+'</label>'+
      '<button class="primary" data-cad-action="lift">Levantar / actualizar muro</button>'+
      (shape.extrusion?'<button data-cad-action="unlift">Quitar muro 3D</button>':'')+
      '<p class="small">El muro queda vinculado al trazo. Al editar vértices, cambia también en Modelado y Render.</p>'+
      '</div><button class="danger" data-cad-action="delete">Eliminar trazo</button>';
  }
}
