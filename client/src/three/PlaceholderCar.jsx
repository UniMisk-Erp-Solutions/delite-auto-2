import { useMemo } from 'react';
import * as THREE from 'three';

// Stand-in MPV (Innova-ish proportions) shown until your real model is dropped into
// server/models. Hollow cabin with seats and dashboard so the interior view works.
// Space: length along X (front = +X), up = +Y, right side = +Z, ground at y = 0.

const PAINT = { color: '#7b818a', metalness: 0.85, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 };
const GLASS = {
  color: '#3a4a5a',
  metalness: 0.9,
  roughness: 0.04,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
};
const PLASTIC = { color: '#0c0c0e', roughness: 0.55, metalness: 0.1 };
const CHROME = { color: '#d9dbdf', metalness: 1, roughness: 0.15 };
const TYRE = { color: '#0d0d0f', roughness: 0.9 };
const LEATHER = { color: '#5b4632', roughness: 0.6 };
const DASH = { color: '#17171a', roughness: 0.5, metalness: 0.15 };

const SIDE = [[-2.3, 0.32], [2.3, 0.32], [2.35, 0.72], [2.02, 0.98], [1.15, 1.08], [-2.15, 1.1], [-2.33, 0.92]];
const FRONT = [[1.1, 0.32], [2.3, 0.32], [2.35, 0.72], [2.02, 0.98], [1.15, 1.08]];
const REAR = [[-2.3, 0.32], [-1.98, 0.32], [-1.98, 1.1], [-2.15, 1.1], [-2.33, 0.92]];
const GREENHOUSE = [[1.08, 1.08], [0.52, 1.72], [-1.95, 1.74], [-2.2, 1.12]];

function profile(points, depth, bevel = 0.02) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    steps: 1,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

function Wheel({ x, z }) {
  const side = Math.sign(z);
  return (
    <group position={[x, 0.37, 0]}>
      <mesh position={[0, 0, side * 0.903]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.02, 32]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>
      <mesh position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.37, 0.37, 0.24, 40]} />
        <meshStandardMaterial {...TYRE} />
      </mesh>
      <mesh position={[0, 0, side * 0.985]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.02, 40]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      <mesh position={[0, 0, side * 0.997]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.02, 20]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>
    </group>
  );
}

function Seat({ x, z, wide = 0.5 }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.5, 0.2, wide]} />
        <meshStandardMaterial {...LEATHER} />
      </mesh>
      <mesh position={[-0.22, 0.95, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.1, 0.55, wide]} />
        <meshStandardMaterial {...LEATHER} />
      </mesh>
      <mesh position={[-0.25, 1.3, 0]}>
        <boxGeometry args={[0.1, 0.18, wide * 0.55]} />
        <meshStandardMaterial {...LEATHER} />
      </mesh>
    </group>
  );
}

export default function PlaceholderCar() {
  const geo = useMemo(
    () => ({
      side: profile(SIDE, 0.1, 0.015),
      front: profile(FRONT, 1.76, 0.02),
      rear: profile(REAR, 1.76, 0.02),
      glass: profile(GREENHOUSE, 1.64, 0.01),
    }),
    []
  );

  return (
    <group>
      {/* body shell */}
      <mesh geometry={geo.side} position={[0, 0, 0.85]}>
        <meshPhysicalMaterial {...PAINT} />
      </mesh>
      <mesh geometry={geo.side} position={[0, 0, -0.85]}>
        <meshPhysicalMaterial {...PAINT} />
      </mesh>
      <mesh geometry={geo.front}>
        <meshPhysicalMaterial {...PAINT} />
      </mesh>
      <mesh geometry={geo.rear}>
        <meshPhysicalMaterial {...PAINT} />
      </mesh>
      <mesh position={[-0.4, 0.4, 0]}>
        <boxGeometry args={[3.3, 0.06, 1.7]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>

      {/* greenhouse + roof */}
      <mesh geometry={geo.glass} renderOrder={2}>
        <meshPhysicalMaterial {...GLASS} />
      </mesh>
      <mesh position={[-0.715, 1.77, 0]}>
        <boxGeometry args={[2.5, 0.06, 1.72]} />
        <meshPhysicalMaterial {...PAINT} />
      </mesh>
      {[-0.3, -1.3].flatMap((x) =>
        [0.84, -0.84].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.42, z]}>
            <boxGeometry args={[0.1, 0.66, 0.05]} />
            <meshStandardMaterial {...PLASTIC} />
          </mesh>
        ))
      )}
      {[0.72, -0.72].map((z) => (
        <mesh key={z} position={[-0.7, 1.84, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 2.3, 12]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>
      ))}

      {/* wheels */}
      <Wheel x={1.38} z={0.86} />
      <Wheel x={1.38} z={-0.86} />
      <Wheel x={-1.37} z={0.86} />
      <Wheel x={-1.37} z={-0.86} />

      {/* lights, grille, mirrors */}
      {[0.62, -0.62].map((z) => (
        <mesh key={`h${z}`} position={[2.2, 0.88, z]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.08, 0.12, 0.4]} />
          <meshStandardMaterial color="#fff7e6" emissive="#fff3d6" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {[0.7, -0.7].map((z) => (
        <mesh key={`t${z}`} position={[-2.31, 0.95, z]}>
          <boxGeometry args={[0.05, 0.14, 0.3]} />
          <meshStandardMaterial color="#b3121b" emissive="#b3121b" emissiveIntensity={0.9} />
        </mesh>
      ))}
      <mesh position={[2.335, 0.58, 0]}>
        <boxGeometry args={[0.04, 0.2, 0.9]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>
      <mesh position={[2.36, 0.58, 0]}>
        <boxGeometry args={[0.02, 0.03, 0.8]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      {[0.98, -0.98].map((z) => (
        <mesh key={`m${z}`} position={[0.95, 1.15, z]}>
          <boxGeometry args={[0.1, 0.1, 0.14]} />
          <meshStandardMaterial {...PLASTIC} />
        </mesh>
      ))}

      {/* cabin: dashboard, steering wheel (right-hand drive), three rows of seats */}
      <mesh position={[0.85, 1.2, 0]}>
        <boxGeometry args={[0.5, 0.2, 1.6]} />
        <meshStandardMaterial {...DASH} />
      </mesh>
      <mesh position={[0.62, 1.02, 0.42]} rotation={[0, Math.PI / 2, 0.25]}>
        <torusGeometry args={[0.17, 0.022, 14, 36]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>
      <Seat x={0.15} z={0.42} />
      <Seat x={0.15} z={-0.42} />
      <Seat x={-0.7} z={0.42} />
      <Seat x={-0.7} z={-0.42} />
      <Seat x={-1.5} z={0} wide={1.3} />
    </group>
  );
}
