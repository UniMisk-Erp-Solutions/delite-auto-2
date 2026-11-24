import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { CAR_LENGTH, MODEL } from '../config.js';
import { getManifest } from '../modelSource.js';

// Orient, scale and centre any car: length along X, front toward +X, wheels on y = 0.
// (same rules as the landing page, so ?flip=1 / ?yaw=90 / ?up=z work here too)
function normalise(root) {
  const pre = new THREE.Group();
  pre.add(root);
  if (MODEL.up === 'z') pre.rotation.x = -Math.PI / 2;
  pre.updateMatrixWorld(true);

  let size = new THREE.Box3().setFromObject(pre).getSize(new THREE.Vector3());
  const yaw = new THREE.Group();
  yaw.add(pre);
  if (size.z > size.x) yaw.rotation.y = Math.PI / 2;
  yaw.rotation.y += MODEL.yawDeg * (Math.PI / 180) + (MODEL.flip ? Math.PI : 0);
  yaw.updateMatrixWorld(true);

  size = new THREE.Box3().setFromObject(yaw).getSize(new THREE.Vector3());
  const wrapper = new THREE.Group();
  wrapper.add(yaw);
  wrapper.scale.setScalar(CAR_LENGTH / size.x);
  wrapper.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(wrapper);
  const c = box.getCenter(new THREE.Vector3());
  wrapper.position.set(-c.x, -box.min.y, -c.z);
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

// Loads the separate-parts model (server/models/*parts*.glb). It never touches the landing model,
// except for the explicit preview /product?demo.
export async function loadPartsModel(onProgress) {
  const demo = new URLSearchParams(window.location.search).has('demo'); // explicit preview only
  const manifest = await getManifest('parts', { demo });
  const { model } = manifest;
  if (!model) {
    const err = new Error('No parts model found');
    err.code = 'empty'; // shown as friendly setup instructions, not as a failure
    throw err;
  }
  if (model.type === 'obj') throw new Error('The product page needs a .glb or .gltf file (OBJ cannot keep separate parts reliably).');

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loader.loadAsync(model.url, (e) =>
    onProgress?.(Math.min(1, e.loaded / (e.lengthComputable && e.total ? e.total : model.bytes || e.loaded || 1)))
  );
  draco.dispose();
  return { root: normalise(gltf.scene), demo: !!manifest.fallback, name: model.name };
}
