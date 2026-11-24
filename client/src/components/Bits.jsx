import { useEffect, useRef, useState } from 'react';
import { inr, off } from '../data/products.js';
import { shop } from '../shopStore.js';
import ProductArt from './ProductArt.jsx';

export const Icon = ({ name, size = 26 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    car: <><path d="M3 15l1.6-5A2 2 0 016.5 8.6h11a2 2 0 011.9 1.4L21 15" /><rect x="2" y="15" width="20" height="4" rx="1.6" /><circle cx="7" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></>,
    seat: <><path d="M7 3h6a2 2 0 012 2l-.7 8H8L7 3z" /><path d="M8 13l-2 5h10l-1-5" /><path d="M5 21h14" /></>,
    bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></>,
    chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
    drop: <><path d="M12 3s6 6.2 6 10.2A6 6 0 016 13.2C6 9.2 12 3 12 3z" /></>,
    shield: <><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
    wrench: <><path d="M14.7 6.3a4 4 0 005.4 5.4l-9.9 9.9a2.1 2.1 0 01-3-3l9.9-9.9a4 4 0 01-2.4-2.4z" /></>,
    truck: <><path d="M2 6h11v10H2zM13 10h5l3 3v3h-8" /><circle cx="6" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
    ret: <><path d="M3 12a9 9 0 109-9H7" /><path d="M7 3L4 6l3 3" /></>,
    cart: <><path d="M3 4h2.4l2 10.2a1 1 0 001 .8h8.3a1 1 0 001-.8L19 8H6" /><circle cx="9" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></>,
    heart: <path d="M12 20s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    left: <path d="M15 5l-7 7 7 7" />,
    right: <path d="M9 5l7 7-7 7" />,
    pin: <><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  };
  return <svg {...p}>{paths[name]}</svg>;
};

export const Stars = ({ value, size = 14 }) => (
  <span className="stars" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill={i <= Math.round(value) ? 'currentColor' : 'rgba(128,128,128,.35)'} />
      </svg>
    ))}
  </span>
);

export function ProductCard({ p, dark = false }) {
  const [liked, setLiked] = useState(false);
  return (
    <article className={`pcard ${dark ? 'pcard--dark' : ''}`}>
      <div className="pcard__media">
        {p.badge && <span className={`pcard__badge ${p.badge.startsWith('-') ? 'is-off' : ''}`}>{p.badge}</span>}
        <button type="button" className={`pcard__like ${liked ? 'is-on' : ''}`} onClick={() => setLiked((v) => !v)} aria-label="Save to wishlist" aria-pressed={liked}>
          <Icon name="heart" size={18} />
        </button>
        <ProductArt type={p.art} image={p.image} alt={p.name} />
      </div>
      <div className="pcard__body">
        <span className="pcard__cat">{p.cat}</span>
        <h3 className="pcard__name">{p.name}</h3>
        <div className="pcard__rate"><Stars value={p.rating} /><span>{p.rating} · {new Intl.NumberFormat('en-IN').format(p.reviews)}</span></div>
        <div className="pcard__buy">
          <div className="pcard__price">
            <strong>{inr(p.price)}</strong>
            <s>{inr(p.mrp)}</s>
            <em>{off(p)}% off</em>
          </div>
          <button type="button" className="pcard__add" onClick={() => shop.add(p.name)} aria-label={`Add ${p.name} to cart`}>
            <Icon name="cart" size={18} /><span>Add</span>
          </button>
        </div>
      </div>
    </article>
  );
}

// counts up once when scrolled into view
export function CountUp({ to, decimals = 0, suffix = '', duration = 1600 }) {
  const ref = useRef(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        setV(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  const shown = decimals ? v.toFixed(decimals) : new Intl.NumberFormat('en-IN').format(Math.round(v));
  return <span ref={ref}>{shown}{suffix}</span>;
}
