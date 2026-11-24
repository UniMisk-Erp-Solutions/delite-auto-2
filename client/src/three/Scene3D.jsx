import { memo, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { store } from '../store.js';
import { sampleKeys, clamp, D } from '../config.js';
import CarModel from './CarModel.jsx';
import Floor from './Floor.jsx';

const damp = THREE.MathUtils.damp;
const lerp = THREE.MathUtils.lerp;

// Procedural studio environment: gives the paint real reflections with zero downloads.
function Studio() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pmrem.fromScene(room, 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = 0.95;
    invalidate();
    return () => {
      scene.environment = null;
      tex.dispose();
      pmrem.dispose();
      room.dispose?.();
    };
  }, [gl, scene, invalidate]);
  return null;
}

const POS = new THREE.Vector3();
const TGT = new THREE.Vector3();
const PIN = new THREE.Vector3();
const sph = (out, az, el) =>
  out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));

// Drives the camera from scroll + pointer. Everything is critically damped, and the
// canvas only renders while something is still moving (frameloop="demand").
function Rig() {
  const { camera, size, invalidate, scene } = useThree();
  const perf = useThree((st) => st.performance);
  const cabin = useRef();
  const m = useRef({ s: store.section });
  const k = useRef({});

  useEffect(() => {
    store.invalidate = invalidate;
    invalidate();
    return () => {
      store.invalidate = () => {};
    };
  }, [invalidate]);

  useEffect(() => {
    invalidate();
  }, [size, invalidate]);

  useFrame((_, rawDt) => {
    // Use the real frame time (only guard against a huge gap after the tab slept). The old
    // 50 ms clamp made slow frames run in slow motion, so the car fell behind the scroll.
    const dt = Math.min(rawDt, 0.25);
    const s = m.current;

    // Smoothing that catches up faster the further the car is behind the scroll position:
    // gentle when you scroll slowly, tight when you fling the page.
    // 3D scene fully off while the shopping sections are on screen: nothing is drawn
    if (scene.visible === store.hidden) {
      scene.visible = !store.hidden;
      invalidate();
    }

    const gap = Math.abs(store.section - s.s);
    s.s = damp(s.s, store.section, 7 + Math.min(gap, 1.5) * 8, dt);
    if (gap > 0.002) perf.regress(); // drop resolution while moving, restore when still

    const kk = sampleKeys(s.s, k.current);
    const aspect = size.width / size.height;
    const dist0 = kk.dist;
    // 0 = outside the car, 1 = inside the cabin
    const inside = 1 - clamp((dist0 - 1.6) / (4 - 1.6), 0, 1);

    // keep the car fully in frame on narrow screens
    const fitExt = clamp(1.78 / aspect, 1, 2.4);
    const dist = dist0 * (1 + (fitExt - 1) * (1 - inside));

    // on-screen placement: side-by-side on desktop, car low + text on top on phones
    const sideK = clamp((aspect - 1) / 0.6, 0, 1);
    const sx = kk.sx * sideK;
    const sy = kk.sy * sideK + -0.25 * (1 - inside) * (1 - sideK);

    TGT.set(kk.tx, kk.ty, kk.tz);

    // camera orbits the car; the interior pose is just the last keyframe
    sph(POS, kk.az * D, clamp(kk.el, -4, 88) * D).multiplyScalar(dist).add(TGT);
    camera.position.copy(POS);
    camera.lookAt(TGT);
    camera.fov = kk.fov;
    camera.setViewOffset(size.width, size.height, -sx * size.width, sy * size.height, size.width, size.height);
    camera.updateProjectionMatrix();

    if (cabin.current) cabin.current.intensity = inside * 2.5 * (1 - clamp(s.s - 3, 0, 1)); // no cabin light on the screen

    // Readability veil for text over the cabin. Driven by the SAME damped camera value, so it
    // cross-fades interior -> GPS exactly with the camera and can never leave a seam.
    const toGps = clamp(s.s - 3, 0, 1);
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--veil-int', (inside * (1 - toGps)).toFixed(3));
    rootStyle.setProperty('--veil-gps', (inside * toGps).toFixed(3));

    // shop-the-interior pins: project each 3D anchor through the live camera
    if (store.hot.length) {
      camera.updateMatrixWorld(true); // matrixWorldInverse is otherwise one frame stale here
      const k = inside * (1 - toGps);
      for (const h of store.hot) {
        PIN.set(h.p[0], h.p[1], h.p[2]).project(camera);
        const on = PIN.z < 1 && Math.abs(PIN.x) < 1.2 && Math.abs(PIN.y) < 1.2;
        const a = on ? k : 0;
        const st = h.el.style;
        const px = (PIN.x * 0.5 + 0.5) * size.width;
        const py = (-PIN.y * 0.5 + 0.5) * size.height;
        st.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
        st.opacity = a.toFixed(3);
        st.visibility = a > 0.02 ? 'visible' : 'hidden'; // hidden pins are not tabbable either
        st.pointerEvents = a > 0.75 ? 'auto' : 'none';
      }
    }

    if (Math.abs(s.s - store.section) > 0.0005) invalidate();
  });

  return <pointLight ref={cabin} position={[0.1, 1.45, 0]} intensity={0} distance={4.5} color="#ffd9a8" />;
}

function Scene3D({ onStatus }) {
  return (
    <Canvas
      className="stage"
      frameloop="demand"
      dpr={[1, 1.75]}
      performance={{ min: 0.6, max: 1, debounce: 220 }}
      camera={{ fov: 28, near: 0.05, far: 80, position: [0, 1, 9] }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl, invalidate }) => {
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
        gl.domElement.addEventListener('webglcontextrestored', () => invalidate());
      }}
    >
      <Studio />
      <directionalLight position={[4, 7, 5]} intensity={1.7} />
      <directionalLight position={[-5, 3, -4]} intensity={1.1} color="#a9c0ff" />
      <Rig />
      <Floor />
      <CarModel onStatus={onStatus} />
    </Canvas>
  );
}

// memo: the page re-renders when the active section changes; the 3D scene must not.
export default memo(Scene3D);
