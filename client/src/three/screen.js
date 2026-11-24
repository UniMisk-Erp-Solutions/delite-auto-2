import * as THREE from 'three';
import { SCREEN } from '../config.js';
import { store } from '../store.js';
import { drawGpsUi } from './gpsUi.js';

// Puts a real UI image on the dashboard display.
//
// The model's display is a flat dark panel with no usable UVs, so we add one thin plane exactly
// on that panel (corners come from the exported mesh, see config.js -> SCREEN). It is parented
// to the same glTF node, so it follows every transform of the car automatically.
//
// A real screen emits its own light, so the picture goes into the *emissive* channel (it stays
// readable in the dim cabin), while a glossy clear-coat on top reflects the cabin like glass.
// No bloom or glow is added.

const WIDTH = 1920; // full-HD UI, sharp at any distance thanks to mipmaps + anisotropy

async function buildTexture(aspect) {
  // make sure Inter (the site font) is ready before drawing text into the texture
  try {
    await Promise.all(['500', '600', '700'].map((w) => document.fonts.load(w + ' 40px Inter')));
  } catch {
    /* falls back to system fonts */
  }
  const H = Math.round(WIDTH / aspect);
  const c = document.createElement('canvas');
  c.width = WIDTH;
  c.height = H;
  drawGpsUi(c.getContext('2d'), WIDTH, H);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// The model puts a glossy glass sheet in front of the display. It mirrors the cabin light as a
// bright blob, so the triangles that cover the display are removed (the rest of the glass stays).
function removeDisplayGlass(host) {
  const [lo, hi] = SCREEN.glassBox;
  host.traverse((o) => {
    if (!o.isMesh || o.material?.name !== SCREEN.glassMaterial || !o.geometry.index) return;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index.array;
    const keep = [];
    for (let t = 0; t < idx.length; t += 3) {
      let x = 0;
      let y = 0;
      let z = 0;
      for (let k = 0; k < 3; k++) {
        x += pos.getX(idx[t + k]) / 3;
        y += pos.getY(idx[t + k]) / 3;
        z += pos.getZ(idx[t + k]) / 3;
      }
      const inside = x > lo[0] && x < hi[0] && y > lo[1] && y < hi[1] && z > lo[2] && z < hi[2];
      if (!inside) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    if (keep.length !== idx.length) o.geometry.setIndex(keep);
  });
}

export function addScreen(root) {
  const host = root.getObjectByName(SCREEN.host);
  if (!host) {
    console.warn('[screen] host node not found:', SCREEN.host);
    return;
  }

  // corners as seen by the driver: top-left, top-right, bottom-right, bottom-left
  const [TL, TR, BR, BL] = SCREEN.corners.map((c) => new THREE.Vector3(...c));
  const widthM = TL.distanceTo(TR);
  const heightM = TL.distanceTo(BL);
  const aspect = widthM / heightM;

  // make sure the plane faces the driver (rear of the car)
  const n = new THREE.Vector3().subVectors(BL, TL).cross(new THREE.Vector3().subVectors(BR, TL)).normalize();
  const flip = n.dot(new THREE.Vector3(...SCREEN.faces)) < 0;
  if (flip) n.negate();
  const lift = n.clone().multiplyScalar(SCREEN.lift);
  const verts = [TL, BL, BR, TR].map((v) => v.clone().add(lift));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts.flatMap((v) => v.toArray()), 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute([...n.toArray(), ...n.toArray(), ...n.toArray(), ...n.toArray()], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 1, 1], 2));
  geo.setIndex(flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);

  // Anti-glare finish: a real head-unit panel is nearly matte, so no clear-coat and only a faint
  // specular. The picture is emitted by the panel itself (emissive), nothing is added on top.
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x040405,
    emissive: 0xffffff,
    emissiveIntensity: 0,
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0,
    specularIntensity: 0.18,
    envMapIntensity: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'dash-screen';
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  host.add(mesh);

  removeDisplayGlass(host);

  buildTexture(aspect).then((tex) => {
    mat.emissiveMap = tex;
    mat.emissiveIntensity = SCREEN.brightness;
    mat.needsUpdate = true;
    store.invalidate();
  });
}
