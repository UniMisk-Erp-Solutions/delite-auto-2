import { useEffect, useMemo, useRef, useState } from 'react';
import { VEHICLES, YEARS, POPULAR, fitmentCount } from '../data/vehicles.js';
import { CATEGORIES, PRODUCTS, inr } from '../data/products.js';
import { shop } from '../shopStore.js';
import { store } from '../store.js';
import { HOTSPOTS } from '../config.js';
import { Icon } from '../components/Bits.jsx';
import PinCard from '../components/PinCard.jsx';

const Tag = ({ children }) => <span className="tag reveal">{children}</span>;

/* 1 · HERO — side view ------------------------------------------------------ */
export function Hero() {
  return (
    <section id="home" data-section className="sec sec--dark sec--hero">
      <div className="sec__inner hero">
        <h1 className="hero__title reveal">Luxury car accessories</h1>
        <p className="hero__sub reveal" style={{ '--d': '.12s' }}>
          India&rsquo;s smartest store for car &amp; bike accessories. Guaranteed fitment
          <br />
          for 800+ models, free expert fitting in 120+ cities.
        </p>
        <div className="hero__actions reveal" style={{ '--d': '.24s' }}>
          <a className="btn btn--solid" href="#trending">Shop trending <Icon name="arrow" size={18} /></a>
          <a className="btn btn--ghost" href="#finder">Find my vehicle</a>
        </div>
      </div>
    </section>
  );
}

/* 2 · FIND YOUR FIT — front view -------------------------------------------- */
export function Finder() {
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('delite.vehicle'));
    } catch {
      return null;
    }
  }, []);
  const [type, setType] = useState(saved?.type || 'Car');
  const [brand, setBrand] = useState(saved?.brand || '');
  const [model, setModel] = useState(saved?.model || '');
  const [year, setYear] = useState(saved?.year || '');

  const brands = Object.keys(VEHICLES[type]);
  const models = brand ? VEHICLES[type][brand] || [] : [];
  const ready = brand && model;

  useEffect(() => {
    if (brand && !VEHICLES[type][brand]) setBrand('');
  }, [type, brand]);

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    shop.setVehicle({ type, brand, model, year });
    shop.toast(`Showing ${fitmentCount(brand, model)} accessories for ${brand} ${model}`);
    document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="finder" data-section className="sec sec--dark">
      <div className="sec__inner" data-side="left">
        <div className="copy copy--f">
          <Tag>Find your fit</Tag>
          <h2 className="h2 reveal">Accessories made for your exact vehicle.</h2>
          <p className="lead reveal">Pick your ride once and we&rsquo;ll only show parts that are guaranteed to fit.</p>

          <form className="finder reveal" onSubmit={submit}>
            <div className="finder__tabs" role="tablist" aria-label="Vehicle type">
              {['Car', 'Bike'].map((t) => (
                <button key={t} type="button" role="tab" aria-selected={type === t} className={type === t ? 'is-on' : ''}
                  onClick={() => { setType(t); setBrand(''); setModel(''); }}>
                  {t}
                </button>
              ))}
            </div>
            <div className="finder__grid">
              <label>
                <span>Brand</span>
                <select value={brand} onChange={(e) => { setBrand(e.target.value); setModel(''); }}>
                  <option value="">Select brand</option>
                  {brands.map((b) => <option key={b}>{b}</option>)}
                </select>
              </label>
              <label>
                <span>Model</span>
                <select value={model} onChange={(e) => setModel(e.target.value)} disabled={!brand}>
                  <option value="">{brand ? 'Select model' : 'Model'}</option>
                  {models.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label>
                <span>Year</span>
                <select value={year} onChange={(e) => setYear(e.target.value)} disabled={!model}>
                  <option value="">Any year</option>
                  {YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
              </label>
            </div>
            <button type="submit" className="btn btn--solid btn--block" disabled={!ready}>
              {ready ? `Show ${fitmentCount(brand, model)} accessories` : 'Select your vehicle'} <Icon name="arrow" size={18} />
            </button>
          </form>

          <div className="chips reveal">
            <span>Popular:</span>
            {POPULAR.map((v) => (
              <button key={v.model} type="button" onClick={() => { setType(v.type); setBrand(v.brand); setModel(v.model); }}>
                {v.model}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* 3 · CATEGORIES — top view ------------------------------------------------- */
export function Categories() {
  return (
    <section id="categories" data-section className="sec sec--light">
      <div className="sec__inner" data-side="right">
        <div className="copy copy--wide">
          <Tag>Categories</Tag>
          <h2 className="h2 reveal">Shop by category.</h2>
          <p className="lead reveal">From the roof to the floor mats, everything your vehicle needs in one place.</p>
          <ul className="cats">
            {CATEGORIES.map((c, i) => (
              <li key={c.id} className="reveal" style={{ '--d': `${0.1 + i * 0.06}s` }}>
                <a href="#trending" className="cat">
                  <span className="cat__icon"><Icon name={c.icon} size={28} /></span>
                  <span className="cat__txt">
                    <strong>{c.name}</strong>
                    <small>{c.blurb}</small>
                  </span>
                  <span className="cat__count">{new Intl.NumberFormat('en-IN').format(c.count)}+</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* 4 · INTERIOR — shop the cabin through pins fixed to the real car ----------- */
function Pin({ h, active, open, scheduleClose, toggle }) {
  const ref = useRef(null);
  const lastType = useRef('mouse');
  const prod = PRODUCTS.find((x) => x.id === h.product);
  const mouse = (fn) => (e) => e.pointerType !== 'touch' && fn(e); // touch is handled by tap/click

  // register with the camera rig, which moves this element to the projected 3D point each frame
  useEffect(() => {
    const rec = { el: ref.current, p: h.p };
    store.hot.push(rec);
    return () => {
      store.hot = store.hot.filter((r) => r !== rec);
    };
  }, [h]);

  return (
    <div
      ref={ref}
      className={`hot hot--${h.side} ${active ? 'is-active' : ''}`}
      onPointerEnter={mouse(open)}
      onPointerLeave={mouse(scheduleClose)}
      onFocus={open}
      onBlur={scheduleClose}
    >
      <button
        type="button"
        className="hot__dot"
        aria-label={`${h.label}, ${inr(prod.price)}`}
        aria-expanded={active}
        onPointerDown={(e) => {
          lastType.current = e.pointerType;
        }}
        // a mouse already opened it by hovering, so a click must not close it; only a tap toggles
        onClick={() => (lastType.current === 'touch' ? toggle() : open())}
      >
        <i />
      </button>
      {/* transparent gutter next to the pin: the pointer never leaves the hover area on its way to the card */}
      <div className="hot__card" aria-hidden={!active}>
        <PinCard p={prod} title={h.label} />
      </div>
    </div>
  );
}

export function Interior() {
  const [active, setActive] = useState(null); // id of the open pin, or null. Nothing opens by itself.
  const closeTimer = useRef(0);

  const open = (id) => {
    clearTimeout(closeTimer.current);
    setActive(id);
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActive(null), 160); // tiny grace period: no flicker between pin and card
  };

  // close when the section leaves the screen
  const root = useRef(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => !e.isIntersecting && setActive(null), { threshold: 0.3 });
    root.current && io.observe(root.current);
    return () => io.disconnect();
  }, []);

  // close on tap / click outside, and on Escape
  useEffect(() => {
    const away = (e) => {
      if (!e.target.closest?.('.hot')) setActive(null);
    };
    const esc = (e) => e.key === 'Escape' && setActive(null);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
      clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <section id="interior" ref={root} data-section className="sec sec--dark sec--interior">
      <div className="sec__inner interior">
        <div className="interior__head">
          <Tag>Step inside</Tag>
          <h2 className="h2 reveal">Luxury, from the inside out.</h2>
          <p className="lead reveal">Hover a point on the car to shop exactly what you see.</p>
        </div>

        <div className="interior__foot reveal">
          <a className="btn btn--ghost" href="#trending">
            Shop all interior <Icon name="arrow" size={18} />
          </a>
        </div>
      </div>

      {HOTSPOTS.map((h) => (
        <Pin
          key={h.id}
          h={h}
          active={active === h.id}
          open={() => open(h.id)}
          scheduleClose={scheduleClose}
          toggle={() => (active === h.id ? setActive(null) : open(h.id))}
        />
      ))}
    </section>
  );
}

/* 5 · SMART GPS BANNER — dash close-up ------------------------------------- */
function useCountdown() {
  // sale ends 2 days from the first visit of the day (prototype: rolling deadline)
  const [end] = useState(() => Date.now() + 2 * 24 * 3600 * 1000 + 3600 * 1000 * 5);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, end - now);
  const p = (n) => String(n).padStart(2, '0');
  return {
    d: p(Math.floor(ms / 86400000)),
    h: p(Math.floor(ms / 3600000) % 24),
    m: p(Math.floor(ms / 60000) % 60),
    s: p(Math.floor(ms / 1000) % 60),
  };
}

export function GpsBanner() {
  const c = useCountdown();
  return (
    <section id="gps" data-section className="sec sec--dark sec--gps">
      <div className="sec__inner" data-side="left">
        <div className="copy">
          <h2 className="h2 h2--xl reveal">Smart Car GPS. Your dashboard, upgraded.</h2>
          <p className="lead reveal">
            Live traffic maps, wireless CarPlay, 4G and 360° camera support. Free fitting included.
          </p>
          <div className="gps__price reveal">
            <strong>{inr(14999)}</strong><s>{inr(19999)}</s><em>Save {inr(5000)}</em>
          </div>
          <div className="timer reveal" aria-label="Offer ends in">
            {[['Days', c.d], ['Hrs', c.h], ['Min', c.m], ['Sec', c.s]].map(([l, v]) => (
              <div key={l}><b>{v}</b><small>{l}</small></div>
            ))}
          </div>
          <div className="hero__actions reveal">
            <button type="button" className="btn btn--solid" onClick={() => shop.add('Smart Android GPS Head Unit 9"')}>
              Buy now <Icon name="arrow" size={18} />
            </button>
            <a className="btn btn--ghost" href="#trending">See all electronics</a>
          </div>
        </div>
      </div>
    </section>
  );
}
