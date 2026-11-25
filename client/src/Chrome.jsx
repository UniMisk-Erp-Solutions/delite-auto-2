import { useEffect, useRef, useState } from 'react';
import { BRAND } from './config.js';
import { useShop } from './shopStore.js';
import { Icon } from './components/Bits.jsx';

export const SECTION_IDS = ['home', 'finder', 'categories', 'interior', 'gps', 'trending', 'stats', 'reviews', 'services', 'brands', 'footer'];

// Sets data-theme="light|dark" on `ref` from the section under a probe line, so the nav and
// dots always have the right contrast. (Replaces the old blend-mode trick, which tinted
// colours oddly over the 3D scene.)  probe <= 1 means a fraction of the viewport height.
function useTheme(ref, probe, onTick) {
  useEffect(() => {
    const el = ref.current;
    const sections = [...document.querySelectorAll('.sec, .foot2')];
    let raf = 0;
    const run = () => {
      raf = 0;
      const y = probe <= 1 ? window.innerHeight * probe : probe;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= y && r.bottom > y) {
          const t = s.classList.contains('sec--light') ? 'light' : 'dark';
          if (el.dataset.theme !== t) el.dataset.theme = t;
          break;
        }
      }
      onTick?.(el);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    run();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, [ref, probe, onTick]);
}

export function Nav() {
  const count = useShop((s) => s.count);
  const ref = useRef(null);
  const last = useRef(0);

  // Over the story the nav is transparent. Once the shop starts it becomes a solid bar that
  // slides away while scrolling down and returns on any scroll up.
  const onTick = useRef((el) => {
    const y = window.scrollY;
    const start = (document.getElementById('trending')?.offsetTop ?? Infinity) - 72;
    const solid = y > start;
    el.classList.toggle('is-solid', solid);
    const dy = y - last.current;
    if (Math.abs(dy) >= 8) {
      el.classList.toggle('is-hidden', dy > 0 && solid);
      last.current = y;
    }
  }).current;

  useTheme(ref, 36, onTick);

  return (
    <header className="nav" ref={ref} data-theme="dark">
      <div className="nav__bar">
        <a className="nav__logo" href="#home">{BRAND}</a>
        <nav className="nav__links" aria-label="Primary">
          <a href="#finder">Find my fit</a>
          <a href="#categories">Carpets</a>
          <a href="#trending">Trending</a>
          <a href="/product">3D Explorer</a>
          <a href="/shop">All products</a>
          <a href="#reviews">Reviews</a>
          <a href="#brands">Brands</a>
        </nav>
        <a className="btn btn--outline cartbtn" href="#trending" aria-label={`Cart, ${count} items`}>
          <Icon name="cart" size={18} />
          <span>Cart</span>
          {count > 0 && <b className="cartbtn__n">{count}</b>}
        </a>
      </div>
    </header>
  );
}

// side dots: which section is in the middle of the viewport
export function SideDots() {
  const [active, setActive] = useState('home');
  const ref = useRef(null);
  useTheme(ref, 0.5);
  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -45% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <ul className="dots" ref={ref} data-theme="dark" aria-label="Sections">
      {SECTION_IDS.map((id) => (
        <li key={id}>
          <a href={`#${id}`} aria-label={id} className={id === active ? 'is-active' : ''} />
        </li>
      ))}
    </ul>
  );
}

export function Loader({ model }) {
  const done = model.status !== 'loading';
  const pct = Math.round((model.progress || 0) * 100);
  return (
    <div className={`loader ${done ? 'is-done' : ''}`} aria-hidden={done}>
      <span className="loader__brand">{BRAND}</span>
      <span className="loader__bar">
        <i style={{ transform: `scaleX(${model.progress || 0.08})` }} />
      </span>
      <span className="loader__txt">{pct > 0 ? `Loading model ${pct}%` : 'Loading'}</span>
    </div>
  );
}

export function Toast() {
  const t = useShop((s) => s.toast);
  return (
    <div className="toast" role="status" aria-live="polite">
      {t && <div key={t.id} className="toast__in">{t.msg}</div>}
    </div>
  );
}

export function PlaceholderBadge({ reason }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="badge">
      <span>
        {reason === 'error'
          ? 'Model failed to load — showing placeholder car.'
          : 'Placeholder car — drop your model in server/models.'}
      </span>
      <button type="button" onClick={() => setOpen(false)} aria-label="Dismiss">×</button>
    </div>
  );
}
