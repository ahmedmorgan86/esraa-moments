import { createContext, useContext } from 'react';

export type SiteCtx = { site: SiteData; setSite: React.Dispatch<React.SetStateAction<SiteData>> };
export type SiteData = {
  appearance: { mode: 'light' | 'dark'; accent: string };
  announcement: { text: string; textEn?: string; enabled: boolean };
};

export const ACCENTS = [
  { key: 'terracotta', light: { accent: '#b8603a', hover: '#a04e2c', light: 'rgba(184,96,58,.08)', glow: 'rgba(184,96,58,.15)' }, dark: { accent: '#d0804a', hover: '#e09460', light: 'rgba(208,128,74,.1)', glow: 'rgba(208,128,74,.15)' }, nameAr: 'تيراكوتا', nameEn: 'Terracotta' },
  { key: 'rose', light: { accent: '#c46070', hover: '#b04e5e', light: 'rgba(196,96,112,.08)', glow: 'rgba(196,96,112,.15)' }, dark: { accent: '#d87088', hover: '#e8849a', light: 'rgba(216,112,136,.1)', glow: 'rgba(216,112,136,.15)' }, nameAr: 'وردي', nameEn: 'Rose' },
  { key: 'gold', light: { accent: '#c49830', hover: '#b08628', light: 'rgba(196,152,48,.08)', glow: 'rgba(196,152,48,.15)' }, dark: { accent: '#d4a840', hover: '#e0b850', light: 'rgba(212,168,64,.1)', glow: 'rgba(212,168,64,.15)' }, nameAr: 'ذهبي', nameEn: 'Gold' },
];

export const defaultSite: SiteData = {
  appearance: { mode: 'light', accent: 'terracotta' },
  announcement: { text: 'لافتة محدودة! احصل على خصم 10% الآن — لا تفوّت الفرصة! 🔥', textEn: 'Limited banner! Get 10% off now — Don\'t miss out! 🔥', enabled: true },
};

export const SiteCtx = createContext<SiteCtx>({ site: defaultSite, setSite: () => {} });

export function useSite(): SiteCtx {
  const ctx = useContext(SiteCtx);
  if (!ctx?.site) return { site: defaultSite, setSite: () => {} };
  return ctx;
}
