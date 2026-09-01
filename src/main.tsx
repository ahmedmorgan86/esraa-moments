import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SiteProvider } from './lib/site';
import { App } from './App';
import './index.css';

// Persist dark mode preference on initial load
const dark = localStorage.getItem('em-dark');
if (!dark) {
  const cached = localStorage.getItem('em-site');
  const mode = cached ? JSON.parse(cached)?.appearance?.mode : 'light';
  localStorage.setItem('em-dark', mode === 'dark' ? '1' : '0');
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
