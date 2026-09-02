export function AnnouncementBar({ text, textEn, lang, onClose }: { text: string; textEn?: string; lang?: string; onClose: () => void }) {
  const displayText = lang === 'en' && textEn ? textEn : text;
  return (
    <div className="relative bg-primary text-white text-center py-2 px-12 text-xs font-semibold">
      <span>{displayText}</span>
      <button onClick={onClose} className="absolute end-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/30 transition-colors text-xs" aria-label="Close">×</button>
    </div>
  );
}
