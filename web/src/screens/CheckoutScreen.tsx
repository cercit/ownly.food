import { useState } from 'react';
import { cancelGroup, lockGroup, placeGroup } from '../api/ownly-api.ts';
import { rupees, splitRuleName } from '../lib/format.ts';
import { hrefFor, navigate } from '../lib/router.ts';
import { Badge, Button, Card, Empty, ErrorNote, Modal, Spinner } from '../ui/kit.tsx';
import { ChargesLines } from '../components/ShareBreakdown.tsx';
import { useGroup } from '../ui/group.tsx';

export function CheckoutScreen({ gid }: { gid: string }) {
  const { member: g, preview, error, loading, refresh } = useGroup(gid);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'place' | 'cancel' | null>(null);

  if (loading && !g) return <Spinner />;
  if (error && !g) return <ErrorNote message={error} onRetry={refresh} />;
  if (preview || !g) return <Empty title="Join this group first" />;
  if (!g.is_host) return <Empty title="Only the host can check out" hint="The host locks and places the order." action={<a href={hrefFor({ name: 'cart', gid })} className="font-bold">Back to the cart</a>} />;
  if (g.status === 'placed' || g.status === 'delivered') return <Empty title="This order is already placed" action={<a href={hrefFor({ name: 'confirmed', gid })} className="font-bold">See the confirmation</a>} />;
  if (g.status === 'cancelled') return <Empty title="This order was cancelled" />;

  const sharedItems = g.members.flatMap(m => m.items.filter(i => i.is_shared));
  const notDone = g.members.filter(m => !m.done && !m.is_me);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(null); try { await fn(); } catch (e) { setErr((e as Error).message); setConfirm(null); } finally { setBusy(false); } };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <a href={hrefFor({ name: 'cart', gid })} className="text-sm font-bold text-[#C40054]">Back to the cart</a>
      <h1 className="text-3xl font-extrabold">Host checkout</h1>
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-3"><h2 className="text-xl font-extrabold">{g.restaurant.name}</h2><Badge tone={g.status === 'locked' ? 'pending' : 'paid'}>{g.status === 'locked' ? 'Locked' : 'Open'}</Badge></div>
        <p className="text-sm">Split rule: <strong>{splitRuleName(g.split_rule)}</strong></p>
        <ul className="mt-4 space-y-3">
          {g.members.map(m => (
            <li key={m.member_id} className="border border-[#F0D7E2] rounded-2xl p-3">
              <p className="font-bold flex flex-wrap items-center gap-2">{m.name}{m.is_me && ' (you)'}{m.done ? <Badge tone="paid">✓ Done</Badge> : <Badge tone="pending">Adding items</Badge>}</p>
              {m.items.length === 0 ? <p className="text-sm text-[#576177]">No dishes yet</p> :
                <ul className="text-sm text-[#576177] mt-1">{m.items.map(i => <li key={i.id} className="flex justify-between gap-3"><span>{i.qty} × {i.dish}{i.is_shared ? ' (shared)' : ''}{i.notes ? ` · ${i.notes}` : ''}</span><span className="tabular-nums">{rupees(i.qty * i.unit_price)}</span></li>)}</ul>}
            </li>))}
        </ul>
        {g.split_rule === 'itemised' && sharedItems.length > 0 && <p className="text-xs text-[#576177] mt-3">{sharedItems.length} shared {sharedItems.length === 1 ? 'dish is' : 'dishes are'} split equally across everyone.</p>}
        <div className="flex justify-between border-t border-[#F0D7E2] mt-4 pt-3 font-extrabold text-lg"><span>Food total</span><span className="tabular-nums" data-testid="food-total">{rupees(g.food_total)}</span></div>
      </Card>

      <Card>
        <h2 className="text-xl font-extrabold">Charges for this order</h2>
        <p className="text-sm text-[#576177] mt-1 mb-4">Worked out automatically: delivery by distance, packaging per dish and GST on the food. Each is split equally across everyone, including you.</p>
        <ChargesLines group={g} />
        <div className="flex justify-between mt-4 font-extrabold text-lg"><span>Whole bill</span><span className="tabular-nums" data-testid="bill-total">{rupees(g.food_total + g.charges.total)}</span></div>
        <p className="text-sm text-[#576177] mt-3">When you place the order, the database works out each person's share. You see all of them on the next screen.</p>
        {err && <div className="mt-4"><ErrorNote message={err} /></div>}
        <div className="mt-5 flex flex-wrap gap-3">
          {g.status === 'open' && <Button variant="secondary" busy={busy} onClick={() => run(async () => { await lockGroup(gid); await refresh(); })}>Lock the cart</Button>}
          <Button disabled={g.food_total <= 0} onClick={() => setConfirm('place')}>Place order</Button>
          <Button variant="danger" onClick={() => setConfirm('cancel')}>Cancel the order</Button>
        </div>
        {g.food_total <= 0 && <p className="text-sm text-[#576177] mt-3">The cart is empty. Add at least one dish to place the order.</p>}
      </Card>

      {confirm === 'place' && <Modal title="Place this order?" onClose={() => setConfirm(null)}>
        <p className="text-[#576177]">Food {rupees(g.food_total)} plus charges {rupees(g.charges.total)} = {rupees(g.food_total + g.charges.total)}. After this nobody can add dishes.</p>
        {notDone.length > 0 && <p className="mt-3 text-sm bg-[#FFF1D9] text-[#855000] rounded-xl p-3">{notDone.map(m => m.name).join(', ')} {notDone.length === 1 ? 'has' : 'have'} not tapped Done yet.</p>}
        <div className="mt-5 flex gap-3"><Button busy={busy} onClick={() => run(async () => { await placeGroup(gid); navigate({ name: 'confirmed', gid }); })}>Place order</Button><Button variant="secondary" onClick={() => setConfirm(null)}>Not yet</Button></div>
      </Modal>}
      {confirm === 'cancel' && <Modal title="Cancel this order?" onClose={() => setConfirm(null)}>
        <p className="text-[#576177]">Nobody can add dishes or pay after you cancel.</p>
        <div className="mt-5 flex gap-3"><Button variant="danger" busy={busy} onClick={() => run(async () => { await cancelGroup(gid); navigate({ name: 'orders' }); })}>Yes, cancel the order</Button><Button variant="secondary" onClick={() => setConfirm(null)}>Keep it</Button></div>
      </Modal>}
    </div>
  );
}
