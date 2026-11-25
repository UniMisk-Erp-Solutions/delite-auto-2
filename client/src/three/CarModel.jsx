import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import {
  CAR_LENGTH,
  MODEL,
  MATERIAL_OVERRIDES,
  VERTEX_COLOR_MATERIALS,
  LEATHER_MATERIALS,
  DOUBLE_SIDED_MATERIALS,
} from '../config.js';
import { applyLeather } from './leather.js';
import { addScreen } from './screen.js';
import { addPlates } from './plates.js';
import { setupXray } from './xray.js';
import { store } from '../store.js';
import { getManifest } from '../modelSource.js';
import PlaceholderCar from './PlaceholderCar.jsx';

// ---------------------------------------------------------------- loading ----

async function loadGLTF(model, onProgress) {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(model.url, onProgress);
  draco.dispose();
  return gltf.scene;
}

// Repair texture paths in an MTL: strip folders / Windows paths and point each map at
// the real URL the server found (matched by file name).
function fixMtl(text, textures) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^(\s*(?:map_\w+|bump|disp|decal|refl)\s+)(.+)$/i);
      if (!m) return line;
      const file = m[2].trim().replace(/^(?:-\w+(?:\s+-?[\d.]+)*\s+)+/, '');
      const base = file.split(/[\\/]/).pop().toLowerCase();
      return textures[base] ? m[1] + textures[base] : line;
    })
    .join('\n');
}

async function loadOBJ(model, textures, onProgress) {
  let materials = null;
  if (model.mtl) {
    const text = fixMtl(await (await fetch(model.mtl)).text(), textures);
    materials = new MTLLoader().parse(text, '');
    materials.preload();
  }
  const loader = new OBJLoader();
  if (materials) loader.setMaterials(materials);
  return loader.loadAsync(model.url, onProgress);
}

// OBJ/MTL gives Phong materials that ignore the studio reflections. Upgrade them to
// PBR so the paint and glass look right, and tidy sidedness for the interior view.
function upgradeMaterial(m) {
  let out = m;
  const name = m.name || '';

  // Per-material overrides from config.js (colour, roughness, metalness, glass ...)
  const ov = MATERIAL_OVERRIDES[name];

  // Glass exported with KHR transmission renders the whole car twice (slow). Replace it
  // with a plain tinted translucent material that looks the same and costs nothing.
  if (m.transmission > 0 || ov?.glass) {
    m.transmission = 0;
    m.alphaTest = 0;
    m.transparent = true;
    m.opacity = 0.32;
    m.color?.set('#0b1118');
    m.roughness = 0.04;
    m.metalness = 0.7;
    m.depthWrite = false;
  }

  // Materials whose texture/colour did not survive the export arrive as pure white with
  // no map. Show them as dark trim instead of glaring white until you fix them in
  // Blender (or set a colour for them in MATERIAL_OVERRIDES).
  const useVertexColors = VERTEX_COLOR_MATERIALS.includes(name);
  m.vertexColors = useVertexColors;
  const plainWhite =
    !useVertexColors && !m.map && !m.emissiveMap && !m.transparent && m.color &&
    m.color.r > 0.97 && m.color.g > 0.97 && m.color.b > 0.97;
  if (plainWhite && !ov?.keepWhite) m.color.set('#17181b');

  if (ov) {
    if (ov.color) m.color?.set(ov.color);
    if (ov.roughness != null) m.roughness = ov.roughness;
    if (ov.metalness != null) m.metalness = ov.metalness;
  }
  if (LEATHER_MATERIALS[name] && m.isMeshPhysicalMaterial) applyLeather(m, LEATHER_MATERIALS[name]);
  if (import.meta.env.DEV) (window.__mats ||= new Set()).add(name);
  if (m.isMeshPhongMaterial || m.isMeshLambertMaterial) {
    const name = (m.name || '').toLowerCase();
    const isGlass = /glass|window|windshield|windscreen/.test(name);
    const spec = m.specular ? (m.specular.r + m.specular.g + m.specular.b) / 3 : 0.2;
    out = new THREE.MeshPhysicalMaterial({
      name: m.name,
      color: m.color,
      map: m.map,
      normalMap: m.normalMap,
      emissive: m.emissive,
      emissiveMap: m.emissiveMap,
      opacity: m.opacity,
      transparent: m.transparent,
      alphaMap: m.alphaMap,
      roughness: THREE.MathUtils.clamp(Math.sqrt(2 / ((m.shininess ?? 30) + 2)), 0.08, 1),
      metalness: THREE.MathUtils.clamp(spec - 0.2, 0, 0.7),
    });
    if (isGlass) {
      out.color.set('#0b1118');
      out.roughness = 0.05;
      out.metalness = 0.6;
      out.transparent = true;
      out.opacity = Math.min(out.opacity, 0.45);
    } else if (/paint|body|car|shell/.test(name)) {
      out.clearcoat = 1;
      out.clearcoatRoughness = 0.1;
    }
    m.dispose();
  }
  if (MODEL.forceFrontSide && !out.transparent) out.side = THREE.FrontSide;
  if (DOUBLE_SIDED_MATERIALS.includes(name)) out.side = THREE.DoubleSide;
  if (out.transparent) out.depthWrite = false;
  if (out.map) out.map.colorSpace = THREE.SRGBColorSpace;
  for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
    if (out[k]) out[k].anisotropy = 8;
  }
  out.needsUpdate = true;
  return out;
}

// Orient, scale and centre any model: length along X, front toward +X, wheels on y=0.
async function prepare(root) {
  // drop stray objects (floor plates, duplicate copies of the car) before measuring
  const kids = [...root.children];
  let keep = MODEL.keepOnly.length ? kids.filter((k) => MODEL.keepOnly.includes(k.name)) : kids;
  if (!keep.length) keep = kids;
  kids.forEach((k) => {
    if (!keep.includes(k) || MODEL.hide.test(k.name)) root.remove(k);
  });

  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(upgradeMaterial) : upgradeMaterial(o.material);
  });

  addScreen(root); // real UI on the dashboard display
  addPlates(root); // brand name on the front and rear number plates
  await setupXray(root); // top-view section: only the body shows, as X-ray glass, carpet solid (driven by scroll in Scene3D)

  const pre = new THREE.Group();
  pre.add(root);
  if (MODEL.up === 'z') pre.rotation.x = -Math.PI / 2;
  pre.updateMatrixWorld(true);

  let size = new THREE.Box3().setFromObject(pre).getSize(new THREE.Vector3());
  const yaw = new THREE.Group();
  yaw.add(pre);
  if (size.z > size.x) yaw.rotation.y = Math.PI / 2; // longest horizontal axis -> X
  yaw.rotation.y += MODEL.yawDeg * (Math.PI / 180) + (MODEL.flip ? Math.PI : 0);
  yaw.updateMatrixWorld(true);

  size = new THREE.Box3().setFromObject(yaw).getSize(new THREE.Vector3());
  const wrapper = new THREE.Group();
  wrapper.add(yaw);
  wrapper.scale.setScalar(CAR_LENGTH / size.x);
  wrapper.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(wrapper);
  const c = box.getCenter(new THREE.Vector3());
  wrapper.position.set(-c.x, -box.min.y, -c.z);
  return wrapper;
}

// ----------------------------------------------------------------- shadow ----

function GroundShadow() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 8, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.004} scale={[6.4, 3.3, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// -------------------------------------------------------------- component ----

export default function CarModel({ onStatus }) {
  const [object, setObject] = useState(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    const say = (s) => !cancelled && statusRef.current?.(s);

    (async () => {
      try {
        const { model, textures } = await getManifest('landing', { signal: ac.signal });
        if (!model) return say({ status: 'placeholder', reason: 'no-model' });

        const onProgress = (e) =>
          say({
            status: 'loading',
            progress: Math.min(1, e.loaded / (e.lengthComputable && e.total ? e.total : model.bytes || e.loaded || 1)),
          });
        const root =
          model.type === 'obj'
            ? await loadOBJ(model, textures, onProgress)
            : await loadGLTF(model, onProgress);
        if (cancelled) return;
        const car = await prepare(root);
        if (cancelled) return;
        if (import.meta.env.DEV) window.__car = car; // handy for console debugging
        setObject(car);
        say({ status: 'ready', name: model.name });
        store.invalidate();
      } catch (err) {
        if (err.name === 'AbortError' || cancelled) return;
        console.warn('[car] could not load model, using placeholder:', err);
        say({ status: 'placeholder', reason: 'error', error: String(err.message || err) });
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  useEffect(() => {
    store.invalidate();
  }, [object]);

  return (
    <group>
      {object ? <primitive object={object} /> : <PlaceholderCar />}
      <GroundShadow />
    </group>
  );
}
