// Works out, for every triangle of the JOINED landing model (delite.glb), which kind of part it belongs to, and
// writes the answer to client/src/data/xrayParts.js. The top-view section needs it to show the car as X-ray glass
// with the whole interior hidden and only the carpet solid (client/src/three/xray.js).
//
// The joined model is one mesh per material with no part names, but the separate-parts model
// (innova-parts.glb, used by the 3D explorer) is exactly the same geometry cut into named objects. So every
// triangle is looked up by position in the parts file and takes the class of the object it belongs to:
//   0 glass   the body shell and every exterior part (wheels, lamps, mirrors, handles, grille ...)
//   1 hidden  the interior (seats, dash, steering, door cards ...)
//   2 solid   the carpet (floor_mats)
// Edit the two lists below to change what counts as interior / solid, then re-run:   npm run xray:find
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const INTERIOR = [
  'infotainment', 'dash_trim', 'interior_rearview', 'instrument_cluster', 'steering', 'gear_shifter',
  'pedals', 'door_cards', 'seats', 'door_sills', 'headrests', 'armrests',
];
const SOLID = ['floor_mats'];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELS = path.join(root, 'server/models');
const GLASS = 0;
const HIDDEN = 1;
const CARPET = 2;

// Minimal GLB reader: JSON chunk + positions + indices (the models use plain, uncompressed buffers).
function readGLB(file) {
  const buf = fs.readFileSync(file);
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString());
  const dv = new DataView(buf.buffer, buf.byteOffset + 20 + buf.readUInt32LE(12) + 8);
  const read = (i) => {
    const a = json.accessors[i];
    const bv = json.bufferViews[a.bufferView];
    const n = { SCALAR: 1, VEC3: 3 }[a.type];
    const size = { 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
    const get = { 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
    const stride = bv.byteStride || size * n;
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const out = new Float64Array(a.count * n);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv[get](base + k * stride + c * size, true);
    return out;
  };
  return { json, read };
}

// A triangle as its sorted vertex positions on a 0.5 mm grid, so the same triangle matches in both files.
const key = (pos, i) => `${Math.round(pos[i * 3] * 2e3)},${Math.round(pos[i * 3 + 1] * 2e3)},${Math.round(pos[i * 3 + 2] * 2e3)}`;
function triangleKeys(file, prim) {
  const pos = file.read(prim.attributes.POSITION);
  const idx = prim.indices != null ? file.read(prim.indices) : Array.from({ length: pos.length / 3 }, (_, i) => i);
  const out = [];
  for (let t = 0; t < idx.length; t += 3) out.push([0, 1, 2].map((k) => key(pos, idx[t + k])).sort().join('|'));
  return out;
}

const parts = readGLB(path.join(MODELS, 'innova-parts.glb'));
const joined = readGLB(path.join(MODELS, 'delite.glb'));

// every part name used below must exist, so a renamed object is caught here and not silently ignored
const partNames = new Set(parts.json.nodes.filter((n) => n.mesh != null).map((n) => n.name));
for (const n of [...INTERIOR, ...SOLID]) if (!partNames.has(n)) throw new Error(`innova-parts.glb has no object called ${n}`);

// which parts claim each triangle position
const owners = new Map();
for (const node of parts.json.nodes) {
  if (node.mesh == null) continue;
  for (const prim of parts.json.meshes[node.mesh].primitives) {
    for (const k of triangleKeys(parts, prim)) {
      if (!owners.has(k)) owners.set(k, new Set());
      owners.get(k).add(node.name);
    }
  }
}
const classOf = (names) => {
  if ([...names].some((n) => SOLID.includes(n))) return CARPET;
  return [...names].every((n) => INTERIOR.includes(n)) ? HIDDEN : GLASS; // shared with a body part: keep it visible
};

// class of every triangle of every material of the joined model, as runs: varint((length << 2) | class), base64
function encodeRuns(classes) {
  const bytes = [];
  const push = (cls, len) => {
    let v = len * 4 + cls;
    while (v >= 128) {
      bytes.push((v % 128) | 128);
      v = Math.floor(v / 128);
    }
    bytes.push(v);
  };
  let start = 0;
  for (let t = 1; t <= classes.length; t++) {
    if (t === classes.length || classes[t] !== classes[start]) {
      push(classes[start], t - start);
      start = t;
    }
  }
  return Buffer.from(bytes).toString('base64');
}

const out = {};
const total = [0, 0, 0];
for (const prim of joined.json.meshes[0].primitives) {
  const mat = joined.json.materials[prim.material].name;
  if (out[mat]) throw new Error(`two primitives share the material ${mat}`);
  const classes = triangleKeys(joined, prim).map((k) => {
    const names = owners.get(k);
    if (!names) throw new Error(`a triangle of ${mat} is not in innova-parts.glb: the two models differ, refusing to write`);
    return classOf(names);
  });
  classes.forEach((c) => total[c]++);
  out[mat] = { tris: classes.length, runs: encodeRuns(classes) };
  console.log(`${mat.padEnd(14)} ${String(classes.length).padStart(7)} triangles`);
}
console.log(`glass ${total[GLASS]}, hidden ${total[HIDDEN]}, carpet ${total[CARPET]}`);

const text = `// GENERATED by scripts/find-xray-parts.mjs (npm run xray:find). Do not edit by hand.
// What every triangle of the joined landing model is, per material: glass (body + exterior), hidden (interior)
// or the solid carpet. \`tris\` is the triangle count of that material's mesh when this was generated: if the model
// is replaced the counts no longer match and the page simply skips the X-ray effect instead of using wrong data.
// \`runs\` is run-length coded in triangle order: base64 of varints, each (length * 4 + class) with
// class 0 = glass, 1 = hidden, 2 = carpet (decoded in three/xray.js).
export const XRAY_PARTS = ${JSON.stringify(out)};
`;
fs.writeFileSync(path.join(root, 'client/src/data/xrayParts.js'), text);
console.log(`wrote client/src/data/xrayParts.js (${(text.length / 1024).toFixed(1)} KB)`);
