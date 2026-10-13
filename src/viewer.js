// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { base64ToBytes } from './domain.js';

export class Viewer {
  constructor(container, onSelect, onTransform) {
    this.container = container;
    this.onSelect = onSelect;
    this.onTransform = onTransform;
    this.nodes = new Map();
    this.pending = new Set();
    this.requestNumber = 0;
    this.selectedId = null;
    this.dragging = false;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1b2327');
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.02, 4000);
    this.camera.position.set(6, 5, 8);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.append(this.renderer.domElement);
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.target.set(0, 0.5, 0);
    this.ambient = new THREE.HemisphereLight(0xeaf1ff, 0x776c5d, 1.2);
    this.sun = new THREE.DirectionalLight(0xfff1d8, 2);
    this.sun.position.set(7, 12, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -30; this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30; this.sun.shadow.camera.bottom = -30;
    this.scene.add(this.ambient, this.sun, this.sun.target);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: '#323539', roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.005;
    floor.receiveShadow = true;
    floor.name = 'Fondo no exportable';
    this.scene.add(floor);
    this.grid = new THREE.GridHelper(100, 100, '#7a746d', '#41484a');
    this.grid.position.y = 0.002;
    this.scene.add(this.grid);
    this.gltf = new GLTFLoader();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.controls = new TransformControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getHelper());
    this.controls.setSize(0.8);
    this.controls.addEventListener('dragging-changed', e => {
      this.dragging = e.value;
      this.orbit.enabled = !e.value;
    });
    this.controls.addEventListener('mouseUp', () => {
      if (this.selectedId && this.nodes.has(this.selectedId))
        this.onTransform(this.selectedId, this.nodes.get(this.selectedId).group);
    });
    this.dragStart = null;
    this.renderer.domElement.addEventListener('pointerdown', e => {
      this.dragStart = { x: e.clientX, y: e.clientY };
    });
    this.renderer.domElement.addEventListener('pointerup', e => this.pick(e));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    const tick = () => {
      this.orbit.update();
      this.renderer.render(this.scene, this.camera);
      this.animationId = requestAnimationFrame(tick);
    };
    tick();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  pick(e) {
    if (e.button !== 0 || this.dragging || !this.dragStart ||
        Math.hypot(this.dragStart.x - e.clientX, this.dragStart.y - e.clientY) > 4) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((e.clientX - rect.left) / rect.width * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = [...this.nodes.values()].map(v => v.group);
    const intersections = this.raycaster.intersectObjects(targets, true);
    if (intersections.length === 0) return;
    let item = intersections[0].object;
    while (item && !item.userData.nodeId) item = item.parent;
    if (item?.userData.nodeId) this.onSelect(item.userData.nodeId);
  }

  applyMaterial(group, material) {
    group.traverse(obj => {
      if (!obj.isMesh) return;
      if (!obj.userData.nexoMaterialCloned) {
        obj.material = Array.isArray(obj.material) ? obj.material.map(m => m.clone()) : obj.material.clone();
        obj.userData.nexoMaterialCloned = true;
      }
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of materials) {
        if (m.color) m.color.set(material.color);
        if ('metalness' in m) m.metalness = material.metalness;
        if ('roughness' in m) m.roughness = material.roughness;
        m.needsUpdate = true;
      }
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
  }

  async makeGroup(node, project) {
    const group = new THREE.Group();
    group.userData.nodeId = node.id;
    group.name = node.name;
    if (node.kind === 'box') {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial());
      group.add(mesh);
    } else {
      const asset = project.assets[node.assetId];
      const bytes = base64ToBytes(asset.data);
      const gltf = await new Promise((resolve, reject) => this.gltf.parse(bytes, '', resolve, reject));
      group.add(gltf.scene);
    }
    this.applyMaterial(group, node.material);
    return group;
  }

  setSelection(id) {
    this.selectedId = id;
    const ref = this.nodes.get(id);
    if (ref) this.controls.attach(ref.group);
    else this.controls.detach();
  }

  async sync(project) {
    const rev = ++this.requestNumber;
    this.scene.background.set(project.render.background);
    this.ambient.intensity = project.render.ambientIntensity;
    this.sun.intensity = project.render.sunIntensity;
    const known = new Set(project.nodes.map(n => n.id));
    for (const [id, entry] of this.nodes) {
      if (known.has(id)) continue;
      if (id === this.selectedId) this.controls.detach();
      this.scene.remove(entry.group);
      this.nodes.delete(id);
    }
    for (const node of project.nodes) {
      if (!this.nodes.has(node.id) && !this.pending.has(node.id)) {
        this.pending.add(node.id);
        try {
          const group = await this.makeGroup(node, project);
          if (rev === this.requestNumber && project.nodes.some(n => n.id === node.id)) {
            this.nodes.set(node.id, { group });
            this.scene.add(group);
          }
        } catch (error) {
          if (rev === this.requestNumber) console.error('Error de malla:', error);
          this.onLoadError?.(error);
        } finally { this.pending.delete(node.id); }
      }
      const ref = this.nodes.get(node.id);
      if (!ref) continue;
      ref.group.position.fromArray(node.transform.position);
      ref.group.rotation.fromArray([...node.transform.rotation, 'XYZ']);
      ref.group.scale.fromArray(node.transform.scale);
      this.applyMaterial(ref.group, node.material);
    }
    this.setSelection(this.selectedId);
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver.disconnect();
    this.orbit.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
