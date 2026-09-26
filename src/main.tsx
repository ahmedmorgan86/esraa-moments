import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SiteProvider } from './lib/site';
import { App } from './App';
import './index.css';

// Persist dark mode preference on initial load
const dark = localStorage.getItem('em-dark');
if (!dark) {
  let mode: unknown = 'light';
  try {
    const cached = localStorage.getItem('em-site');
    mode = cached ? (JSON.parse(cached) as any)?.appearance?.mode : 'light';
  } catch {
    try { localStorage.removeItem('em-site'); } catch {}
    mode = 'light';
  }
  try { localStorage.setItem('em-dark', mode === 'dark' ? '1' : '0'); } catch {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <App />
      </SiteProvider>
    </BrowserRouter>
  </StrictMode>
);
