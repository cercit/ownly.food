import { CircleCheckBig, History, MapPinned, ReceiptText, Wallet } from 'lucide-react';
import { hrefFor } from '../lib/router.ts';

const LINKS = {
  pay: { label: 'My share and pay', icon: Wallet },
  track: { label: 'Track the order', icon: MapPinned },
  confirmed: { label: 'Order confirmation', icon: CircleCheckBig },
  activity: { label: 'Group activity', icon: History },
  orders: { label: 'All orders', icon: ReceiptText },
} as const;
type LinkKey = keyof typeof LINKS;

/** Pill buttons with icons for moving between the screens of a placed group order. */
export function GroupLinks({ gid, show }: { gid: string; show: LinkKey[] }) {
  return (
    <nav aria-label="This group order" className="flex flex-wrap gap-2">
      {show.map(k => {
        const { label, icon: Icon } = LINKS[k];
        const href = k === 'orders' ? hrefFor({ name: 'orders' }) : hrefFor({ name: k, gid });
        return (
          <a key={k} href={href}
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full border-[1.5px] border-[#F0D7E2] bg-white text-[#111D35] text-sm font-bold no-underline hover:bg-[#FFF1F6] hover:border-[#C40054] focus-visible:outline-2 focus-visible:outline-[#C40054]">
            <Icon className="size-4 text-[#C40054]" aria-hidden />{label}
          </a>);
      })}
    </nav>
  );
}
