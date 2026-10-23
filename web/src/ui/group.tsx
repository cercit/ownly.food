import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Share2 } from 'lucide-react';
import { getGroup, shareLink, watchGroup } from '../api/ownly-api.ts';
import { whatsappLink } from '../lib/room.ts';
import type { Group, GroupPreview, GroupView } from '../lib/types.ts';
import { Button, copyText } from './kit.tsx';

/** Loads a group order and refreshes it every few seconds while the screen is open. */
export function useGroup(gid: string, everyMs = 5000) {
  const [group, setGroup] = useState<GroupView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const stop = watchGroup(gid, (g, e) => {
      if (g) { setGroup(g); setError(null); } else if (e) setError(e.message);
      setLoading(false);
    }, everyMs);
    return stop;
  }, [gid, everyMs]);
  const refresh = useCallback(async () => {
    try { setGroup(await getGroup(gid)); setError(null); } catch (e) { setError((e as Error).message); }
  }, [gid]);
  return { group, member: group && group.is_member ? (group as Group) : null, preview: group && !group.is_member ? (group as GroupPreview) : null, error, loading, refresh };
}

export function QrImage({ text, size = 176 }: { text: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(text, { width: size * 2, margin: 1, color: { dark: '#111D35', light: '#FFFFFF' } }).then(setSrc).catch(() => setSrc('')); }, [text, size]);
  return src ? <img src={src} alt={`QR code for ${text}`} width={size} height={size} className="rounded-2xl border border-[#F0D7E2]" /> : <div style={{ width: size, height: size }} className="rounded-2xl bg-[#FFE3ED]" />;
}

/** Room code, link, QR, Copy link and Share on WhatsApp. The same link works for joining and tracking. */
export function SharePanel({ code, restaurant, note }: { code: string; restaurant?: string; note?: string }) {
  const link = shareLink(code);
  const [copied, setCopied] = useState(false);
  const text = `Join my group order${restaurant ? ` from ${restaurant}` : ''} on Ownly Together (a concept prototype). Room code ${code}. ${link}`;
  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr] items-center">
      <QrImage text={link} />
      <div className="min-w-0">
        <p className="text-xs font-bold text-[#576177] uppercase tracking-wider">Room code</p>
        <p className="text-4xl font-extrabold tracking-[0.2em] tabular-nums text-[#C40054]" data-testid="room-code">{code}</p>
        <input readOnly value={link} aria-label="Share link" onFocus={e => e.currentTarget.select()} className="mt-3 w-full min-h-11 px-3 rounded-xl border border-[#F0D7E2] bg-[#FFF9FC] text-sm" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={async () => { if (await copyText(link)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}>
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? 'Copied' : 'Copy link'}</Button>
          <a href={whatsappLink(text)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 min-h-12 px-5 rounded-full font-bold text-[15px] bg-[#16845A] text-white no-underline hover:bg-[#125F43]"><Share2 className="size-4" aria-hidden />Share on WhatsApp</a>
        </div>
        {note && <p className="text-xs text-[#576177] mt-3">{note}</p>}
      </div>
    </div>
  );
}
