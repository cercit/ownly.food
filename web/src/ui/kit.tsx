import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

export function Button({ variant = 'primary', className = '', busy, children, ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; busy?: boolean }) {
  const base = 'inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-full font-bold text-[15px] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const v = {
    primary: 'bg-[#C40054] text-white hover:bg-[#A80047] shadow-[0_9px_24px_rgba(196,0,84,0.18)]',
    secondary: 'bg-white text-[#111D35] border-[1.5px] border-[#F0D7E2] hover:bg-[#FFF1F6]',
    danger: 'bg-white text-[#A32234] border-[1.5px] border-[#A32234]/30 hover:bg-[#FFE7E9]',
    ghost: 'text-[#C40054] hover:bg-[#FFF1F6]',
  }[variant];
  return <button {...p} disabled={p.disabled || busy} className={`${base} ${v} ${className}`}>
    {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}{children}</button>;
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) =>
  <section className={`bg-white border border-[#F0D7E2] rounded-3xl shadow-[0_6px_18px_rgba(17,29,53,0.06)] p-5 sm:p-6 ${className}`}>{children}</section>;

export const Spinner = ({ label = 'Loading' }: { label?: string }) =>
  <div role="status" className="flex items-center justify-center gap-2 py-16 text-[#576177]"><Loader2 className="size-5 animate-spin" aria-hidden />{label}…</div>;

export const ErrorNote = ({ message, onRetry }: { message: string; onRetry?: () => void }) =>
  <div role="alert" className="flex items-start gap-3 rounded-2xl bg-[#FFE7E9] text-[#A32234] p-4 text-sm">
    <AlertCircle className="size-5 shrink-0 mt-0.5" aria-hidden />
    <div className="flex-1">{message}{onRetry && <button onClick={onRetry} className="ml-2 underline font-bold cursor-pointer">Try again</button>}</div>
  </div>;

export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) =>
  <div className="text-center py-14 px-4">
    <p className="text-lg font-extrabold text-[#111D35]">{title}</p>
    {hint && <p className="text-[#576177] mt-1">{hint}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>;

const badgeTone = {
  paid: 'bg-[#E5F6ED] text-[#125F43]', pending: 'bg-[#FFF1D9] text-[#855000]', failed: 'bg-[#FFE7E9] text-[#A32234]',
  pink: 'bg-[#FFE3ED] text-[#C40054]', neutral: 'bg-[#F4EEF1] text-[#576177]',
};
export const Badge = ({ tone = 'neutral', children }: { tone?: keyof typeof badgeTone; children: ReactNode }) =>
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${badgeTone[tone]}`}>{children}</span>;

export const statusBadge = (s: string | null | undefined) =>
  s === 'paid' ? <Badge tone="paid">✓ Paid</Badge> : s === 'failed' ? <Badge tone="failed">Failed</Badge> : s === 'refunded' ? <Badge>Refunded</Badge> : <Badge tone="pending">Pending</Badge>;

export const VegDot = ({ veg }: { veg: boolean }) =>
  <span title={veg ? 'Vegetarian' : 'Non-vegetarian'} aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
    className={`inline-grid place-items-center size-4 border-2 rounded-sm shrink-0 ${veg ? 'border-[#16845A]' : 'border-[#A32234]'}`}>
    <span className={`size-2 rounded-full ${veg ? 'bg-[#16845A]' : 'bg-[#A32234]'}`} /></span>;

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="block text-sm font-bold text-[#111D35] mb-1.5">{label}</span>{children}
    {hint && <span className="block text-xs text-[#576177] mt-1">{hint}</span>}</label>;
}
export const inputCls = 'w-full min-h-12 px-4 rounded-2xl border-[1.5px] border-[#F0D7E2] bg-white text-[#111D35] placeholder:text-[#8A93A5] focus:outline-none focus:border-[#C40054]';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#111D35]/50 p-0 sm:p-4" onClick={onClose}>
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
      className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 outline-none">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-extrabold">{title}</h2>
        <button onClick={onClose} aria-label="Close" className="size-10 grid place-items-center rounded-full hover:bg-[#FFF1F6] cursor-pointer"><X className="size-5" /></button></div>
      {children}
    </div></div>;
}

/** Re-renders every `ms` so countdowns and tracking stay current. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };
  const node = msg ? <div role="status" className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-[#111D35] text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg">{msg}</div> : null;
  return { show, node };
}

/** Loads async data with loading and error state. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    fn().then(d => alive && setData(d)).catch(e => alive && setError((e as Error).message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload: () => setTick(t => t + 1), setData };
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

const AVATAR_TONES = ['bg-[#C40054] text-white', 'bg-[#7C3AED] text-white', 'bg-[#FF922E] text-[#111D35]', 'bg-[#111D35] text-white', 'bg-[#16845A] text-white'];
export function Avatar({ name, index = 0 }: { name: string | null; index?: number }) {
  return <span aria-hidden className={`size-9 rounded-full grid place-items-center text-xs font-extrabold shrink-0 ${AVATAR_TONES[index % AVATAR_TONES.length]}`}>
    {(name ?? '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>;
}
