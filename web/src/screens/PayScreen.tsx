import { useState } from 'react';
import { listPaymentMethods } from '../api/ownly-api.ts';
import { DEMO_PAYMENT_NOTE } from '../lib/config.ts';
import { dateTime } from '../lib/format.ts';
import { hrefFor } from '../lib/router.ts';
import { Button, Card, Empty, ErrorNote, Spinner, statusBadge, useLoad } from '../ui/kit.tsx';
import { ChargesLines, MemberShareRow, ShareBreakdown } from '../components/ShareBreakdown.tsx';
import { PayModal } from '../components/PayModal.tsx';
import { useGroup } from '../ui/group.tsx';

export function PayScreen({ gid }: { gid: string }) {
  const { member: g, preview, error, loading, refresh } = useGroup(gid, 4000);
  const saved = useLoad(() => listPaymentMethods().catch(() => []), []);
  const [open, setOpen] = useState(false);

  if (loading && !g) return <Spinner />;
  if (error && !g) return <ErrorNote message={error} onRetry={refresh} />;
  if (preview || !g) return <Empty title="Join this group first" />;
  if (g.status === 'open' || g.status === 'locked') return <Empty title="Shares are worked out when the host places the order" action={<a href={hrefFor({ name: 'cart', gid })} className="font-bold">Back to the cart</a>} />;
  if (g.status === 'cancelled') return <Empty title="This order was cancelled" />;
  const me = g.members.find(m => m.is_me);
  const p = me?.payment;
  const paid = p?.status === 'paid';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-3xl font-extrabold">My share and pay</h1>
      <Card>
        <div className="flex items-center justify-between mb-3"><h2 className="text-xl font-extrabold">{g.restaurant.name}</h2>{p && statusBadge(p.status)}</div>
        {me ? <ShareBreakdown group={g} member={me} /> : <p>You are not in this order.</p>}
        <div className="mt-4"><ChargesLines group={g} /></div>
        {paid && p ? (
          <div className="mt-5 rounded-2xl bg-[#E5F6ED] text-[#125F43] p-4"><p className="font-bold">Paid{p.paid_at && ` on ${dateTime(p.paid_at)}`}</p>
            {p.reference && <p className="text-sm tabular-nums">Reference {p.reference}</p>}</div>
        ) : p && <div className="mt-5"><Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>Pay my share</Button><p className="text-xs text-[#576177] mt-2">{DEMO_PAYMENT_NOTE}</p></div>}
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
          <a href={hrefFor({ name: 'track', gid })}>Track the order</a><a href={hrefFor({ name: 'confirmed', gid })}>Order confirmation</a><a href={hrefFor({ name: 'activity', gid })}>Group activity</a>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-extrabold mb-3">Everyone's share</h2>
        <ul className="grid gap-3 md:grid-cols-2">{g.members.map(m => <MemberShareRow key={m.member_id} member={m} />)}</ul>
      </Card>

      {open && p && <PayModal groupId={gid} amount={p.total} saved={saved.data ?? []} onClose={() => setOpen(false)} onPaid={refresh} />}
    </div>
  );
}
