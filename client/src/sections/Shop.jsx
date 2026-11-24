import { useEffect, useRef, useState } from 'react';
import { PRODUCTS } from '../data/products.js';
import { CAR_BRANDS, BIKE_BRANDS } from '../data/brands.js';
import { REVIEWS } from '../data/reviews.js';
import { shop, useShop } from '../shopStore.js';
import { SUPABASE_ON, insert } from '../lib/supabase.js';
import { Icon, Stars, ProductCard, CountUp } from '../components/Bits.jsx';

const Tag = ({ children }) => <span className="tag reveal">{children}</span>;

/* 6 · TRENDING — the car has slid away, full-width product grid ------------- */
const TABS = ['All', 'Interior', 'Exterior', 'Electronics', 'Lighting', 'Car Care'];

// number of grid columns at the current width (must match the breakpoints in shop.css)
function useColumns() {
  const get = () => (window.matchMedia('(max-width: 560px)').matches ? 1
    : window.matchMedia('(max-width: 900px)').matches ? 2
    : window.matchMedia('(max-width: 1100px)').matches ? 3 : 4);
  const [cols, setCols] = useState(get);
  useEffect(() => {
    const on = () => setCols(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return cols;
}

export function Trending() {
  const [tab, setTab] = useState('All');
  const vehicle = useShop((s) => s.vehicle);
  const cols = useColumns();
  const all = tab === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.cat === tab);
  // two rows, always (a single column would be a very long list, so phones get four cards)
  const list = all.slice(0, cols === 1 ? 4 : cols * 2);

  return (
    <section id="trending" data-section className="sec sec--light sec--shop">
      <div className="wrap">
        <header className="shead">
          <div>
            <Tag>Trending now</Tag>
            <h2 className="h2 reveal">
              {vehicle ? <>Trending for your <span className="accent">{vehicle.brand} {vehicle.model}</span></> : 'Trending accessories.'}
            </h2>
            {vehicle && (
              <p className="lead reveal">
                Fitment guaranteed. <a href="#finder" className="link">Change vehicle</a>
              </p>
            )}
          </div>
          <div className="tabs reveal" role="tablist" aria-label="Category filter">
            {TABS.map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
        </header>
        <div className="pgrid">
          {list.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        <div className="shop__more reveal">
          <a className="btn btn--outline-dark" href="#footer">View all 5,950+ accessories <Icon name="arrow" size={18} /></a>
        </div>
      </div>
    </section>
  );
}

/* 7 · SUCCESS IN NUMBERS — exactly three cards ------------------------------ */
export function Stats() {
  const cards = [
    { n: 2.5, d: 1, suffix: ' Lakh+', label: 'Orders delivered', note: 'across 120+ cities in India' },
    { n: 4.8, d: 1, suffix: ' / 5', label: 'Average customer rating', note: 'from 38,000+ verified reviews' },
    { n: 1500, d: 0, suffix: '+', label: 'Certified installers', note: 'free expert fitting near you' },
  ];
  return (
    <section id="stats" data-dot className="sec sec--dark sec--shop sec--stats">
      <div className="wrap">
        <header className="shead shead--center">
          <Tag>Trusted nationwide</Tag>
          <h2 className="h2 reveal">Numbers that speak for us.</h2>
        </header>
        <div className="stats">
          {cards.map((c, i) => (
            <div key={c.label} className="stat reveal" style={{ '--d': `${i * 0.1}s` }}>
              <strong><CountUp to={c.n} decimals={c.d} suffix={c.suffix} /></strong>
              <span>{c.label}</span>
              <small>{c.note}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 8 · TESTIMONIALS — auto-sliding, pauses on hover / when off-screen -------- */
export function Reviews() {
  const track = useRef(null);
  const root = useRef(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    root.current && io.observe(root.current);
    return () => io.disconnect();
  }, []);

  const slide = (dir) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild;
    const step = card.offsetWidth + 20;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    if (dir > 0 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
    else el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!inView || paused) return undefined;
    const t = setInterval(() => !document.hidden && slide(1), 4800);
    return () => clearInterval(t);
  }, [inView, paused]);

  return (
    <section id="reviews" data-dot ref={root} className="sec sec--light sec--shop">
      <div className="wrap">
        <header className="shead">
          <div>
            <Tag>Testimonials</Tag>
            <h2 className="h2 reveal">Loved by 2.5 lakh+ drivers.</h2>
          </div>
          <div className="rating reveal">
            <strong>4.8</strong>
            <div><Stars value={4.8} size={18} /><small>38,214 verified reviews</small></div>
            <div className="arrows">
              <button type="button" onClick={() => slide(-1)} aria-label="Previous review"><Icon name="left" size={20} /></button>
              <button type="button" onClick={() => slide(1)} aria-label="Next review"><Icon name="right" size={20} /></button>
            </div>
          </div>
        </header>
      </div>
      <div className="rtrack" ref={track} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} tabIndex={0} aria-label="Customer reviews">
        {REVIEWS.map((r) => (
          <figure key={r.name} className="rcard">
            <Stars value={r.rating} size={16} />
            <blockquote>&ldquo;{r.text}&rdquo;</blockquote>
            <figcaption>
              <span className="rcard__av" aria-hidden>{r.name.split(' ').map((w) => w[0]).join('')}</span>
              <span>
                <strong>{r.name}</strong>
                <small>{r.car} · {r.city}</small>
              </span>
              <span className="rcard__ver">Verified buyer</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* 9 · SERVICES BANNER ------------------------------------------------------- */
export function Services() {
  const items = [
    ['wrench', 'Free expert fitting', 'At 1,500+ certified garages'],
    ['truck', 'Doorstep installation', 'Our technician comes to you'],
    ['shield', '1-year warranty', 'On every accessory we sell'],
    ['ret', '7-day easy returns', 'No questions asked'],
  ];
  return (
    <section id="services" data-dot className="sec sec--dark sec--shop sec--services">
      <div className="wrap">
        <div className="banner">
          <div className="banner__copy">
            <Tag>Services</Tag>
            <h2 className="h2 reveal">Bought it? We&rsquo;ll fit it. Free.</h2>
            <p className="lead reveal">Book a slot and a certified installer fits your accessories the same week, with zero hidden charges.</p>
            <a className="btn btn--solid reveal" href="#footer" onClick={() => shop.toast('Booking opens with the checkout, coming soon')}>
              Book a fitting slot <Icon name="arrow" size={18} />
            </a>
          </div>
          <ul className="banner__list">
            {items.map(([ic, t, s], i) => (
              <li key={t} className="reveal" style={{ '--d': `${i * 0.08}s` }}>
                <span><Icon name={ic} size={26} /></span>
                <div><strong>{t}</strong><small>{s}</small></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* 10 · SHOP BY BRAND — two seamless opposite marquees ----------------------- */
function Brand({ b }) {
  return (
    <a href="#trending" className="brand" aria-label={`Shop ${b.name} accessories`}>
      {b.logo ? <img src={`/brands/${b.logo}.svg`} alt="" loading="lazy" width="28" height="28" /> : null}
      <span>{b.name}</span>
    </a>
  );
}

function Marquee({ items, reverse = false, speed = 46 }) {
  // the list is rendered twice and the track slides exactly half its width -> seamless loop
  const list = [...items, ...items];
  return (
    <div className={`marquee ${reverse ? 'marquee--rev' : ''}`} style={{ '--speed': `${speed}s` }}>
      <div className="marquee__track">
        {list.map((b, i) => <Brand b={b} key={b.name + i} />)}
      </div>
    </div>
  );
}

export function Brands() {
  return (
    <section id="brands" data-dot className="sec sec--light sec--shop sec--brands">
      <div className="wrap">
        <header className="shead shead--center">
          <Tag>Shop by brand</Tag>
          <h2 className="h2 reveal">Every Indian brand. One store.</h2>
          <p className="lead reveal">Cars from Maruti Suzuki to Mahindra, bikes from Royal Enfield to TVS.</p>
        </header>
      </div>
      <Marquee items={CAR_BRANDS} />
      <Marquee items={BIKE_BRANDS} reverse speed={52} />
    </section>
  );
}

/* 11 · FOOTER --------------------------------------------------------------- */
export function Footer() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // Saved to the Supabase table newsletter_signups when it is configured. A repeat email counts as success.
  async function subscribe(e) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email')?.toString().trim();
    if (!email) return;
    if (SUPABASE_ON) {
      setBusy(true);
      try {
        await insert('newsletter_signups', { email });
      } catch (err) {
        if (err.status !== 409) {
          setBusy(false);
          shop.toast('Could not subscribe right now. Please try again.');
          return;
        }
      }
      setBusy(false);
    }
    setDone(true);
  }

  return (
    <footer id="footer" data-dot className="foot2">
      <div className="wrap">
        <div className="foot2__cta">
          <div>
            <h2>Not sure what fits your vehicle?</h2>
            <p>Talk to an accessories expert. We reply in under 5 minutes, 9am–9pm.</p>
          </div>
          <div className="foot2__ctaBtns">
            <a className="btn btn--solid" href="tel:+911800000000"><Icon name="phone" size={18} /> 1800-000-0000</a>
            <a className="btn btn--ghost" href="#finder">Find my vehicle</a>
          </div>
        </div>

        <div className="foot2__grid">
          <div className="foot2__about">
            <a className="foot2__logo" href="#home">Delite</a>
            <p>Premium car &amp; bike accessories with guaranteed fitment, free installation and a 1-year warranty.</p>
            {done ? (
              <p className="foot2__ok">You&rsquo;re in. Check your inbox for ₹200 off.</p>
            ) : (
              <form className="news" onSubmit={subscribe}>
                <input name="email" type="email" required placeholder="Email for ₹200 off your first order" aria-label="Email address" />
                <button type="submit" aria-label="Subscribe" disabled={busy}><Icon name="arrow" size={18} /></button>
              </form>
            )}
          </div>
          <nav aria-label="Shop"><h3>Shop</h3>
            <a href="#trending">Trending</a><a href="#categories">Categories</a><a href="#brands">Brands</a><a href="#interior">Interior</a><a href="#gps">Smart GPS</a>
          </nav>
          <nav aria-label="Support"><h3>Support</h3>
            <a href="#services">Free fitting</a><a href="#footer">Track order</a><a href="#footer">Returns &amp; refunds</a><a href="#footer">Warranty</a><a href="#footer">Contact us</a>
          </nav>
          <nav aria-label="Company"><h3>Company</h3>
            <a href="#reviews">Reviews</a><a href="#footer">About us</a><a href="#footer">Become an installer</a><a href="#footer">Careers</a>
          </nav>
          <div className="foot2__contact"><h3>Reach us</h3>
            <p><Icon name="mail" size={16} /> care@delite.in</p>
            <p><Icon name="phone" size={16} /> 1800-000-0000</p>
            <p><Icon name="pin" size={16} /> Mumbai · Delhi · Bengaluru</p>
          </div>
        </div>

        <div className="foot2__bar">
          <span>© {new Date().getFullYear()} Delite. All rights reserved. Prices in INR, inclusive of GST.</span>
          <span className="pay">UPI · Cards · NetBanking · COD · EMI</span>
        </div>
      </div>
    </footer>
  );
}
