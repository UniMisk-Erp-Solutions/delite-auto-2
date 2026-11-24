import { useCallback, useEffect, useRef, useState } from 'react';
import ProductScene, { CARD } from './ProductScene.jsx';
import PinCard from '../components/PinCard.jsx';
import { Icon } from '../components/Bits.jsx';
import { Loader, Toast } from '../Chrome.jsx';
import { PRODUCTS } from '../data/products.js';
import { store } from '../store.js';
import { useShop } from '../shopStore.js';
import { BRAND } from '../config.js';

const productOf = (part) => PRODUCTS.find((p) => p.id === part.product);

// How the card behaves (kept deliberately simple):
//   hover a part   -> after a tiny pause its card opens right beside the cursor and stays where it opened
//   click a part   -> the card is PINNED: it stays until you click empty space, press Esc or hit the X
//   leave          -> an unpinned card closes 0.5 s after the cursor is on neither the part nor the card
//   other parts    -> an open card is only swapped after the cursor rests on another part for 0.45 s
//                     (a pinned card changes only by clicking another part)
const OPEN_DELAY = 90;
const SWAP_DELAY = 450;
const CLOSE_DELAY = 500;

// The open card, glued to its 3D point through the live camera every frame.
function Pin({ part, point, side, pinned, onClose }) {
  const ref = useRef(null);
  const prod = productOf(part);

  useEffect(() => {
    const r = { el: ref.current, p: point };
    store.hot.push(r);
    store.invalidate();
    return () => {
      store.hot = store.hot.filter((x) => x !== r);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className="hot hot--bare is-active" data-side={side}>
      <div className="hot__card">
        <div className="hot__wrap">
          <PinCard p={prod} title={part.label} />
          {pinned && (
            <button type="button" className="hot__x" onClick={onClose} aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const [status, setStatus] = useState({ status: 'loading', progress: 0 });
  const [info, setInfo] = useState(null); // { demo, name, parts: [{ id, label, product }] }
  const [active, setActive] = useState(null); // { id, p: [x, y, z], pinned } or null. Nothing opens by itself.
  const [xray, setXray] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const pick = useRef(new URLSearchParams(window.location.search).has('pick')).current; // /product?pick
  const [picked, setPicked] = useState(null);
  const [copied, setCopied] = useState(false);
  const count = useShop((s) => s.count);
  const api = useRef(null); // set by the scene: { nearestPoint(id) }
  const activeRef = useRef(null);
  activeRef.current = active;
  const hit = useRef({ id: null, p: null }); // the latest part under the cursor
  const openT = useRef(0);
  const closeT = useRef(0);

  const parts = info?.parts ?? [];

  const cancel = useCallback(() => {
    clearTimeout(openT.current);
    clearTimeout(closeT.current);
  }, []);
  const close = useCallback(() => {
    cancel();
    setActive(null);
  }, [cancel]);
  const show = useCallback((id, point, pinned, x) => {
    cancel();
    setActive((prev) => {
      if (prev && prev.id === id) return pinned && !prev.pinned ? { ...prev, pinned: true } : prev; // never relocates
      const p = point || api.current?.nearestPoint(id);
      const side = (x ?? window.innerWidth / 2) > window.innerWidth / 2 ? 'left' : 'right'; // opens toward the centre
      return p ? { id, p, side, pinned } : prev;
    });
  }, [cancel]);
  const leaveSoon = useCallback(() => {
    clearTimeout(openT.current);
    clearTimeout(closeT.current);
    if (activeRef.current && !activeRef.current.pinned) closeT.current = setTimeout(close, CLOSE_DELAY);
  }, [close]);

  // the cursor moved over the car (id = part under it, or null)
  const onHover = useCallback((id, point, x) => {
    if (id === CARD) return cancel(); // the cursor is on the card: nothing may close or swap it
    hit.current = { id, p: point, x };
    const cur = activeRef.current;
    if (!id) return leaveSoon();
    if (cur?.id === id) return cancel(); // back on (or still on) the open part: it stays
    if (cur?.pinned) return undefined; // pinned: only a click changes it
    clearTimeout(closeT.current); // the open card stays while the cursor looks at another part...
    clearTimeout(openT.current);
    openT.current = setTimeout(() => {
      if (hit.current.id === id) show(id, hit.current.p, false, hit.current.x);
    }, cur ? SWAP_DELAY : OPEN_DELAY);
    return undefined;
  }, [cancel, leaveSoon, show]);

  // a click (not a drag) on the car: pin that part's card, or clear it when the click lands on nothing
  const onSelect = useCallback((id, point, x) => {
    if (id) show(id, point, true, x);
    else close();
  }, [show, close]);

  useEffect(() => {
    document.documentElement.dataset.page = 'product';
    document.title = `Toyota Innova Hybrid — 3D explorer · ${BRAND}`;
    const esc = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', esc);
    return () => {
      delete document.documentElement.dataset.page;
      document.removeEventListener('keydown', esc);
      clearTimeout(openT.current);
      clearTimeout(closeT.current);
      store.hot = [];
    };
  }, [close]);

  const activePart = active ? parts.find((q) => q.id === active.id) : null;

  return (
    <div className="pp">
      <Loader model={status} />

      <header className="nav" data-theme="light">
        <div className="nav__bar">
          <a className="nav__logo" href="/">{BRAND}</a>
          <nav className="nav__links" aria-label="Primary">
            <a href="/">Back to store</a>
          </nav>
          <a className="btn btn--outline cartbtn" href="/#trending" aria-label={`Cart, ${count} items`}>
            <Icon name="cart" size={18} />
            <span>Cart</span>
            {count > 0 && <b className="cartbtn__n">{count}</b>}
          </a>
        </div>
      </header>

      <div className="pp__stage">
        <ProductScene
          xray={xray}
          active={active?.id ?? null}
          onHover={onHover}
          onSelect={onSelect}
          onReady={setInfo}
          onStatus={setStatus}
          resetKey={resetKey}
          pick={pick}
          onPick={setPicked}
          api={api}
        />
      </div>

      <div className="pp__head">
        <div className="container">
          <span className="tag">3D explorer</span>
          <h1 className="pp__title">Toyota Innova Hybrid</h1>
          <p className="pp__sub">
            {parts.length ? `${parts.length} accessories to explore. ` : ''}Hover a part to preview it, click to keep it open. Drag to rotate, scroll to zoom.
          </p>
        </div>
      </div>

      {activePart && (
        <Pin
          key={activePart.id}
          part={activePart}
          point={active.p}
          side={active.side}
          pinned={active.pinned}
          onClose={close}
        />
      )}

      {pick && (
        <div className="pp__pick" data-nopick>
          <strong>Pick mode</strong>
          {picked ? (
            <>
              <span>
                {picked.object} · <i>{picked.material}</i>
              </span>
              <code>{`{ id: 'name', label: 'Product name', product: 'p1', p: [${picked.p.join(', ')}] },`}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(`{ id: 'name', label: 'Product name', product: 'p1', p: [${picked.p.join(', ')}] },`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                }}
              >
                {copied ? 'Copied' : 'Copy line'}
              </button>
              <small>Paste it into MANUAL_PINS in client/src/product/parts.js</small>
            </>
          ) : (
            <span>Click any spot on the car to get its 3D position. Dragging still rotates.</span>
          )}
        </div>
      )}

      {status.status === 'empty' && (
        <div className="pp__empty">
          <span className="tag">Setup</span>
          <h2>Waiting for the separate-parts Innova</h2>
          <p>
            This page has its own model and never uses the landing page's car. Export the Innova as{' '}
            <b>innova-parts.glb</b> and put it in <b>server/models</b>, then reload.
          </p>
          <ol>
            <li>Run <code>tools/auto_prepare_parts.py</code> in Blender (see the README).</li>
            <li>Or use your own file: name the objects (<code>seat</code>, <code>steering</code>, <code>headlight</code>, <code>mirror</code> …).</li>
          </ol>
          <a className="pp__empty-link" href="/product?demo">Preview the layout with a stand-in model</a>
        </div>
      )}

      {status.status === 'error' && (
        <div className="pp__error" role="alert">
          <strong>The 3D model could not be loaded</strong>
          <span>{status.error}</span>
        </div>
      )}

      <div className="dock" role="toolbar" aria-label="View options">
        <button type="button" className="dock__tool" aria-pressed={xray} onClick={() => setXray((v) => !v)}>
          <span className={'dock__switch ' + (xray ? 'is-on' : '')} aria-hidden="true"><i /></span>
          X-ray body
        </button>
        <button type="button" className="dock__tool" onClick={() => setResetKey((k) => k + 1)}>
          Reset view
        </button>
        <a className="btn btn--solid dock__cta" href="/shop">
          View more products
          <Icon name="arrow" size={18} />
        </a>
      </div>

      {info?.demo && (
        <div className="badge pp__badge">
          <span>Stand-in preview (<code>?demo</code>). The real page uses your separate-parts model: <b>server/models/*parts*.glb</b>.</span>
        </div>
      )}

      <Toast />
    </div>
  );
}
