// SPDX-License-Identifier: AGPL-3.0-only
// Bundled OFFLINE with Vite+three. Reads model revisions from localhost only.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const status = document.getElementById('state');
const cadLabel = document.getElementById('cad');
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#202830');
const camera = new THREE.PerspectiveCamera(50, 1, .02, 10000);
camera.position.set(8, 6, 10);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 1, 0);
const sun = new THREE.DirectionalLight('#fff0dc', 3);
sun.position.set(12, 20, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left=-35;sun.shadow.camera.right=35;
sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;
scene.add(new THREE.HemisphereLight('#e5eefa','#6c6259',1.25),sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(500,500),
  new THREE.MeshStandardMaterial({color:'#686963',roughness:1}));
ground.rotation.x = -Math.PI/2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground,new THREE.GridHelper(100,100,'#898783','#525759'));
let currentRoot = null;
let appliedHash = '';
let inFlight = false;
let hasCameraFit = false;
const gltf = new GLTFLoader();

function dispose(root) {
  root.traverse(obj => {
    if(!obj.isMesh)return;
    obj.geometry?.dispose();
    const mats=Array.isArray(obj.material)?obj.material:[obj.material];
    for (const m of mats.filter(Boolean)) {
      for(const val of Object.values(m)) if(val?.isTexture)val.dispose();
      m.dispose();
    }
  });
}
function fitCamera(root) {
  const bounds=new THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())return;
  const center=bounds.getCenter(new THREE.Vector3());
  const size=bounds.getSize(new THREE.Vector3());
  const span=Math.max(size.x,size.y,size.z,1);
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(span,span*.8,span*1.35));
  camera.near=Math.max(.005,span/2000);
  camera.far=Math.max(100,span*50);
  camera.updateProjectionMatrix();
  controls.update();
}
async function sync() {
  if (inFlight) return;
  inFlight=true;
  try {
    const reply=await fetch('/v1/state',{cache:'no-store'});
    if(!reply.ok)throw Error('NEXO Bridge no responde');
    const state=await reply.json();
    cadLabel.textContent = state.cad
      ? `CAD · revisión ${state.cad.revision} · ${state.cad.name}`
      : 'CAD: esperando un DXF guardado';
    const model=state.model;
    if(!model){status.textContent='Esperando geometría 3D desde IngeTrazo…';return;}
    if(model.sha256 === appliedHash)return;
    status.textContent='Cargando nueva revisión del modelo…';
    const raw=await fetch(`${model.url}?rev=${model.revision}`,{cache:'no-store'});
    if(!raw.ok)throw Error('No se pudo leer el GLB completo.');
    const bytes=await raw.arrayBuffer();
    const incoming=await gltf.parseAsync(bytes,'');
    if(currentRoot){scene.remove(currentRoot);dispose(currentRoot);}
    currentRoot=incoming.scene;
    currentRoot.traverse(obj => {if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
    scene.add(currentRoot);
    if(!hasCameraFit){fitCamera(currentRoot);hasCameraFit=true;}
    appliedHash=model.sha256;
    status.textContent=`Modelo 3D · revisión ${model.revision} · sincronizado`;
  } catch(err) { status.textContent=`Sin conexión o exportación: ${err.message}`; }
  finally {inFlight=false;}
}
function resize() {
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width||!height)return;
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();
let running=true;
function animate() {
  if(!running)return;
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene,camera);
}
animate();
const interval=setInterval(sync,1000);
void sync();
window.addEventListener('pagehide',()=>{running=false;clearInterval(interval);});
