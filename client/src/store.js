// Tiny mutable store shared between the DOM (scroll) and the WebGL loop.
// Deliberately NOT React state: updating it never re-renders anything.
export const store = {
  section: 0, // fractional section index from scroll
  hidden: false, // true once the page has scrolled past the 3D story
  hot: [], // DOM elements pinned to 3D points: { el, p: [x, y, z] } (moved by the camera rig)
  invalidate: () => {}, // replaced by the r3f canvas once mounted
};
