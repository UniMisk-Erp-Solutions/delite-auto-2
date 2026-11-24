import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { store } from '../store.js';
import { CAR_LENGTH } from '../config.js';
import { applyLeather } from '../three/leather.js';
import { loadPartsModel } from './loadModel.js';
import { makeGhostGlass } from './glass.js';
import { PART_DEFS, GHOST_NAMES, DEMO_GHOST, MANUAL_PINS, LEATHER_MATERIALS, BAKED_COLOR_MATERIALS, nameChain } from './parts.js';

// BVH makes picking on dense meshes instant (this chunk is only loaded on the product page)
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const TARGET = new THREE.Vector3(0, 0.75, 0);
const PIN = new THREE.Vector3();
const eachMat = (m, fn) => (Array.isArray(m) ? m.forEach(fn) : fn(m));
const REAL_CAR_LENGTH_M = 4.75; // Toyota Innova Hybrid, used to size the leather grain in real millimetres

// same procedural leather as the landing page
function leatherize(mat, rawPerMetre) {
  let phys = mat;
  if (!mat.isMeshPhysicalMaterial) {
    phys = new THREE.MeshPhysicalMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(phys, mat);
    phys.name = mat.name;
    phys.vertexColors = mat.vertexColors;
  }
  // baked vertex colours are very dark, so they use the landing page's burgundy tint; a plain material keeps its own colour
  return applyLeather(phys, { ...(phys.vertexColors ? {} : { tint: null }), tileMetres: 0.045 * rawPerMetre });
}

/* ------------------------------------------------------------ environment */
function Studio() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pmrem.fromScene(room, 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = 1;
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

// a quiet studio platform: flat disc, hairline ring, soft contact shadow
function Floor() {
  const shadow = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 128, 6, 128, 128, 128);
    r.addColorStop(0, 'rgba(0,0,0,0.38)');
    r.addColorStop(0.55, 'rgba(0,0,0,0.16)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} renderOrder={-10}>
        <circleGeometry args={[5.4, 96]} />
        <meshBasicMaterial color="#dfe0e3" toneMapped={false} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} renderOrder={-9}>
        <ringGeometry args={[5.4, 5.44, 128]} />
        <meshBasicMaterial color="#c5c7cb" toneMapped={false} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.004} scale={[7.2, 3.6, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------- controls */
function placeCamera(camera, controls, aspect) {
  const fit = Math.min(1.9, Math.max(1, 1.7 / aspect));
  const dist = 9.8 * fit;
  const az = (38 * Math.PI) / 180;
  const el = (13 * Math.PI) / 180;
  camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(TARGET);
  controls.target.copy(TARGET);
  controls.update();
}

function Controls({ resetKey }) {
  const { camera, gl, invalidate, size } = useThree();
  const perf = useThree((s) => s.performance);
  const ref = useRef(null);

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enablePan = false;
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.rotateSpeed = 0.7;
    c.zoomSpeed = 0.8;
    c.minDistance = 3;
    c.maxDistance = 14;
    c.minPolarAngle = Math.PI * 0.14;
    c.maxPolarAngle = Math.PI * 0.495; // never below the floor
    const on = () => {
      perf.regress(); // lower resolution while the camera moves, back to full when it stops
      invalidate();
    };
    c.addEventListener('change', on);
    ref.current = c;
    placeCamera(camera, c, size.width / size.height);
    invalidate();
    return () => {
      c.removeEventListener('change', on);
      c.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl, invalidate]);

  useEffect(() => {
    if (!ref.current || !resetKey) return;
    placeCamera(camera, ref.current, size.width / size.height);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useFrame(() => {
    ref.current?.update(); // fires "change" (-> invalidate) while the damping is still moving
  });
  return null;
}

/* ------------------------------------------------------------------ model */
function classify(root, demo) {
  root.updateMatrixWorld(true);
  // the exporter writes COLOR_0 on every part; only the materials whose colour was baked may use it
  root.traverse((o) => {
    if (o.isMesh && o.material) eachMat(o.material, (m) => { m.vertexColors = BAKED_COLOR_MATERIALS.includes(m.name); });
  });
  // file units per metre: the loader scaled the model to CAR_LENGTH, so raw length = CAR_LENGTH / scale
  const rawPerMetre = CAR_LENGTH / root.scale.x / REAL_CAR_LENGTH_M;

  const ghost = [];
  const partMeshes = [];
  const parts = new Map();

  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const first = Array.isArray(o.material) ? o.material[0] : o.material;
    const matName = first?.name || '';
    // object name + parent names + material name(s): any of them can carry the keyword
    const allMats = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => m?.name || '').join(' ');
    const chain = `${nameChain(o, root)} ${allMats}`;

    const def = PART_DEFS.find((d) => (demo ? d.demoMaterials?.includes(matName) : d.names.test(chain)));
    if (def) {
      // own material per part so hovering one never lights up another
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      if (def.leather) {
        const wrap = (m) => (LEATHER_MATERIALS.includes(m.name) ? leatherize(m, rawPerMetre) : m);
        o.material = Array.isArray(o.material) ? o.material.map(wrap) : wrap(o.material);
      }
      o.userData.partId = def.id;
      o.geometry.computeBoundsTree();
      partMeshes.push(o);
      if (!parts.has(def.id)) parts.set(def.id, { def, meshes: [] });
      parts.get(def.id).meshes.push(o);
      return;
    }
    const isGhost = demo ? DEMO_GHOST.includes(matName) : GHOST_NAMES.test(chain);
    if (isGhost) {
      o.userData.solid = o.material;
      ghost.push(o);
    }
  });

  const glass = makeGhostGlass();
  ghost.forEach((o) => {
    o.material = glass;
    o.renderOrder = 2; // drawn after the opaque parts so they show through
  });

  const list = [];
  for (const def of PART_DEFS) {
    if (parts.has(def.id)) list.push({ id: def.id, label: def.label, product: def.product });
  }
  for (const mp of MANUAL_PINS) list.push({ id: mp.id, label: mp.label, product: mp.product, center: mp.p, manual: true });
  return { ghost, partMeshes, parts, glass, list };
}

// onHover() gets this id while the pointer is over the open card, which keeps it open
export const CARD = '__card';

function Stage({ xray, active, onHover, onReady, onStatus, onSelect, pick, onPick, api }) {
  const { camera, gl, invalidate, size } = useThree();
  const [root, setRoot] = useState(null);
  const data = useRef({ ghost: [], partMeshes: [], parts: new Map() });

  // lets DOM code (the pin) ask for a frame after it registers
  useEffect(() => {
    store.invalidate = invalidate;
    return () => {
      store.invalidate = () => {};
    };
  }, [invalidate]);

  // load + classify
  useEffect(() => {
    let dead = false;
    loadPartsModel((p) => !dead && onStatus({ status: 'loading', progress: p }))
      .then(({ root: r, demo, name }) => {
        if (dead) return;
        data.current = classify(r, demo);
        setRoot(r);
        onReady({ demo, name, parts: data.current.list });
        onStatus({ status: 'ready' });
        invalidate();
      })
      .catch((err) => !dead && onStatus(err.code === 'empty' ? { status: 'empty' } : { status: 'error', error: String(err.message || err) }));
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // for the dock: where to put a part's pin when it was opened without the cursor on the car
  // (the point of the part that is closest to the camera, so it is on the visible side)
  useEffect(() => {
    if (!api) return undefined;
    const camPos = new THREE.Vector3();
    const v = new THREE.Vector3();
    api.current = {
      nearestPoint(id) {
        const e = data.current.parts.get(id);
        if (!e) return null;
        camera.getWorldPosition(camPos);
        let best = null;
        let bd = Infinity;
        for (const m of e.meshes) {
          const pos = m.geometry.attributes.position;
          const step = Math.max(1, Math.floor(pos.count / 12000));
          m.updateWorldMatrix(true, false);
          for (let i = 0; i < pos.count; i += step) {
            v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
            const d = v.distanceToSquared(camPos);
            if (d < bd) {
              bd = d;
              best = [v.x, v.y, v.z];
            }
          }
        }
        return best;
      },
    };
    return () => {
      api.current = null;
    };
  }, [api, camera, root]);

  // X-ray on/off: ghost glass <-> the original solid paint
  useEffect(() => {
    for (const o of data.current.ghost) o.material = xray ? data.current.glass : o.userData.solid;
    invalidate();
  }, [xray, root, invalidate]);

  // highlight the active part (a gentle lift, not a glow)
  useEffect(() => {
    for (const [id, e] of data.current.parts) {
      const on = id === active;
      for (const m of e.meshes) {
        eachMat(m.material, (mat) => {
          if (!mat.emissive) return;
          mat.emissive.setHex(on ? 0xffffff : 0x000000);
          mat.emissiveIntensity = on ? 0.14 : 0;
        });
      }
    }
    invalidate();
  }, [active, root, invalidate]);

  // hover picking on the shoppable parts only (ghost panels never block it)
  useEffect(() => {
    if (!root) return undefined;
    const el = gl.domElement;
    const rc = new THREE.Raycaster();
    rc.firstHitOnly = true;
    const ndc = new THREE.Vector2();
    let raf = 0;
    let ev = null;
    let last = null;
    let touch = false;

    const PROBE = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]];
    const pick3d = (e) => {
      const r = el.getBoundingClientRect();
      for (const [dx, dy] of PROBE) {
        ndc.set(((e.clientX + dx - r.left) / r.width) * 2 - 1, -((e.clientY + dy - r.top) / r.height) * 2 + 1);
        rc.setFromCamera(ndc, camera);
        const h = rc.intersectObjects(data.current.partMeshes, false)[0];
        if (h) return h;
      }
      return null;
    };
    const run = () => {
      raf = 0;
      if (!ev) return;
      const hit = pick3d(ev);
      const id = hit ? hit.object.userData.partId : null;
      onHover(id, hit ? [hit.point.x, hit.point.y, hit.point.z] : null, ev.clientX);
      if (id !== last) {
        last = id;
        el.style.cursor = id ? 'pointer' : 'grab';
      }
    };
    const move = (e) => {
      touch = e.pointerType === 'touch';
      if (touch || e.buttons) return; // touch uses taps; dragging never counts as hovering
      if (e.target !== el) {
        // over the open card (it stays) or any other page element (that counts as leaving the car)
        ev = null;
        last = null;
        onHover(e.target.closest?.('.hot') ? CARD : null);
        return;
      }
      ev = e;
      if (!raf) raf = requestAnimationFrame(run);
    };
    const leave = (e) => {
      if (e.relatedTarget) return; // only when the pointer leaves the window
      ev = null;
      last = null;
      onHover(null);
    };
    let dn = null;
    const down = (e) => {
      touch = e.pointerType === 'touch';
      dn = { x: e.clientX, y: e.clientY };
      el.style.cursor = 'grabbing';
    };
    const up = (e) => {
      el.style.cursor = last ? 'pointer' : 'grab';
      if (!dn) return;
      const moved = Math.hypot(e.clientX - dn.x, e.clientY - dn.y);
      dn = null;
      if (moved > 6) return; // that was a drag (rotate), not a click
      const hit = pick3d(e);
      onSelect(hit ? hit.object.userData.partId : null, hit ? [hit.point.x, hit.point.y, hit.point.z] : null, e.clientX);
    };

    el.style.cursor = 'grab';
    window.addEventListener('pointermove', move);
    document.documentElement.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
    };
  }, [root, camera, gl, onHover, onSelect]);

  // /product?pick : click any spot on the car to get its exact 3D coordinates for a manual pin
  useEffect(() => {
    if (!pick || !root) return undefined;
    root.traverse((o) => {
      if (o.isMesh && !o.geometry.boundsTree) o.geometry.computeBoundsTree();
    });
    const el = gl.domElement;
    const rc = new THREE.Raycaster();
    rc.firstHitOnly = true;
    const ndc = new THREE.Vector2();
    let down = null;
    const onDown = (e) => {
      down = [e.clientX, e.clientY];
    };
    const onUp = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5; // a drag is a rotation, not a pick
      down = null;
      if (moved) return;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      rc.setFromCamera(ndc, camera);
      const solids = [];
      root.traverse((o) => o.isMesh && !data.current.ghost.includes(o) && solids.push(o));
      const hit = rc.intersectObjects(solids, false)[0] || rc.intersectObjects(data.current.ghost, false)[0];
      if (!hit) return;
      const mat = Array.isArray(hit.object.material) ? hit.object.material[0] : hit.object.material;
      onPick({
        p: [hit.point.x, hit.point.y, hit.point.z].map((v) => +v.toFixed(3)),
        object: hit.object.name || hit.object.parent?.name || '(unnamed)',
        material: hit.object.userData.solid?.name || mat?.name || '(unnamed)',
      });
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
    };
  }, [pick, root, camera, gl, onPick]);

  // keep the DOM pin glued to its 3D point through the live camera
  useFrame(() => {
    if (!store.hot.length) return;
    camera.updateMatrixWorld(true);
    for (const h of store.hot) {
      PIN.set(h.p[0], h.p[1], h.p[2]).project(camera);
      const on = PIN.z < 1 && Math.abs(PIN.x) < 1.1 && Math.abs(PIN.y) < 1.1;
      const px = (PIN.x * 0.5 + 0.5) * size.width;
      const py = (-PIN.y * 0.5 + 0.5) * size.height;
      const st = h.el.style;
      st.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      st.opacity = on ? '1' : '0';
      st.visibility = on ? 'visible' : 'hidden';
      st.pointerEvents = on ? 'auto' : 'none';
      // the card opens toward the centre; it only flips once the pin is clearly past it
      const cur = h.el.dataset.side;
      const side = cur === 'left' ? (px < size.width * 0.42 ? 'right' : 'left') : cur === 'right' ? (px > size.width * 0.58 ? 'left' : 'right') : px > size.width * 0.5 ? 'left' : 'right';
      if (cur !== side) h.el.dataset.side = side;
    }
  });

  return root ? <primitive object={root} /> : null;
}

/* ------------------------------------------------------------------ canvas */
function ProductScene({ xray, active, onHover, onReady, onStatus, onSelect, resetKey, pick, onPick, api }) {
  return (
    <Canvas
      className="pp__canvas"
      frameloop="demand"
      dpr={[1, 1.5]}
      performance={{ min: 0.6, max: 1, debounce: 220 }}
      camera={{ fov: 30, near: 0.1, far: 100, position: [6, 2.6, 8] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1 }}
      onCreated={({ gl, invalidate }) => {
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
        gl.domElement.addEventListener('webglcontextrestored', () => invalidate());
      }}
    >
      <Studio />
      <directionalLight position={[4, 7, 5]} intensity={1.4} />
      <directionalLight position={[-5, 3, -4]} intensity={0.8} color="#cfe0ff" />
      <Floor />
      <Controls resetKey={resetKey} />
      <Stage xray={xray} active={active} onHover={onHover} onReady={onReady} onStatus={onStatus} onSelect={onSelect} pick={pick} onPick={onPick} api={api} />
    </Canvas>
  );
}

export default memo(ProductScene);
