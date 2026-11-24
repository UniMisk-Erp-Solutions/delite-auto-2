// Draws the in-car navigation UI with plain Canvas2D (no libraries, no image files), so it is
// pixel-sharp at any resolution. Pure function: works in the browser and in Node for previews.
//
// Design rules: flat surfaces only, one accent colour, no gradients, no glows, no shadows.
// It is deliberately restrained, like a real production head unit.

const C = {
  bg: '#101318',
  block: '#141920',
  park: '#131d18',
  water: '#0e1822',
  minor: '#1d232b',
  major: '#272e38',
  bar: '#0c0f13',
  line: '#1f252d',
  card: '#171b21',
  cardLine: '#262c35',
  text: '#f2f4f7',
  sub: '#a3acb9',
  dim: '#6d7683',
  label: '#5f6978',
  accent: '#4f8cff',
  routeCase: '#1b3a73',
  sign: '#d0342c',
};

const FONT = (w, px) => `${w} ${px}px Inter, "Segoe UI", system-ui, Arial, sans-serif`;

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function text(g, s, x, y, { size = 32, weight = 500, color = C.text, align = 'left', base = 'alphabetic' } = {}) {
  g.font = FONT(weight, size);
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = base;
  g.fillText(s, x, y);
}

// deterministic pseudo-random so the map is identical on every load
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function line(g, pts, width, color, cap = 'round') {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = cap;
  g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
}

/* ------------------------------------------------------------------ map */
function drawMap(g, W, mapTop, mapBottom) {
  const H = mapBottom - mapTop;
  g.save();
  g.beginPath();
  g.rect(0, mapTop, W, H);
  g.clip();

  g.fillStyle = C.bg;
  g.fillRect(0, mapTop, W, H);

  // river
  g.fillStyle = C.water;
  g.beginPath();
  g.moveTo(-20, mapBottom - 70);
  g.bezierCurveTo(300, mapBottom - 230, 520, mapBottom + 10, 860, mapBottom - 120);
  g.bezierCurveTo(1100, mapBottom - 210, 1280, mapBottom - 60, 1500, mapBottom - 150);
  g.lineTo(1500, mapBottom + 40);
  g.lineTo(-20, mapBottom + 40);
  g.closePath();
  g.fill();

  // parks
  g.fillStyle = C.park;
  [[1450, 520, 300, 190], [140, 400, 190, 150], [1060, 150, 130, 90]].forEach(([x, y, w, h]) => {
    rr(g, x, y, w, h, 14);
    g.fill();
  });

  // building blocks (slightly lighter than the ground) between streets
  const r = rng(7);
  const xs = [-40];
  while (xs[xs.length - 1] < W + 40) xs.push(xs[xs.length - 1] + 120 + r() * 70);
  const ys = [mapTop - 40];
  while (ys[ys.length - 1] < mapBottom + 40) ys.push(ys[ys.length - 1] + 100 + r() * 60);

  g.fillStyle = C.block;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      if (r() < 0.42) continue;
      rr(g, xs[i] + 22, ys[j] + 22, xs[i + 1] - xs[i] - 44, ys[j + 1] - ys[j] - 44, 5);
      g.fill();
    }
  }
  // thin, irregular minor streets (some lines skipped so it does not read as a grid)
  xs.forEach((x, i) => i % 3 !== 1 && line(g, [[x, mapTop - 20], [x, mapBottom + 20]], 7, C.minor, 'butt'));
  ys.forEach((y, j) => j % 3 !== 2 && line(g, [[-20, y], [W + 20, y]], 7, C.minor, 'butt'));

  // main roads
  const MV = [420, 1000, 1280, 1700];
  const MH = [430, 700];
  MV.forEach((x) => line(g, [[x, mapTop - 20], [x, mapBottom + 20]], 26, C.major, 'butt'));
  MH.forEach((y) => line(g, [[-20, y], [W + 20, y]], 26, C.major, 'butt'));
  line(g, [[-20, 300], [600, 200], [1100, 0]], 22, C.major);
  line(g, [[1300, 920], [1700, 760], [2000, 600]], 22, C.major);

  // street names
  text(g, 'MG Road', 1118, 398, { size: 24, weight: 500, color: C.label });
  text(g, 'FC Road', 560, 691, { size: 24, weight: 500, color: C.label });
  g.save();
  g.translate(1271, 640);
  g.rotate(-Math.PI / 2);
  text(g, 'Ring Road', 0, 0, { size: 24, weight: 500, color: C.label, align: 'center' });
  g.restore();

  // route: solid casing + solid line (no glow)
  const route = [[1000, 810], [1000, 430], [1280, 430], [1280, 215]];
  line(g, route, 30, C.routeCase);
  line(g, route, 18, C.accent);

  // destination
  g.fillStyle = C.text;
  g.beginPath();
  g.arc(1280, 195, 24, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = C.card;
  g.beginPath();
  g.arc(1280, 195, 9, 0, Math.PI * 2);
  g.fill();

  // current position (navigation arrow, heading north)
  g.save();
  g.translate(1000, 810);
  g.fillStyle = C.text;
  g.beginPath();
  g.moveTo(0, -46);
  g.lineTo(34, 34);
  g.lineTo(0, 16);
  g.lineTo(-34, 34);
  g.closePath();
  g.fill();
  g.fillStyle = C.accent;
  g.beginPath();
  g.moveTo(0, -30);
  g.lineTo(22, 22);
  g.lineTo(0, 10);
  g.lineTo(-22, 22);
  g.closePath();
  g.fill();
  g.restore();

  g.restore();
}

/* ---------------------------------------------------------------- icons */
function stroke(g, w = 4, color = C.sub) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
}

const ICONS = {
  map(g, x, y, s, color) {
    stroke(g, 4, color);
    g.beginPath();
    g.moveTo(x - s * 0.1, y - s * 0.5);
    g.lineTo(x + s * 0.45, y + s * 0.45);
    g.lineTo(x - s * 0.05, y + s * 0.2);
    g.lineTo(x - s * 0.5, y + s * 0.45);
    g.closePath();
    g.stroke();
  },
  media(g, x, y, s, color) {
    stroke(g, 4, color);
    g.beginPath();
    g.moveTo(x - s * 0.05, y - s * 0.45);
    g.lineTo(x - s * 0.05, y + s * 0.3);
    g.moveTo(x - s * 0.05, y - s * 0.45);
    g.lineTo(x + s * 0.38, y - s * 0.3);
    g.lineTo(x + s * 0.38, y + s * 0.1);
    g.stroke();
    g.beginPath();
    g.arc(x - s * 0.25, y + s * 0.3, s * 0.2, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(x + s * 0.18, y + s * 0.1, s * 0.2, 0, Math.PI * 2);
    g.stroke();
  },
  phone(g, x, y, s, color) {
    stroke(g, 4, color);
    rr(g, x - s * 0.26, y - s * 0.5, s * 0.52, s, s * 0.1);
    g.stroke();
    g.beginPath();
    g.moveTo(x - s * 0.08, y + s * 0.36);
    g.lineTo(x + s * 0.08, y + s * 0.36);
    g.stroke();
  },
  climate(g, x, y, s, color) {
    stroke(g, 4, color);
    rr(g, x - s * 0.1, y - s * 0.5, s * 0.2, s * 0.62, s * 0.1);
    g.stroke();
    g.beginPath();
    g.arc(x, y + s * 0.3, s * 0.2, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(x, y - s * 0.12);
    g.lineTo(x, y + s * 0.3);
    g.stroke();
  },
  apps(g, x, y, s, color) {
    stroke(g, 4, color);
    const q = s * 0.36;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      rr(g, x + a * q * 0.62 - q * 0.45, y + b * q * 0.62 - q * 0.45, q * 0.9, q * 0.9, 6);
      g.stroke();
    });
  },
};

/* ------------------------------------------------------------------- UI */
export function drawGpsUi(g, W, H) {
  const BAR = 72;
  const DOCK = 168;
  const mapTop = BAR;
  const mapBottom = H - DOCK;

  drawMap(g, W, mapTop, mapBottom);

  // ---- status bar
  g.fillStyle = C.bar;
  g.fillRect(0, 0, W, BAR);
  g.fillStyle = C.line;
  g.fillRect(0, BAR - 2, W, 2);
  text(g, '10:42', 48, 49, { size: 34, weight: 600 });
  text(g, '31°C', 168, 49, { size: 28, weight: 500, color: C.dim });
  text(g, '4G', W - 250, 48, { size: 26, weight: 600, color: C.sub, align: 'right' });
  // signal bars
  [10, 18, 26, 34].forEach((h, i) => {
    g.fillStyle = i < 3 ? C.sub : C.line;
    g.fillRect(W - 236 + i * 12, 54 - h, 8, h);
  });
  // battery
  stroke(g, 3, C.sub);
  rr(g, W - 170, 22, 52, 28, 7);
  g.stroke();
  g.fillStyle = C.sub;
  g.fillRect(W - 118, 31, 5, 10);
  rr(g, W - 166, 26, 38 * 0.82, 20, 4);
  g.fill();
  text(g, '82%', W - 48, 48, { size: 26, weight: 600, color: C.sub, align: 'right' });

  // ---- turn card
  const tx = 48;
  const ty = mapTop + 48;
  g.fillStyle = C.card;
  rr(g, tx, ty, 620, 236, 28);
  g.fill();
  g.strokeStyle = C.cardLine;
  g.lineWidth = 2;
  rr(g, tx, ty, 620, 236, 28);
  g.stroke();
  // turn-right arrow
  stroke(g, 14, C.text);
  g.beginPath();
  g.moveTo(tx + 62, ty + 168);
  g.lineTo(tx + 62, ty + 98);
  g.quadraticCurveTo(tx + 62, ty + 70, tx + 90, ty + 70);
  g.lineTo(tx + 136, ty + 70);
  g.stroke();
  g.fillStyle = C.text;
  g.beginPath();
  g.moveTo(tx + 128, ty + 36);
  g.lineTo(tx + 176, ty + 70);
  g.lineTo(tx + 128, ty + 104);
  g.closePath();
  g.fill();
  text(g, '450 m', tx + 220, ty + 112, { size: 88, weight: 600 });
  text(g, 'Turn right onto MG Road', tx + 220, ty + 164, { size: 32, weight: 500, color: C.sub });
  text(g, 'then 2.1 km to Ring Road', tx + 220, ty + 206, { size: 26, weight: 500, color: C.dim });

  // ---- trip card
  const by = mapBottom - 48 - 132;
  g.fillStyle = C.card;
  rr(g, tx, by, 620, 132, 28);
  g.fill();
  g.strokeStyle = C.cardLine;
  rr(g, tx, by, 620, 132, 28);
  g.stroke();
  [['10:54', 'Arrival'], ['12 min', 'Time'], ['6.8 km', 'Distance']].forEach(([v, l], i) => {
    const cx = tx + 40 + i * 196;
    text(g, v, cx, by + 62, { size: 42, weight: 600 });
    text(g, l, cx, by + 104, { size: 26, weight: 500, color: C.dim });
    if (i) {
      g.fillStyle = C.cardLine;
      g.fillRect(cx - 24, by + 28, 2, 76);
    }
  });

  // ---- speed card
  const sx = W - 48 - 480;
  const sy = mapTop + 48;
  g.fillStyle = C.card;
  rr(g, sx, sy, 480, 248, 28);
  g.fill();
  g.strokeStyle = C.cardLine;
  rr(g, sx, sy, 480, 248, 28);
  g.stroke();
  text(g, '68', sx + 44, sy + 160, { size: 160, weight: 600 });
  text(g, 'km/h', sx + 48, sy + 210, { size: 30, weight: 500, color: C.dim });
  // speed-limit sign (red ring, white disc)
  const cx = sx + 372;
  const cy = sy + 112;
  g.fillStyle = C.sign;
  g.beginPath();
  g.arc(cx, cy, 70, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(cx, cy, 52, 0, Math.PI * 2);
  g.fill();
  text(g, '70', cx, cy + 20, { size: 60, weight: 700, color: '#15181d', align: 'center' });

  // ---- next-stop card
  const ny = sy + 248 + 24;
  g.fillStyle = C.card;
  rr(g, sx, ny, 480, 156, 28);
  g.fill();
  g.strokeStyle = C.cardLine;
  rr(g, sx, ny, 480, 156, 28);
  g.stroke();
  text(g, 'DESTINATION', sx + 44, ny + 52, { size: 22, weight: 600, color: C.label });
  text(g, 'Kothrud Junction', sx + 44, ny + 100, { size: 38, weight: 600 });
  text(g, 'Pune · arrives 10:54', sx + 44, ny + 138, { size: 26, weight: 500, color: C.dim });

  // ---- dock
  g.fillStyle = C.bar;
  g.fillRect(0, H - DOCK, W, DOCK);
  g.fillStyle = C.line;
  g.fillRect(0, H - DOCK, W, 2);
  const items = [['map', 'Map'], ['media', 'Media'], ['phone', 'Phone'], ['climate', 'Climate'], ['apps', 'Apps']];
  const slot = W / items.length;
  items.forEach(([icon, label], i) => {
    const x = slot * i + slot / 2;
    const active = i === 0;
    if (active) {
      g.fillStyle = '#18202c';
      rr(g, x - 130, H - DOCK + 22, 260, DOCK - 44, 26);
      g.fill();
    }
    const col = active ? C.accent : C.sub;
    ICONS[icon](g, x, H - DOCK + 68, 56, col);
    text(g, label, x, H - DOCK + 130, { size: 28, weight: 500, color: active ? C.text : C.sub, align: 'center' });
  });
}
