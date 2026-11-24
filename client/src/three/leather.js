import * as THREE from 'three';

// Procedural leather for MeshPhysicalMaterial.
//  * A tileable pebbled-grain height map is generated once (Voronoi cells with creases).
//  * It is projected "triplanar" from the model's own object-space position, so it does
//    not depend on UV maps (the car's UVs are unusable for fine detail).
//  * The height drives: crease darkening, roughness variation and bump (normal) detail.

let heightTex = null;

function makeHeightTexture(size = 512) {
  if (heightTex) return heightTex;

  let seed = 1337;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // tileable cellular noise: returns (F2 - F1) normalised, i.e. distance to the nearest crease
  const makeGrid = (n) => {
    const pts = new Float32Array(n * n * 2);
    for (let i = 0; i < n * n; i++) {
      pts[i * 2] = 0.15 + rnd() * 0.7;
      pts[i * 2 + 1] = 0.15 + rnd() * 0.7;
    }
    return (u, v) => {
      const x = u * n;
      const y = v * n;
      const cx = Math.floor(x);
      const cy = Math.floor(y);
      let f1 = 9;
      let f2 = 9;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const gx = (((cx + i) % n) + n) % n;
          const gy = (((cy + j) % n) + n) % n;
          const k = (gy * n + gx) * 2;
          const dx = cx + i + pts[k] - x;
          const dy = cy + j + pts[k + 1] - y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < f1) {
            f2 = f1;
            f1 = d;
          } else if (d < f2) f2 = d;
        }
      }
      return f2 - f1;
    };
  };

  const coarse = makeGrid(14); // main pebbles
  const fine = makeGrid(44); // micro wrinkles
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const c = smooth(0.0, 0.32, coarse(u, v)); // domed cells, sharp creases
      const f = smooth(0.0, 0.25, fine(u, v));
      const h = Math.min(1, 0.72 * c + 0.28 * f);
      const b = Math.round(h * 255);
      const i = (y * size + x) * 4;
      data[i] = b;
      data[i + 1] = b;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  heightTex = tex;
  return tex;
}

export function applyLeather(mat, opts = {}) {
  const {
    tileMetres = 0.045, // one 14-cell grain tile; ~3 mm pebbles like real automotive leather
    bump = 0.3,
    creaseDark = 0.28,
    roughVar = 0.25,
    tint = [0.62, 0.5, 1.9], // multiplies the baked vertex colour toward deep wine-burgundy
  } = opts;
  const tex = makeHeightTexture();

  // satin finished-leather response
  if (tint) mat.color.setRGB(tint[0], tint[1], tint[2]); // tint: null keeps the material's own colour
  mat.roughness = 0.58;
  mat.metalness = 0;
  mat.clearcoat = 0.08;
  mat.clearcoatRoughness = 0.45;
  mat.sheen = 0.25;
  mat.sheenRoughness = 0.6;
  mat.sheenColor = new THREE.Color('#2a1014');

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLeatherH = { value: tex };
    shader.uniforms.uLeatherScale = { value: 1 / tileMetres };
    shader.uniforms.uLeatherBump = { value: bump };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vLPos;\nvarying vec3 vLNrm;'
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLPos = position;\nvLNrm = normal;');

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vLPos;
        varying vec3 vLNrm;
        uniform sampler2D uLeatherH;
        uniform float uLeatherScale;
        uniform float uLeatherBump;
        vec3 leatherPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
          vec3 sx = normalize(dFdx(surfPos));
          vec3 sy = normalize(dFdy(surfPos));
          vec3 r1 = cross(sy, surfNorm);
          vec3 r2 = cross(surfNorm, sx);
          float det = dot(sx, r1) * faceDir;
          vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
          return normalize(abs(det) * surfNorm - grad);
        }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 lw = pow(abs(normalize(vLNrm)), vec3(4.0));
        lw /= (lw.x + lw.y + lw.z);
        float lhx = texture2D(uLeatherH, vLPos.zy * uLeatherScale).r;
        float lhy = texture2D(uLeatherH, vLPos.xz * uLeatherScale + vec2(0.37, 0.11)).r;
        float lhz = texture2D(uLeatherH, vLPos.xy * uLeatherScale + vec2(0.71, 0.53)).r;
        float leatherH = lhx * lw.x + lhy * lw.y + lhz * lw.z;
        diffuseColor.rgb *= mix(${(1 - creaseDark).toFixed(2)}, 1.0, smoothstep(0.0, 0.6, leatherH));`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (0.55 - leatherH) * ${roughVar.toFixed(2)}, 0.2, 1.0);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        normal = leatherPerturb(-vViewPosition, normal, vec2(dFdx(leatherH), dFdy(leatherH)) * uLeatherBump, faceDirection);`
      );
  };
  mat.customProgramCacheKey = () => 'leather-v1';
  return mat;
}
