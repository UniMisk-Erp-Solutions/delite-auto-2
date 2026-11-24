// Central tuning file for the 3D scroll choreography.
export const BRAND = 'Delite';
export const CAR_LENGTH = 4.6; // every model is normalised to this length (world units)

const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

// How your model is oriented when exported. If the car faces the wrong way on the
// hero section, open the site with ?flip=1 (or ?yaw=90 / ?yaw=-90). If it lies on
// its side, try ?up=z. Once you know the right values, hard-code them here.
export const MODEL = {
  up: q.get('up') || 'y', // 'y' | 'z'
  flip: q.get('flip') === '1', // rotate 180° about the vertical axis
  yawDeg: Number(q.get('yaw') || 0), // extra rotation about the vertical axis
  forceFrontSide: q.get('double') !== '1', // required for the interior fly-through

  // Clean-up of stray objects that were exported together with the car. Names are the
  // glTF node names with dots removed ("Cube.007" -> "Cube007", "model_2.001" -> "model_2001").
  hide: /^(cube|plane|floor|ground|stand|plate|backdrop)/i, // never show these
  // If the file holds the car twice (e.g. split parts + a joined copy) list the one to
  // keep. Ignored automatically when nothing matches, so a clean single-car export works.
  keepOnly: ['model_2001'],
};

// Fix individual materials by their Blender material name, e.g.
//   'Material.009': { color: '#c9ccd1', metalness: 0.9, roughness: 0.25 }
//   'Material.001': { glass: true }
// (In dev, type  [...window.__mats]  in the browser console to list the names.)
export const MATERIAL_OVERRIDES = {};

// Outer paint whose faces are partly flipped in the exported model (e.g. the tailgate skin).
// Back-face culling would make those patches vanish and show the panel behind; drawing
// both sides fixes it without affecting the rest of the car or the interior view.
export const DOUBLE_SIDED_MATERIALS = ['Material.013', 'Material.003'];

// The dashboard display. Corners are in the exported mesh's own coordinates (read from the
// 2-triangle panel of Material.004), listed as the driver sees them: top-left, top-right,
// bottom-right, bottom-left. `faces` is the direction the picture must face (rear of the car),
// `lift` raises it 1.2 mm off the panel, `brightness` is how strongly the screen emits.
export const SCREEN = {
  host: 'model_2001',
  corners: [
    [0.1084, 0.7462, -1.2889],
    [-0.1212, 0.7461, -1.2879],
    [-0.1212, 0.7289, -1.159],
    [0.1103, 0.7289, -1.159],
  ],
  // the glossy glass sheet over the display is removed inside this box (raw mesh coordinates)
  glassMaterial: 'Material',
  glassBox: [[-0.15, 0.715, -1.31], [0.14, 0.77, -1.13]],
  faces: [0, -1, 0],
  lift: 0.0012,
  brightness: 0.95,
};

// Shop-the-interior pins. `p` is a point on the car in the page's car space (front = +X, up = +Y,
// right = +Z). They are projected through the live camera every frame, so they stay glued to the
// part while the camera flies in. `side` is where the product label opens.
export const HOTSPOTS = [
  { id: 'screen', product: 'p3', label: 'Smart GPS Head Unit', p: [0.746, 1.22, 0.007], side: 'right' },
  { id: 'seat', product: 'p1', label: 'Nappa Seat Covers', p: [-0.095, 1.133, 0.329], side: 'left' },
  { id: 'wheel', product: 'p10', label: 'Leather Wheel Cover', p: [0.581, 1.099, 0.285], side: 'right' },
  { id: 'ambient', product: 'p6', label: 'Ambient Light Kit', p: [0.712, 1.088, -0.375], side: 'left' },
];

// Materials that are real leather (the seats). They get a procedural pebbled-leather
// shader in three/leather.js. tileMetres = size of one grain tile, bump = grain depth.
// (leave {} for the defaults; options: tileMetres, bump, creaseDark, roughVar, tint)
export const LEATHER_MATERIALS = { 'Material.005': {} };

// Materials whose procedural colour was baked into vertex colours (see
// tools/blender_fix_procedural.py). The exporter writes COLOR_0 on every part; only these
// should use it, otherwise e.g. the red tail-lights would be multiplied by themselves.
export const VERTEX_COLOR_MATERIALS = [
  'Material.003', 'Material.004', 'Material.005', 'Material.007', 'Material.009', 'Material.011',
];

const D = Math.PI / 180;

// Camera "orbits" the car (car stays at the origin, front = +X, right side = +Z).
//  az   : degrees around the car  (0 = right side, 90 = front, -90 = back)
//  el   : degrees above horizon   (90 = straight down)
//  dist : camera distance to target
//  t*   : look-at target
//  sx/sy: where the car sits on screen, as a fraction of viewport (+x right, +y up)
export const KEYS = [
  // 0 · hero — side view, low and centred
  { az: 0, el: 4, dist: 10, fov: 28, tx: 0, ty: 0.85, tz: 0, sx: 0, sy: -0.22 },
  // 1 · front view, car on the right
  { az: 90, el: 5, dist: 7.2, fov: 28, tx: 0, ty: 0.85, tz: 0, sx: 0.24, sy: -0.02 },
  // 2 · top view, car on the left
  { az: 0, el: 83, dist: 15.5, fov: 28, tx: 0, ty: 0.9, tz: 0, sx: -0.26, sy: 0 },
  // 3 · interior — the camera swings round the back and flies into the cabin, looking
  //     forward at the dashboard. Tune ty/tx/dist/el to match where the cabin is in YOUR model.
  { az: -90, el: 11, dist: 1.55, fov: 68, tx: 1.0, ty: 1.0, tz: 0, sx: 0, sy: 0 },
  // 4 · dash close-up for the Smart GPS banner: push in on the infotainment screen,
  //     which sits on the right half so the offer copy can sit on the left
  //     Aimed at the display centre (0.746, 1.22) along its own normal (7.6 deg up), so the
  //     picture is seen square-on and fills about a third of the width.
  { az: -90, el: 7.5, dist: 0.42, fov: 46, tx: 0.746, ty: 1.218, tz: 0.007, sx: 0.22, sy: 0 },
  // 5 · exit — pull back out and slide off to the right so the product grid gets the full width
  { az: 38, el: 9, dist: 13, fov: 28, tx: 0, ty: 0.85, tz: 0, sx: 0.85, sy: -0.1 },
];

// Past this many viewport-heights beyond the last story section the 3D scene is switched
// off completely (zero GPU work for the long shopping part of the page).
export const HIDE_AFTER_VH = 0.6;

const FIELDS = ['az', 'el', 'dist', 'fov', 'tx', 'ty', 'tz', 'sx', 'sy'];
const HOLD = 0.14; // fraction of each section (at both ends) where the car stays put

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// sine ease-in-out: gentler mid-speed than a cubic, so fast scrolling never feels rushed
const ease = (h) => 0.5 - 0.5 * Math.cos(Math.PI * h);

// s = fractional section index (0..KEYS.length-1). Writes into `out`.
export function sampleKeys(s, out = {}) {
  const max = KEYS.length - 1;
  s = clamp(s, 0, max);
  const i = Math.min(Math.floor(s), max - 1);
  const t = s - i;
  const u = ease(clamp((t - HOLD) / (1 - 2 * HOLD), 0, 1));
  const a = KEYS[i];
  const b = KEYS[i + 1];
  for (const f of FIELDS) out[f] = a[f] + (b[f] - a[f]) * u;
  return out;
}

export { D, clamp };
