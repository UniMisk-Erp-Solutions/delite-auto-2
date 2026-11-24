import { useEffect, useMemo, useRef, useState } from 'react';
import './catalog.css';
import { ProductCard, Icon } from '../components/Bits.jsx';
import { Toast } from '../Chrome.jsx';
import { fetchProducts, PAGE_SIZE, SORTS } from '../data/catalog.js';
import { useShop } from '../shopStore.js';
import { BRAND } from '../config.js';

const CATS = ['Exterior', 'Interior', 'Lighting', 'Electronics', 'Car Care'];
const readUrl = () => {
  const u = new URLSearchParams(window.location.search);
  return { q: u.get('q') || '', cat: u.get('cat') || 'all', sort: u.get('sort') || 'popular', page: Math.max(1, Number(u.get('page')) || 1) };
};

// 1 … 4 5 6 … 20
function pageList(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) out.push('gap' + n);
    out.push(n);
  });
  return out;
}

export default function CatalogPage() {
  const [query, setQuery] = useState(readUrl);
  const [text, setText] = useState(query.q); // the box; the query follows it a moment later
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(true);
  const count = useShop((s) => s.count);
  const top = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    document.documentElement.dataset.page = 'shop';
    document.title = 'All products · ' + BRAND;
    return () => delete document.documentElement.dataset.page;
  }, []);

  // typing waits 250 ms, then restarts at page 1
  useEffect(() => {
    if (text === query.q) return undefined;
    const t = setTimeout(() => setQuery((s) => ({ ...s, q: text, page: 1 })), 250);
    return () => clearTimeout(t);
  }, [text, query.q]);

  // the address always mirrors the filters (shareable, and Back works)
  useEffect(() => {
    const u = new URLSearchParams();
    if (query.q) u.set('q', query.q);
    if (query.cat !== 'all') u.set('cat', query.cat);
    if (query.sort !== 'popular') u.set('sort', query.sort);
    if (query.page > 1) u.set('page', String(query.page));
    const s = u.toString();
    window.history.replaceState(null, '', window.location.pathname + (s ? '?' + s : ''));
  }, [query]);

  // load; a late answer for an old query is ignored
  useEffect(() => {
    let dead = false;
    setBusy(true);
    fetchProducts({ ...query, size: PAGE_SIZE }).then((r) => {
      if (dead) return;
      setRes(r);
      setBusy(false);
      if (r.page !== query.page) setQuery((s) => ({ ...s, page: r.page }));
    });
    return () => {
      dead = true;
    };
  }, [query]);

  const set = (patch) => setQuery((s) => ({ ...s, page: 1, ...patch }));
  const go = (page) => {
    setQuery((s) => ({ ...s, page }));
    if (!first.current) top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  useEffect(() => {
    first.current = false;
  }, []);

  const facets = res?.facets || {};
  const cats = useMemo(() => CATS.filter((c) => facets[c] || query.cat === c), [facets, query.cat]);

  return (
    <div className="cat">
      <header className="nav" data-theme="light">
        <div className="nav__bar">
          <a className="nav__logo" href="/">{BRAND}</a>
          <nav className="nav__links" aria-label="Primary">
            <a href="/">Home</a>
            <a href="/product">3D Explorer</a>
          </nav>
          <a className="btn btn--outline cartbtn" href="/" aria-label={'Cart, ' + count + ' items'}>
            <Icon name="cart" size={18} />
            <span>Cart</span>
            {count > 0 && <b className="cartbtn__n">{count}</b>}
          </a>
        </div>
      </header>

      <main className="container cat__main" ref={top}>
        <span className="tag">Shop</span>
        <h1 className="cat__title">All products</h1>

        <div className="cat__bar">
          <label className="cat__search">
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search seat covers, LED, GPS…" aria-label="Search products" />
          </label>
          <label className="cat__sort">
            <span>Sort</span>
            <select value={query.sort} onChange={(e) => set({ sort: e.target.value })}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="cat__chips" role="tablist" aria-label="Category">
          <button type="button" role="tab" aria-selected={query.cat === 'all'} className={query.cat === 'all' ? 'is-on' : ''} onClick={() => set({ cat: 'all' })}>
            All <em>{facets.all ?? ''}</em>
          </button>
          {cats.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={query.cat === c} className={query.cat === c ? 'is-on' : ''} onClick={() => set({ cat: c })}>
              {c} <em>{facets[c] ?? 0}</em>
            </button>
          ))}
        </div>

        <p className="cat__count" aria-live="polite">
          {res ? res.total.toLocaleString('en-IN') + (res.total === 1 ? ' product' : ' products') : 'Loading…'}
        </p>

        <div className={'cat__grid' + (busy ? ' is-busy' : '')}>
          {res?.items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>

        {res && res.total === 0 && (
          <div className="cat__none">
            <strong>Nothing matches “{query.q}”.</strong>
            <button type="button" className="btn btn--outline-dark" onClick={() => { setText(''); set({ q: '', cat: 'all' }); }}>Clear filters</button>
          </div>
        )}

        {res && res.pages > 1 && (
          <nav className="cat__pages" aria-label="Pages">
            <button type="button" disabled={res.page <= 1} onClick={() => go(res.page - 1)} aria-label="Previous page"><Icon name="left" size={18} /></button>
            {pageList(res.page, res.pages).map((n) =>
              typeof n === 'string' ? (
                <span key={n} className="cat__gap">…</span>
              ) : (
                <button key={n} type="button" className={n === res.page ? 'is-on' : ''} aria-current={n === res.page ? 'page' : undefined} onClick={() => go(n)}>{n}</button>
              )
            )}
            <button type="button" disabled={res.page >= res.pages} onClick={() => go(res.page + 1)} aria-label="Next page"><Icon name="right" size={18} /></button>
          </nav>
        )}
      </main>
      <Toast />
    </div>
  );
}
