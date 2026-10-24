import { useState } from 'react';
import { Banknote } from 'lucide-react';
import { listPaymentMethods, passOnCash, payMyShare } from '../api/ownly-api.ts';
import { DEMO_PAYMENT_NOTE } from '../lib/config.ts';
import { dateTime, rupees } from '../lib/format.ts';
import { hrefFor } from '../lib/router.ts';
import { Button, Card, Empty, ErrorNote, Spinner, statusBadge, useLoad } from '../ui/kit.tsx';
import { ChargesLines, MemberShareRow, ShareBreakdown } from '../components/ShareBreakdown.tsx';
import { PayModal } from '../components/PayModal.tsx';
import { useGroup } from '../ui/group.tsx';
import { GroupLinks } from '../components/GroupLinks.tsx';

export function PayScreen({ gid }: { gid: string }) {
  const { member: g, preview, error, loading, refresh } = useGroup(gid, 4000);
  const saved = useLoad(() => listPaymentMethods().catch(() => []), []);
  const [open, setOpen] = useState<'share' | 'cash' | null>(null);

  if (loading && !g) return <Spinner />;
  if (error && !g) return <ErrorNote message={error} onRetry={refresh} />;
  if (preview || !g) return <Empty title="Join this group first" />;
  if (g.status === 'open' || g.status === 'locked') return <Empty title="Shares are worked out when the host places the order" action={<a href={hrefFor({ name: 'cart', gid })} className="font-bold">Back to the cart</a>} />;
  if (g.status === 'cancelled') return <Empty title="This order was cancelled" />;
  const me = g.members.find(m => m.is_me);
  const p = me?.payment;
  const paid = p?.status === 'paid';
  // cash members handed the host that is still with the host
  const cashFrom = g.members.filter(m => !m.is_me && m.payment?.method === 'cash' && m.payment.status === 'paid' && !m.payment.cash_passed_on);
  const cashDue = Number(g.cash_to_pass_on ?? 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-3xl font-extrabold">My share and pay</h1>

      {g.is_host && cashDue > 0 && (
        <Card className="border-[#FF922E] bg-[#FFF7EE]">
          <div className="flex items-start gap-3">
            <Banknote className="size-6 text-[#A65D00] shrink-0 mt-1" aria-hidden />
            <div className="flex-1">
              <h2 className="text-xl font-extrabold">Pass on the cash you collected</h2>
              <p className="text-[#576177] mt-1">
                {cashFrom.map(m => m.name).join(', ')} paid you in cash. That money is with you, not the restaurant, so pay it on here.
              </p>
              <p className="text-2xl font-extrabold tabular-nums mt-3" data-testid="cash-due">{rupees(cashDue)}</p>
              <div className="mt-4"><Button onClick={() => setOpen('cash')}>Pay {rupees(cashDue)} to the restaurant</Button>
                <p className="text-xs text-[#576177] mt-2">{DEMO_PAYMENT_NOTE}</p></div>
            </div>
          </div>
        </Card>)}

      <Card>
        <div className="flex items-center justify-between mb-3"><h2 className="text-xl font-extrabold">{g.restaurant.name}</h2>{p && statusBadge(p.status)}</div>
        {me ? <ShareBreakdown group={g} member={me} /> : <p>You are not in this order.</p>}
        <div className="mt-4"><ChargesLines group={g} /></div>
        {paid && p ? (
          <div className="mt-5 rounded-2xl bg-[#E5F6ED] text-[#125F43] p-4">
            <p className="font-bold">{p.method === 'cash' ? 'Paid in cash to the host' : 'Paid'}{p.paid_at && ` on ${dateTime(p.paid_at)}`}</p>
            {p.method === 'cash'
              ? <p className="text-sm">{p.cash_passed_on ? '✓ The host has passed it on to the restaurant.' : 'The host still has to pass it on to the restaurant.'}</p>
              : p.reference && <p className="text-sm tabular-nums">Reference {p.reference}</p>}
          </div>
        ) : p && <div className="mt-5"><Button className="w-full sm:w-auto" onClick={() => setOpen('share')}>Pay my share</Button><p className="text-xs text-[#576177] mt-2">{DEMO_PAYMENT_NOTE}</p></div>}
        <div className="mt-5"><GroupLinks gid={gid} show={['track', 'confirmed', 'activity']} /></div>
      </Card>

      <Card>
        <h2 className="text-xl font-extrabold mb-3">Everyone's share</h2>
        <ul className="grid gap-3 md:grid-cols-2">{g.members.map(m => <MemberShareRow key={m.member_id} member={m} />)}</ul>
      </Card>

      {open === 'share' && p && <PayModal amount={p.total} saved={saved.data ?? []} allowCash={!g.is_host}
        pay={m => payMyShare(gid, m)} onClose={() => setOpen(null)} onPaid={refresh} />}
      {open === 'cash' && <PayModal title="Pass on the cash you collected" amount={cashDue} saved={saved.data ?? []} allowCash={false}
        failNote="The cash is still marked as with you." pay={m => passOnCash(gid, m)} onClose={() => setOpen(null)} onPaid={refresh} />}
    </div>
  );
}
