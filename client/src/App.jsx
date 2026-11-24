import { useState } from 'react';
import Scene3D from './three/Scene3D.jsx';
import Sections from './Sections.jsx';
import { Nav, SideDots, Loader, Toast, PlaceholderBadge } from './Chrome.jsx';
import { useScrollProgress, useReveal } from './interaction.js';

export default function App() {
  const [model, setModel] = useState({ status: 'loading', progress: 0 });
  useScrollProgress();
  useReveal();

  return (
    <>
      <Loader model={model} />
      <Nav />
      <SideDots />
      <Scene3D onStatus={setModel} />
      <div className="veil" aria-hidden="true" />
      <main>
        <Sections />
      </main>
      <Toast />
      {model.status === 'placeholder' && <PlaceholderBadge reason={model.reason} />}
    </>
  );
}
