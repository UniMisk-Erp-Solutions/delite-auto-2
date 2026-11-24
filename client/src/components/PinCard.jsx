import { useEffect, useRef, useState } from 'react';
import { inr } from '../data/products.js';
import { shop } from '../shopStore.js';
import { Icon, Stars } from './Bits.jsx';
import ProductArt from './ProductArt.jsx';

// The compact black product card used by the hover pins (landing interior + 3D product page).
export default function PinCard({ p, title }) {
  const [added, setAdded] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const add = () => {
    shop.add(p.name);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="pin">
      <div className="pin__media">
        {p.badge && <span className={`pin__badge ${p.badge.startsWith('-') ? 'is-off' : ''}`}>{p.badge}</span>}
        <ProductArt type={p.art} image={p.image} alt="" />
      </div>
      <div className="pin__body">
        <span className="pin__cat">{p.cat}</span>
        <h3 className="pin__name">{title}</h3>
        <div className="pin__rate">
          <Stars value={p.rating} size={12} />
          <span>{p.rating} ({new Intl.NumberFormat('en-IN').format(p.reviews)})</span>
        </div>
        <div className="pin__buy">
          <div className="pin__price">
            <strong>{inr(p.price)}</strong>
            <s>{inr(p.mrp)}</s>
          </div>
          <button type="button" className={`pin__add ${added ? 'is-added' : ''}`} onClick={add} aria-label={`Add ${title} to cart`}>
            <Icon name={added ? 'check' : 'cart'} size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
