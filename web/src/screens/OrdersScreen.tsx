import { useState } from 'react';
import { getGroup, myGroupOrders } from '../api/ownly-api.ts';
import { dateTime, rupees } from '../lib/format.ts';
import { hrefFor, navigate, screenForStatus } from '../lib/router.ts';
import type { Group, HistoryRow } from '../lib/types.ts';
import { Badge, Button, Card, Empty, ErrorNote, Modal, Spinner, statusBadge, useLoad } from '../ui/kit.tsx';
import { ChargesLines, MemberShareRow, ShareBreakdown } from '../components/ShareBreakdown.tsx';

const STATUS_LABEL = { open: 'Open', locked: 'Locked', placed: 'Placed', delivered: 'Delivered', cancelled: 'Cancelled' } as const;

export function OrdersScreen() {
  const { data, error, loading, reload } = useLoad(myGroupOrders, []);
  const [receipt, setReceipt] = useState<Group | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const withGroup = async (row: HistoryRow, fn: (g: Group) => void) => {
    setBusyId(row.id); setErr(null);
    try { const g = await getGroup(row.id); if (g.is_member) fn(g as Group); } catch (e) { setErr((e as Error).message); } finally { setBusyId(null); }
  };

  if (loading) return <Spinner label="Loading your orders" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  const rows = data ?? [];
  const active = rows.filter(r => ['open', 'locked', 'placed'].includes(r.status));
  const past = rows.filter(r => !['open', 'locked', 'placed'].includes(r.status));

  const list = (items: HistoryRow[]) => (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map(r => (
        <li key={r.id}><Card className="h-full flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div><h3 className="text-lg font-extrabold">{r.restaurant}</h3><p className="text-sm text-[#576177]">{dateTime(r.placed_at ?? r.created_at)} · {r.members} {r.members === 1 ? 'person' : 'people'} · {r.role === 'host' ? 'You hosted' : 'You joined'}</p></div>
            <Badge tone={r.status === 'delivered' ? 'paid' : r.status === 'cancelled' ? 'failed' : 'pink'}>{STATUS_LABEL[r.status]}</Badge>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm">My share <strong className="tabular-nums" data-testid="my-share">{r.my_total != null ? rupees(r.my_total) : 'not set yet'}</strong></p>
            {r.my_payment_status && statusBadge(r.my_payment_status)}
          </div>
          <p className="text-xs text-[#576177] mt-1">Room {r.share_code}</p>
          <div className="mt-4 pt-3 border-t border-[#F5E6ED] flex flex-wrap gap-2 mt-auto">
            <a href={hrefFor({ name: screenForStatus(r.status), gid: r.id })} className="inline-flex min-h-11 px-4 items-center rounded-full bg-[#C40054] text-white text-sm font-bold no-underline">Open</a>
            {(r.status === 'placed' || r.status === 'delivered') && <Button variant="secondary" className="!min-h-11 !px-4 !text-sm" busy={busyId === r.id} onClick={() => withGroup(r, setReceipt)}>Receipt</Button>}
            {r.status !== 'open' && r.status !== 'locked' && <Button variant="secondary" className="!min-h-11 !px-4 !text-sm" busy={busyId === r.id} onClick={() => withGroup(r, g => navigate({ name: 'start', rid: g.restaurant.id }))}>Order again with this group</Button>}
            <a href={hrefFor({ name: 'activity', gid: r.id })} className="inline-flex min-h-11 px-3 items-center text-sm font-bold">Activity</a>
          </div>
        </Card></li>))}
    </ul>
  );

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-5">Orders</h1>
      {err && <div className="mb-4"><ErrorNote message={err} /></div>}
      {rows.length === 0 && <Empty title="No group orders yet" hint="Start one or join with a code." action={<a href={hrefFor({ name: 'explore' })} className="inline-flex min-h-12 px-6 items-center rounded-full bg-[#C40054] text-white font-bold no-underline">Browse restaurants</a>} />}
      {active.length > 0 && <section className="mb-8"><h2 className="text-xl font-extrabold mb-3">In progress</h2>{list(active)}</section>}
      {past.length > 0 && <section><h2 className="text-xl font-extrabold mb-3">Past orders</h2>{list(past)}</section>}
      {receipt && <Modal title={`Receipt · ${receipt.restaurant.name}`} onClose={() => setReceipt(null)}>
        {receipt.members.find(m => m.is_me) && <ShareBreakdown group={receipt} member={receipt.members.find(m => m.is_me)!} />}
        <div className="mt-4"><ChargesLines group={receipt} /></div>
        <h3 className="font-extrabold mt-5 mb-2">Everyone</h3>
        <ul className="space-y-3">{receipt.members.map(m => <MemberShareRow key={m.member_id} member={m} />)}</ul>
      </Modal>}
    </div>
  );
}
