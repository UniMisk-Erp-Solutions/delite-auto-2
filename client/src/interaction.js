import { useEffect, useState } from 'react';
import { store } from './store.js';
import { HIDE_AFTER_VH } from './config.js';

// Scroll -> fractional section index (0 .. N-1) + which section is active.
export function useScrollProgress() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    let tops = [];

    const update = () => {
      const y = window.scrollY;
      let s = 0;
      for (let i = 0; i < tops.length - 1; i++) {
        if (y >= tops[i]) s = i + Math.min(1, (y - tops[i]) / (tops[i + 1] - tops[i]));
      }
      store.section = s;
      // once the shopping part of the page is reached the 3D scene is switched off
      const hide = tops.length > 0 && y > tops[tops.length - 1] + window.innerHeight * HIDE_AFTER_VH;
      if (hide !== store.hidden) {
        store.hidden = hide;
        store.invalidate();
      }
      setActive(Math.round(s));
      store.invalidate();
    };

    const measure = () => {
      tops = [...document.querySelectorAll('[data-section]')].map(
        (el) => el.getBoundingClientRect().top + window.scrollY
      );
      update();
    };

    measure();
    // preview helper: /?section=4 opens the page already scrolled to that section
    const jump = Number(new URLSearchParams(location.search).get('section'));
    if (jump > 0 && tops[jump] !== undefined) window.scrollTo({ top: tops[jump], behavior: 'instant' });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', measure);
      window.removeEventListener('load', measure);
      ro.disconnect();
    };
  }, []);

  return active;
}

// Fade/slide elements in once as they enter the viewport.
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
