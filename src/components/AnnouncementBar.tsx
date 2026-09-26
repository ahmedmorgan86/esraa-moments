export function AnnouncementBar({ text, textEn, lang, onClose, closeLabel }: { text: string; textEn?: string; lang?: string; onClose: () => void; closeLabel?: string }) {
  const displayText = (lang === 'en' && textEn ? textEn : text || '').trim();
  // An enabled-but-empty announcement used to render as a coloured bar with
  // nothing in it and a stray close button.
  if (!displayText) return null;

  return (
    <div className="relative bg-primary text-white text-center py-2 px-12 text-xs font-semibold">
      <span>{displayText}</span>
      <button
        onClick={onClose}
        className="absolute end-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/30 transition-colors text-base leading-none"
        aria-label={closeLabel || (lang === 'en' ? 'Close' : 'إغلاق')}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
