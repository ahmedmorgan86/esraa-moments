import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from './supabase';

type SiteCtx = { site: SiteData; setSite: React.Dispatch<React.SetStateAction<SiteData>> };
type SiteData = {
  appearance: { mode: 'light' | 'dark'; accent: string };
  announcement: { text: string; enabled: boolean };
};

const ACCENTS = [
  { key: 'terracotta', light: { accent: '#b8603a', hover: '#a04e2c', light: 'rgba(184,96,58,.08)', glow: 'rgba(184,96,58,.15)' }, dark: { accent: '#d0804a', hover: '#e09460', light: 'rgba(208,128,74,.1)', glow: 'rgba(208,128,74,.15)' }, nameAr: 'تيراكوتا', nameEn: 'Terracotta' },
  { key: 'rose', light: { accent: '#c46070', hover: '#b04e5e', light: 'rgba(196,96,112,.08)', glow: 'rgba(196,96,112,.15)' }, dark: { accent: '#d87088', hover: '#e8849a', light: 'rgba(216,112,136,.1)', glow: 'rgba(216,112,136,.15)' }, nameAr: 'وردي', nameEn: 'Rose' },
  { key: 'gold', light: { accent: '#c49830', hover: '#b08628', light: 'rgba(196,152,48,.08)', glow: 'rgba(196,152,48,.15)' }, dark: { accent: '#d4a840', hover: '#e0b850', light: 'rgba(212,168,64,.1)', glow: 'rgba(212,168,64,.15)' }, nameAr: 'ذهبي', nameEn: 'Gold' },
];

const defaultSite: SiteData = {
  appearance: { mode: 'light', accent: 'terracotta' },
  announcement: { text: 'لافتة محدودة! احصل على خصم 10% الآن — لا تفوّت الفرصة! 🔥', enabled: true },
};

const SiteCtx = createContext<SiteCtx>({ site: defaultSite, setSite: () => {} });

export function useSite(): SiteCtx {
  const ctx = useContext(SiteCtx);
  if (!ctx?.site) return { site: defaultSite, setSite: () => {} };
  return ctx;
}
export { ACCENTS };

function getLocal(key: string, fallback: unknown) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SiteData>(() => {
    const cached = getLocal('em-site', null) as Record<string, any> | null;
    if (!cached || typeof cached !== 'object' || Array.isArray(cached)) return defaultSite;
    return {
      appearance: { ...defaultSite.appearance, ...cached?.appearance },
      announcement: { ...defaultSite.announcement, ...cached?.announcement },
    };
  });

  useEffect(() => { localStorage.setItem('em-site', JSON.stringify(site)); }, [site]);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'site').maybeSingle();
      if (data?.value) {
        const raw = data.value as any;
        setSite(s => ({
          ...s,
          appearance: {
            mode: raw.appearance?.mode === 'dark' ? 'dark' : raw.appearance?.mode === 'light' ? 'light' : s.appearance.mode,
            accent: ACCENTS.some(a => a.key === raw.appearance?.accent) ? raw.appearance.accent : s.appearance.accent,
          },
          announcement: { ...s.announcement, ...raw.announcement },
        }));
      }
    })();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('em-dark')) {
      document.documentElement.dataset.theme = site.appearance.mode;
    }
  }, [site.appearance.mode]);

  useEffect(() => {
    const applyAccent = () => {
      const acc = ACCENTS.find(a => a.key === site.appearance.accent) ?? ACCENTS[0];
      const g = document.documentElement.dataset.theme === 'dark' ? acc.dark : acc.light;
      const s = document.documentElement.style;
      s.setProperty('--color-primary', g.accent);
      s.setProperty('--color-primary-hover', g.hover);
      s.setProperty('--color-primary-light', g.light);
      s.setProperty('--color-primary-glow', g.glow);
    };
    applyAccent();
    const mo = new MutationObserver(applyAccent);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, [site.appearance.accent]);

  return <SiteCtx.Provider value={{ site, setSite }}>{children}</SiteCtx.Provider>;
}
