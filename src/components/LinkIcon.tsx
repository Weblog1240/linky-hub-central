import { MessageCircle, Send, Megaphone, Radio, Link2 } from "lucide-react";

export function LinkIcon({ kind }: { kind: string }) {
  const cls = "h-6 w-6";
  switch (kind) {
    case "whatsapp_group": return <MessageCircle className={`${cls} text-whatsapp`} />;
    case "whatsapp_channel": return <Megaphone className={`${cls} text-whatsapp`} />;
    case "telegram_group": return <Send className={`${cls} text-telegram`} />;
    case "telegram_channel": return <Radio className={`${cls} text-telegram`} />;
    default: return <Link2 className={`${cls} text-primary-glow`} />;
  }
}
