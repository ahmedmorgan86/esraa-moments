export function AnnouncementBar({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="relative bg-primary text-white text-center py-2 px-12 text-xs font-semibold">
      <span>{text}</span>
      <button onClick={onClose} className="absolute end-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/30 transition-colors text-xs" aria-label="إغلاق">×</button>
    </div>
  );
}
