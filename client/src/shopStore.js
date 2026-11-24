import { useSyncExternalStore } from 'react';

// Tiny shared store for cart count, the shopper's vehicle and a toast. No backend yet:
// the vehicle is remembered in localStorage so returning visitors see "your" accessories.
const KEY = 'delite.vehicle';

const loadVehicle = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
};

let state = { count: 0, vehicle: loadVehicle(), toast: null };
const subs = new Set();
let toastTimer = 0;

const set = (patch) => {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
};

export const shop = {
  add(name) {
    set({ count: state.count + 1 });
    shop.toast(`Added to cart: ${name}`);
  },
  setVehicle(v) {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* private mode: fine */
    }
    set({ vehicle: v });
  },
  toast(msg) {
    clearTimeout(toastTimer);
    set({ toast: { msg, id: Date.now() } });
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  },
};

export const useShop = (select) =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => select(state),
    () => select(state)
  );
