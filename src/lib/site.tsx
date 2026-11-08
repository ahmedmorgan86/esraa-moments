import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { fetchSetting, saveSetting, subscribeToSetting } from './storeData';
import { defaultSite, SiteCtx, ACCENTS, type SiteData } from './siteContext';

function getLocal(key: string, fallback: unknown) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSiteState] = useState<SiteData>(() => {
    const cached = getLocal('em-site', null) as Record<string, any> | null;
    if (!cached || typeof cached !== 'object' || Array.isArray(cached)) return defaultSite;
    return {
      appearance: { ...defaultSite.appearance, ...cached?.appearance },
      announcement: { ...defaultSite.announcement, ...cached?.announcement },
    };
  });

  useEffect(() => { localStorage.setItem('em-site', JSON.stringify(site)); }, [site]);

  // Appearance and the announcement are site-wide, so they are published to the
  // shared settings table as well as cached locally. Without this the Admin
  // only ever changed its own browser.
  const setSite = useCallback((updater: React.SetStateAction<SiteData>) => {
    setSiteState(prev => {
      const next = typeof updater === 'function' ? (updater as (p: SiteData) => SiteData)(prev) : updater;
      void saveSetting('site', next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'site').maybeSingle();
      if (!alive || !data?.value) return;
      const raw = data.value as any;
      setSiteState(s => ({
        ...s,
        appearance: {
          mode: raw.appearance?.mode === 'dark' ? 'dark' : raw.appearance?.mode === 'light' ? 'light' : s.appearance.mode,
          accent: ACCENTS.some(a => a.key === raw.appearance?.accent) ? raw.appearance.accent : s.appearance.accent,
        },
        announcement: { ...s.announcement, ...raw.announcement },
      }));
    })();
    return () => { alive = false; };
  }, []);

  // Pick up a publish from another device / browser tab.
  useEffect(() => subscribeToSetting('site', () => {
    void fetchSetting<any>('site').then(raw => {
      if (!raw) return;
      setSiteState(s => ({
        ...s,
        appearance: {
          mode: raw.appearance?.mode === 'dark' ? 'dark' : raw.appearance?.mode === 'light' ? 'light' : s.appearance.mode,
          accent: ACCENTS.some(a => a.key === raw.appearance?.accent) ? raw.appearance.accent : s.appearance.accent,
        },
        announcement: { ...s.announcement, ...raw.announcement },
      }));
    });
  }), []);

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
