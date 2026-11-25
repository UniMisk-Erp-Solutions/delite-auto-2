import * as THREE from 'three';

// "X-ray" ghost glass for the exterior shell.
//
// Plain low opacity looks like a washed-out plastic film. Real glass is nearly clear when you
// look straight through it and gets brighter and more reflective toward the edges (Fresnel).
// This material does exactly that: opacity and a soft white rim both rise with the viewing
// angle, and the studio environment is reflected on top. No refraction pass is needed, so it is
// cheap even on a very dense model.
export function makeGhostGlass() {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xdfe7ee,
    metalness: 0,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.35,
    transparent: true,
    depthWrite: false, // never hides the parts behind it
    side: THREE.FrontSide, // one layer per panel: far-side panels face away and are skipped
  });

  // 1 = the full X-ray look (what /product uses). The landing page lowers it to fade the X-ray in and out
  // as you scroll (m.userData.fade.value, see three/xray.js).
  const fade = { value: 1 };
  m.userData.fade = fade;

  m.onBeforeCompile = (shader) => {
    shader.uniforms.uAlphaMin = { value: 0.05 }; // looking straight through
    shader.uniforms.uAlphaMax = { value: 0.6 }; // at grazing angles
    shader.uniforms.uFresnelPow = { value: 2.2 };
    shader.uniforms.uFade = fade;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uAlphaMin;
        uniform float uAlphaMax;
        uniform float uFresnelPow;
        uniform float uFade;`
      )
      .replace(
        '#include <opaque_fragment>',
        `float ghostFres = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), uFresnelPow);
        outgoingLight += vec3(0.86, 0.91, 0.96) * ghostFres * 0.32;
        diffuseColor.a = mix(uAlphaMin, uAlphaMax, ghostFres) * uFade;
        #include <opaque_fragment>`
      );
  };
  m.customProgramCacheKey = () => 'ghost-glass-v2';
  return m;
}
