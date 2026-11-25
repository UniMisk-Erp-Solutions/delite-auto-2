import * as THREE from 'three';
import { makeGhostGlass } from '../product/glass.js';
import { XRAY } from '../config.js';

// The top-view section shows the car as X-ray glass, exactly like the 3D explorer (same ghost-glass material,
// product/glass.js), but only its frame and outer shape: the whole interior is gone and the ONE thing left
// solid is the carpet.
//
// There is nothing to switch: it follows the scroll. The same car is solid in the front-view and interior
// sections, so the X-ray fades in as the camera arrives above the car and out again as it leaves.
//
// How: the joined model has no part names, so data/xrayParts.js (made by scripts/find-xray-parts.mjs) says what
// every triangle is: glass (body + exterior parts), hidden (interior) or carpet. Each mesh is split by that:
//   - the carpet is cut out into its own mesh and takes no part in any of it
//   - every mesh with glass triangles gets a "twin" that shares its vertices, draws only those triangles and
//     wears the ghost glass
//   - the original dissolves away (screen-door dither, so it needs no transparency and no re-sorting) while
//     the twin fades in; the hidden interior has no twin, so it simply dissolves into nothing
// The dash screen and number plates (added in code, see screen.js / plates.js) leave with the interior.

// triangle classes in data/xrayParts.js (1 = hidden interior needs no name: it is simply never given a twin)
const GLASS = 0;
const CARPET = 2;

const dissolve = { value: 0 }; // shared by every original material: 0 = solid, 1 = gone
let glass = null;
let twins = [];
let solids = [];
let amount = -1;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// how much X-ray there is at scroll position s (a fractional section index, see config.js XRAY)
export function xrayAmount(s) {
  return s <= XRAY.section ? smooth(XRAY.rampIn[0], XRAY.rampIn[1], s) : 1 - smooth(XRAY.rampOut[0], XRAY.rampOut[1], s);
}

// how much X-ray there is right now (0 = normal car), for things around the car that must leave with it
export const xrayLevel = () => Math.max(0, amount);

export function setXray(g) {
  if (!glass || g === amount) return;
  amount = g;
  dissolve.value = g;
  glass.userData.fade.value = g;
  const on = g > 0.002;
  const gone = g > 0.998; // fully X-ray: do not draw the originals at all
  for (const t of twins) t.visible = on;
  for (const m of solids) m.visible = !gone;
}

// add a screen-door dissolve to a material, on top of whatever shader tweaks it already has (leather)
function addDissolve(mat) {
  if (mat.userData.xray) return;
  mat.userData.xray = true;
  const prevCompile = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey;
  mat.onBeforeCompile = (shader, renderer) => {
    prevCompile?.call(mat, shader, renderer);
    shader.uniforms.uDissolve = dissolve;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uDissolve;')
      .replace(
        'void main() {',
        `void main() {
        if (uDissolve > 0.001 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) < uDissolve) discard;`
      );
  };
  mat.customProgramCacheKey = () => `${prevKey ? prevKey.call(mat) : ''}|xray1`;
  mat.needsUpdate = true;
}

const copyTransform = (from, to) => {
  to.position.copy(from.position);
  to.quaternion.copy(from.quaternion);
  to.scale.copy(from.scale);
};

// run-length data (see data/xrayParts.js) -> one class per triangle
function decodeClasses(runs, tris) {
  const bin = atob(runs);
  const out = new Uint8Array(tris);
  let p = 0;
  let t = 0;
  while (p < bin.length) {
    let v = 0;
    let mul = 1;
    let b;
    do {
      b = bin.charCodeAt(p++);
      v += (b & 127) * mul;
      mul *= 128;
    } while (b & 128);
    const len = Math.floor(v / 4);
    out.fill(v % 4, t, t + len);
    t += len;
  }
  if (t !== tris) throw new Error('xray run data is corrupt');
  return out;
}

// the triangles of `index` whose class passes `want`, as a new index list
function pick(index, classes, want) {
  let n = 0;
  for (let t = 0; t < classes.length; t++) if (want(classes[t])) n++;
  const out = new index.constructor(n * 3);
  let o = 0;
  for (let t = 0; t < classes.length; t++) {
    if (!want(classes[t])) continue;
    out[o++] = index[t * 3];
    out[o++] = index[t * 3 + 1];
    out[o++] = index[t * 3 + 2];
  }
  return out;
}

// a geometry that shares every vertex attribute of `geo` but draws only the triangles of `index`
function subGeometry(geo, index) {
  const g = new THREE.BufferGeometry();
  for (const name of Object.keys(geo.attributes)) g.setAttribute(name, geo.attributes[name]);
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.boundingBox = geo.boundingBox?.clone() ?? null;
  g.boundingSphere = geo.boundingSphere?.clone() ?? null;
  return g;
}

// loaded on demand: it is only needed once the model has finished downloading, and it is not small
const partData = import('../data/xrayParts.js');
partData.catch(() => {}); // a failure is reported by setupXray, not as an unhandled rejection

export async function setupXray(root) {
  twins = [];
  solids = [];
  glass = null;
  amount = -1;

  let data;
  try {
    data = (await partData).XRAY_PARTS;
  } catch (err) {
    console.warn('[xray] could not load the part data, X-ray view is off:', err);
    return;
  }

  const meshes = [];
  root.traverse((o) => o.isMesh && meshes.push(o));

  // Decide everything first, change nothing until the whole model checks out. A mesh that has to be split
  // (it holds interior or carpet triangles) must be the exact mesh the data was made for: if the model has
  // been replaced the data would pick the wrong triangles, so then there is no X-ray at all.
  const plan = [];
  for (const [mat, d] of Object.entries(data)) {
    const mesh = meshes.find((m) => m.material?.name === mat);
    if (!mesh || !mesh.geometry.index) {
      console.warn(`[xray] no mesh for material ${mat}; run npm run xray:find. X-ray view is off.`);
      return;
    }
    const classes = decodeClasses(d.runs, d.tris);
    const split = classes.some((c) => c !== GLASS);
    if (split && mesh.geometry.index.count / 3 !== d.tris) {
      console.warn(`[xray] part data does not match this model (${mat}); run npm run xray:find. X-ray view is off.`);
      return;
    }
    plan.push({ mesh, classes, split });
  }

  glass = makeGhostGlass();
  for (const { mesh, classes, split } of plan) {
    const geo = mesh.geometry;
    let twinGeo = geo;
    if (split) {
      const idx = geo.index.array;
      const glassIdx = pick(idx, classes, (c) => c === GLASS);
      const carpetIdx = pick(idx, classes, (c) => c === CARPET);
      const bodyIdx = pick(idx, classes, (c) => c !== CARPET);
      if (carpetIdx.length) {
        // its own material copy, so the dissolve added to the rest of the car never reaches the carpet
        const piece = new THREE.Mesh(subGeometry(geo, carpetIdx), mesh.material.clone());
        piece.name = 'carpet';
        copyTransform(mesh, piece);
        mesh.parent.add(piece);
        geo.setIndex(new THREE.BufferAttribute(bodyIdx, 1));
      }
      twinGeo = glassIdx.length ? subGeometry(geo, glassIdx) : null;
    }
    if (twinGeo) {
      const twin = new THREE.Mesh(twinGeo, glass);
      twin.name = `${mesh.name}-xray`;
      twin.renderOrder = 2; // after the solid carpet, like the explorer's glass
      twin.visible = false;
      copyTransform(mesh, twin);
      mesh.parent.add(twin);
      twins.push(twin);
    }
  }

  // every original mesh dissolves; anything the data does not cover (the dash screen, the number plates) is
  // not part of the exterior shell, so it just leaves with the interior
  for (const m of meshes) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach(addDissolve);
    solids.push(m);
  }
  setXray(0);
}
