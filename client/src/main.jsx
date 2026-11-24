import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './shop.css';
import './product/product.css';

// Three pages, no router needed: "/" landing, "/product" the 3D explorer, "/shop" the catalogue.
// (the explorer is a separate chunk, so the landing page does not pay for it)
const ProductPage = lazy(() => import('./product/ProductPage.jsx'));
const CatalogPage = lazy(() => import('./shop/CatalogPage.jsx'));
const path = window.location.pathname.replace(/\/+$/, '');
const onProduct = path === '/product';
const onShop = path === '/shop';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {onProduct || onShop ? (
      <Suspense fallback={null}>{onShop ? <CatalogPage /> : <ProductPage />}</Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
