import * as THREE from 'three';
import { PLATE } from '../config.js';
import { store } from '../store.js';

// Writes the brand name on the car's number plates, front and rear.
//
// The plate is not a separate object in the exported model (it is part of the joined body mesh, with no
// UVs and no textures), so, exactly like the dashboard screen in screen.js, we mount one thin plate on the
// spot (coordinates in config.js -> PLATE). It is parented to the same glTF node as the body, so it follows
// every transform of the car: the landing scroll, the orbit on /product, the exit slide.
// Both plates share ONE texture, material and geometry, so the cost is a single 2048 px canvas.

const TEX_W = 2048;
const FACE = '#0b0b0d'; // plate colour: the same near-black as the car's own plate panel
const INK = '#ece8df'; // warm white lettering
const FONT = '"Cormorant Garamond", "Cormorant", Georgia, "Times New Roman", serif'; // the logo's font (index.html loads it)

function drawPlate(ctx, w, h, label) {
  ctx.fillStyle = FACE;
  ctx.fillRect(0, 0, w, h);

  // thin inset border, like a real plate
  const inset = h * 0.07;
  const r = h * 0.1;
  ctx.strokeStyle = 'rgba(236,232,223,0.5)';
  ctx.lineWidth = h * 0.024;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, r);
  else ctx.rect(inset, inset, w - inset * 2, h - inset * 2); // older browsers: square corners
  ctx.stroke();

  // lettering: spaced capitals, centred optically on the cap height. Tracking is drawn letter by letter
  // (ctx.letterSpacing is not available in every browser).
  let size = h * 0.56;
  const chars = [...(PLATE.caps ? label.toUpperCase() : label)];
  const measure = () => {
    ctx.font = `600 ${size}px ${FONT}`;
    const track = size * (PLATE.caps ? 0.3 : 0.08);
    const widths = chars.map((c) => ctx.measureText(c).width);
    return { track, widths, total: widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1) };
  };
  let m = measure();
  const maxW = w - inset * 2 - h * 0.5;
  if (m.total > maxW) {
    size *= maxW / m.total;
    m = measure();
  }
  const cap = ctx.measureText('H').actualBoundingBoxAscent || size * 0.63;
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  let x = (w - m.total) / 2;
  const y = h / 2 + cap / 2;
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += m.widths[i] + m.track;
  });
}

async function buildTexture() {
  try {
    await document.fonts.load(`600 100px ${FONT}`); // make sure the logo font is ready before drawing
  } catch {
    /* falls back to a serif system font */
  }
  const h = Math.round((TEX_W * PLATE.height) / PLATE.width);
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = h;
  drawPlate(c.getContext('2d'), TEX_W, h, PLATE.text);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// Mount one plate on `host`. Local frame of the plate: +Z = the way it faces, +Y = up, +X = to the right as
// seen by someone standing in front of it (so the text is never mirrored).
function mount(host, spot, geo, materials, name) {
  const n = new THREE.Vector3(...spot.normal).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(...PLATE.up), n).normalize();
  const up = new THREE.Vector3().crossVectors(n, right); // true "up" of a plate that leans with its surface
  const mesh = new THREE.Mesh(geo, materials);
  mesh.name = name;
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n));
  // back of the plate 1 mm inside the surface it is mounted on, so there is never a gap
  mesh.position.set(...spot.at).addScaledVector(n, PLATE.depth / 2 - 0.001);
  host.add(mesh);
}

export function addPlates(root) {
  const host = PLATE.hosts.map((n) => root.getObjectByName(n)).find(Boolean);
  if (!host) {
    console.warn('[plates] no host node found, tried:', PLATE.hosts.join(', '));
    return;
  }
  // idempotent: replace plates from an earlier call
  host.children.filter((o) => o.name.startsWith('number-plate')).forEach((o) => host.remove(o));

  const side = new THREE.MeshStandardMaterial({ color: FACE, roughness: 0.5, metalness: 0 });
  const face = new THREE.MeshStandardMaterial({ color: FACE, roughness: 0.4, metalness: 0, envMapIntensity: 0.8 });
  // BoxGeometry face order: +x, -x, +y, -y, +z (the front of the plate, gets the lettering), -z
  const materials = [side, side, side, side, face, side];
  const geo = new THREE.BoxGeometry(PLATE.width, PLATE.height, PLATE.depth);

  mount(host, PLATE.front, geo, materials, 'number-plate-front');
  mount(host, PLATE.rear, geo, materials, 'number-plate-rear');

  buildTexture().then((tex) => {
    face.map = tex;
    face.color.set(0xffffff);
    face.needsUpdate = true;
    store.invalidate();
  });
}
