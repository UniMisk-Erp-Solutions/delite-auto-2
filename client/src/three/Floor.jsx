import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { store } from '../store.js';
import { xrayLevel } from './xray.js';

const damp = THREE.MathUtils.damp;
const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Hero environment: a twilight desert behind the car, and the floor it stands on.
//
// Everything static is a Blender Cycles render (tools/bake_hero_world.py), all from ONE 3D scene so the
// pieces agree with each other:
//   hero-sky.jpg           the backdrop (sky, stars, dunes, rock, haze) seen from the hero camera position,
//                          a 90 x 46 degree sector, wrapped on a dome around that position
//   hero-floor-light.jpg   the studio pool of light on the ground under the car (with the sand's grain)
//   hero-floor-shadow.jpg  how much the car darkens that ground (soft contact shadow + the moonlit shadow)
// The floor plane does not paint its own colour: it samples the SAME backdrop image along the view ray (so
// it IS the landscape's ground), darkens it by the car's shadow, adds the pool of light, and adds the live
// wet-floor reflection. Re-run the script if the car model, the page background or the hero camera changes.
//
// The reflection is live (the same car mirrored, so paint and lights match): blurred more and fainter the
// further it is from the car, bent sideways a little by the wet ground, strongest at grazing angles.
//
// All of it belongs to the hero shot: it fades out as the camera leaves the side view (and neither the dome
// nor the mirror is drawn once it is gone). A hemisphere light plus two edge lights tint the car with the sky.

const PLANE_W = 20;
const PLANE_D = 11.25;
const PLANE_Z = 0.5;
const CAR_NEAR_SIDE = 1.05; // z of the car's near flank: reflections start here
const CAM = new THREE.Vector3(0, 1.548, 9.976); // hero camera position the backdrop was rendered from
const LON = 45; // degrees either side
const LAT0 = -20;
const LAT1 = 26;
const D2R = Math.PI / 180;
const BG_LIN = 0.0033; // page background #0b0b0c, linear

// ---------------------------------------------------------------- the dome
function makeDomeGeometry(radius = 60, nx = 72, ny = 40) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let j = 0; j <= ny; j++) {
    const v = j / ny;
    const lat = (LAT0 + (LAT1 - LAT0) * v) * D2R;
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const lon = (-LON + 2 * LON * u) * D2R;
      pos.push(Math.sin(lon) * Math.cos(lat) * radius, Math.sin(lat) * radius, -Math.cos(lon) * Math.cos(lat) * radius);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

const DOME_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const DOME_FRAG = /* glsl */ `
  uniform sampler2D tSky;
  uniform float uMix;
  uniform float uMirror;
  uniform vec3 uBg;
  varying vec2 vUv;
  void main() {
    if (uMirror > 0.5) {
      gl_FragColor = vec4(0.0); // not part of the floor's reflection: only the car is
      return;
    }
    vec3 c = mix(uBg, texture2D(tSky, vUv).rgb, uMix);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

// ---------------------------------------------------------------- the floor
const VERT = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vRefl;
  varying vec2 vTex;
  varying vec3 vWorld;
  void main() {
    vRefl = textureMatrix * vec4(position, 1.0);
    vTex = uv;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 color;
  uniform sampler2D tDiffuse;
  uniform sampler2D tSky;
  uniform sampler2D tLight;
  uniform sampler2D tShadow;
  uniform float uOpacity;
  uniform float uStrength;
  uniform float uNear;
  uniform vec3 uCam;
  uniform vec4 uRange; // lon half-range, lat min, lat max (radians)
  varying vec4 vRefl;
  varying vec2 vTex;
  varying vec3 vWorld;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // display-referred look of the reflected car (the page renders the car with ACES)
  vec3 aces(vec3 x) {
    x *= 0.85;
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }

  void main() {
    // the landscape's own ground: the backdrop image along this view ray
    // where this view ray meets the backdrop dome (radius 60 around uCam), as a direction from uCam
    vec3 rd = normalize(vWorld - cameraPosition);
    vec3 oc = cameraPosition - uCam;
    float bq = dot(oc, rd);
    float cq = dot(oc, oc) - 3600.0;
    float tq = -bq + sqrt(max(bq * bq - cq, 0.0));
    vec3 dir = normalize(cameraPosition + rd * tq - uCam);
    float lon = atan(dir.x, -dir.z);
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    vec2 suv = vec2((lon / uRange.x) * 0.5 + 0.5, (lat - uRange.y) / (uRange.z - uRange.y));
    vec3 ground = texture2D(tSky, clamp(suv, 0.001, 0.999)).rgb;

    vec3 base = ground * texture2D(tShadow, vTex).rgb + texture2D(tLight, vTex).rgb;

    // metres in front of the car's near side: the reflected part of the car gets higher (and blurrier,
    // fainter) the further the floor point is from the contact line
    float d = max(vWorld.z - uNear, 0.0);
    float spread = smoothstep(0.0, 3.4, d);

    // wet ground: slightly uneven, so the mirror image wobbles sideways in long horizontal streaks
    float n1 = vnoise(vec2(vWorld.x * 0.8, vWorld.z * 34.0)) - 0.5;
    float n2 = vnoise(vec2(vWorld.x * 6.0, vWorld.z * 110.0)) - 0.5;
    vec2 uv = vRefl.xy / vRefl.w;
    uv.x += (n1 * 0.010 + n2 * 0.0035) * (0.35 + spread);

    float rad = mix(0.0018, 0.022, spread);
    float lod = mix(0.6, 3.4, spread);
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      float a = float(i) * 2.39996;
      float r = sqrt((float(i) + 0.5) / 16.0);
      vec2 o = vec2(cos(a) * 0.8, sin(a) * 1.35) * r * rad; // smeared a little more vertically
      acc += texture2D(tDiffuse, uv + o, lod).rgb;
    }
    acc /= 16.0;
    vec3 refl = aces(acc);

    // Fresnel: strong when we look along the floor, plus damp and dry patches. Near the car the mirror shows
    // the car; further out it only shows a faint sheen of the sky.
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = 0.05 + 0.95 * pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
    float wet = 0.62 + 0.38 * vnoise(vWorld.xz * vec2(0.55, 1.4));
    float fade = 1.0 - smoothstep(0.0, 3.8, d);
    float k = uStrength * fres * wet * fade;

    vec3 col = base + refl * k;
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

export default function Floor() {
  const { scene, gl, invalidate } = useThree();
  const rig = useRef({ spot: null, rimL: null, rimR: null, hemi: null, blob: null, h: 1 });

  const parts = useMemo(() => {
    const load = (url) => {
      const t = new THREE.TextureLoader().load(url, () => invalidate());
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 16;
      return t;
    };
    const sky = load('/floor/hero-sky.jpg');
    sky.wrapS = sky.wrapT = THREE.ClampToEdgeWrapping;
    const light = load('/floor/hero-floor-light.jpg');
    const shadow = load('/floor/hero-floor-shadow.jpg');

    // dome
    const dome = new THREE.Mesh(
      makeDomeGeometry(),
      new THREE.ShaderMaterial({
        uniforms: { tSky: { value: sky }, uMix: { value: 1 }, uMirror: { value: 0 }, uBg: { value: new THREE.Color(BG_LIN, BG_LIN, BG_LIN) } },
        vertexShader: DOME_VERT,
        fragmentShader: DOME_FRAG,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      })
    );
    dome.position.copy(CAM);
    dome.renderOrder = -10; // opaque and first: everything else draws over it
    dome.frustumCulled = false;
    dome.userData.floor = true;

    // floor
    const floor = new Reflector(new THREE.PlaneGeometry(PLANE_W, PLANE_D), {
      textureWidth: 1280,
      textureHeight: 720,
      multisample: 4,
      clipBias: 0.003,
      shader: {
        name: 'HeroFloor',
        uniforms: {
          color: { value: null },
          tDiffuse: { value: null },
          textureMatrix: { value: null },
          tSky: { value: sky },
          tLight: { value: light },
          tShadow: { value: shadow },
          uOpacity: { value: 1 },
          uStrength: { value: 0.7 },
          uNear: { value: CAR_NEAR_SIDE },
          uCam: { value: CAM.clone() },
          uRange: { value: new THREE.Vector4(LON * D2R, LAT0 * D2R, LAT1 * D2R, 0) },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      },
    });
    // mip-mapped mirror image: the shader picks blur by sampling coarser levels
    const rt = floor.getRenderTarget();
    rt.texture.generateMipmaps = true;
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    floor.material.transparent = true;
    floor.material.depthWrite = false;
    floor.material.toneMapped = false;
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.001, PLANE_Z);
    floor.renderOrder = -3;
    floor.userData.floor = true;
    dome.onBeforeRender = (renderer, scn, cam) => {
      dome.material.uniforms.uMirror.value = cam === floor.camera ? 1 : 0;
    };
    return { dome, floor, textures: [sky, light, shadow] };
  }, [invalidate]);

  useEffect(() => {
    const group = new THREE.Group();
    const spot = new THREE.SpotLight('#fff3e2', 0, 0, 0.62, 1, 0); // from above and a little behind the car
    spot.position.set(-0.8, 6.5, -1.2);
    spot.target.position.set(0, 0, 0.3);
    const rimL = new THREE.DirectionalLight('#aebfff', 0); // cool edge light, behind-left: the highlight along the shoulder
    rimL.position.set(-6, 2.2, -4.5);
    rimL.userData.hero = true;
    const rimR = new THREE.DirectionalLight('#ffc9a0', 0); // warm edge light, behind-right: matches the glow in the valley
    rimR.position.set(6, 1.8, -3.2);
    rimR.userData.hero = true;
    const hemi = new THREE.HemisphereLight('#8f9cc8', '#1b1c26', 0); // the twilight sky tints the paint
    group.add(spot, spot.target, rimL, rimR, hemi);
    scene.add(group);
    scene.add(parts.dome);
    rig.current = { ...rig.current, spot, rimL, rimR, hemi };
    return () => {
      scene.remove(group);
      scene.remove(parts.dome);
      if (rig.current.base) {
        for (const [l, i] of rig.current.base.dirs) l.intensity = i;
        scene.environmentIntensity = rig.current.base.env;
        gl.toneMappingExposure = rig.current.base.exp;
      }
      parts.textures.forEach((t) => t.dispose());
      parts.dome.geometry.dispose();
      parts.dome.material.dispose();
      parts.floor.dispose?.();
    };
  }, [scene, gl, parts]);

  // hero factor: 1 on the side view, 0 once the camera has moved on
  useFrame((_, rawDt) => {
    const r = rig.current;
    if (!r.spot) return;
    // the car's old soft blob shadow would muddy the rendered shadow: fade it while the floor is shown
    if (!r.blob) {
      scene.traverse((o) => {
        if (o.isMesh && !o.userData.floor && o.scale.x === 6.4 && o.scale.y === 3.3) r.blob = o;
      });
    }
    const target = 1 - smooth(0.1, 0.75, store.section);
    const h = damp(r.h, target, 6, Math.min(rawDt, 0.25));
    r.h = h;
    // the page's own studio lights (and the paint's environment reflections) are turned down while the
    // twilight scene is on: the car is lit mostly by the edge lights, like it stands in this valley
    if (!r.base && scene.environment) {
      const dirs = [];
      scene.traverse((o) => {
        if (o.isDirectionalLight && !o.userData.hero) dirs.push([o, o.intensity]);
      });
      r.base = { dirs, env: scene.environmentIntensity, exp: gl.toneMappingExposure };
    }
    if (r.base) {
      for (const [l, i] of r.base.dirs) l.intensity = i * (1 - 0.65 * h);
      scene.environmentIntensity = r.base.env * (1 - 0.5 * h);
      gl.toneMappingExposure = r.base.exp * (1 - 0.14 * h);
    }
    r.spot.intensity = 0;
    r.rimL.intensity = 2.8 * h;
    r.rimR.intensity = 2.2 * h;
    r.hemi.intensity = 0.35 * h;
    parts.floor.material.uniforms.uOpacity.value = h;
    parts.dome.material.uniforms.uMix.value = h;
    const on = h > 0.003;
    parts.floor.visible = on; // hidden = the mirror pass is skipped entirely
    parts.dome.visible = on;
    if (r.blob) {
      // the car's soft ground shadow: gone while the hero scene is on, and gone again in the top-view X-ray
      // section, where a dark patch under a see-through car only muddies it
      r.blob.material.opacity = (1 - 0.97 * h) * (1 - xrayLevel());
      r.blob.visible = r.blob.material.opacity > 0.003;
    }
    if (Math.abs(h - target) > 0.001) invalidate();
  });

  return <primitive object={parts.floor} />;
}
