import { MessageCircle } from 'lucide-react';
import { useStoreSettings } from '../hooks';

export function WhatsAppFloat() {
  const settings = useStoreSettings();
  const phone = settings.whatsapp;
  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 end-5 z-[900] w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#25d366] to-[#128c7e] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      aria-label="WhatsApp"
    >
      <MessageCircle size={24} />
      <span className="absolute inset-[-4px] rounded-full border-2 border-[#25d366]/40 animate-[waPulse_2.2s_ease-out_infinite]" />
    </a>
  );
}
