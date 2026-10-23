import { useMemo, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { addItem, cancelGroup, getMenu, leaveGroup, lockGroup, removeItem } from '../api/ownly-api.ts';
import { MAX_MEMBERS } from '../lib/config.ts';
import { labelName, mmss, rupees, splitRuleName } from '../lib/format.ts';
import { hrefFor, navigate } from '../lib/router.ts';
import type { Group, MenuItem } from '../lib/types.ts';
import { Avatar, Badge, Button, Card, Empty, ErrorNote, Field, Modal, Spinner, VegDot, inputCls, useLoad, useNow, useToast } from '../ui/kit.tsx';
import { SharePanel, useGroup } from '../ui/group.tsx';

export function CartScreen({ gid }: { gid: string }) {
  const { group, member, preview, error, loading, refresh } = useGroup(gid);
  const toast = useToast();
  const [tab, setTab] = useState<'menu' | 'cart'>('menu');
  const [picked, setPicked] = useState<MenuItem | null>(null);
  const [confirm, setConfirm] = useState<'cancel' | 'leave' | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const now = useNow();

  if (loading && !group) return <Spinner label="Loading the cart" />;
  if (error && !group) return <ErrorNote message={error} onRetry={refresh} />;
  if (preview) return <Empty title="Join this group first" hint="You are not in this group order yet." action={<a href={hrefFor({ name: 'join', code: preview.share_code })} className="font-bold">Go to join</a>} />;
  if (!member) return <Empty title="Group order not found" />;
  const g: Group = member;
  const open = g.status === 'open';
  const left = new Date(g.cut_off_at).getTime() - now;
  const mine = g.members.find(m => m.is_me);

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true); setActionError(null);
    try { await fn(); if (done) toast.show(done); await refresh(); } catch (e) { setActionError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div>
      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge tone="pink">Room {g.share_code}</Badge>
              <Badge tone={open ? 'paid' : 'pending'}>{({ open: 'Open', locked: 'Locked', placed: 'Placed', delivered: 'Delivered', cancelled: 'Cancelled' })[g.status]}</Badge>
              <Badge>{g.members.length} of {g.max_members || MAX_MEMBERS} people</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{g.restaurant.name}</h1>
            <p className="text-sm text-[#576177] mt-1">{g.restaurant.area}{g.deliver_to && ` · Deliver to ${labelName(g.deliver_to.label, g.deliver_to.label_name)}, ${g.deliver_to.area}`}</p>
            <p className="text-sm mt-1">Split rule: <strong>{splitRuleName(g.split_rule)}</strong></p>
          </div>
          <div className="text-right">
            {open && <><p className="text-xs text-[#576177]">{left > 0 ? 'Cut-off in' : 'Cut-off time'}</p><p className="text-2xl font-extrabold tabular-nums" data-testid="countdown">{left > 0 ? mmss(left / 1000) : 'passed'}</p></>}
            <p className="text-xs text-[#576177] mt-2">Food total</p><p className="text-xl font-extrabold tabular-nums" data-testid="food-total">{rupees(g.food_total)}</p>
          </div>
        </div>
        {open && left <= 0 && <p className="mt-3 text-sm bg-[#FFF1D9] text-[#855000] rounded-xl p-3">The cut-off time has passed, so no more dishes can be added. The host can place the order.</p>}
        {g.status === 'locked' && <p className="mt-3 text-sm bg-[#FFF1D9] text-[#855000] rounded-xl p-3">The host has locked the cart. No more dishes can be added.</p>}
        {g.status === 'cancelled' && <p className="mt-3 text-sm bg-[#FFE7E9] text-[#A32234] rounded-xl p-3">The host cancelled this order.</p>}
        {(g.status === 'placed' || g.status === 'delivered') && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={hrefFor({ name: 'pay', gid })} className="inline-flex min-h-11 px-5 items-center rounded-full bg-[#C40054] text-white font-bold no-underline">My share and pay</a>
            <a href={hrefFor({ name: 'track', gid })} className="inline-flex min-h-11 px-5 items-center rounded-full border-[1.5px] border-[#F0D7E2] font-bold no-underline text-[#111D35]">Track order</a>
          </div>)}
        {actionError && <div className="mt-3"><ErrorNote message={actionError} /></div>}
      </Card>

      {(open || g.status === 'locked') && g.is_host && <details className="mb-5"><summary className="cursor-pointer font-bold text-[#C40054] min-h-11 flex items-center">Show the code, link and QR</summary><Card className="mt-2"><SharePanel code={g.share_code} restaurant={g.restaurant.name} /></Card></details>}
      {(open || g.status === 'locked') && !g.is_host && <details className="mb-5"><summary className="cursor-pointer font-bold text-[#C40054] min-h-11 flex items-center">Invite someone else</summary><Card className="mt-2"><SharePanel code={g.share_code} restaurant={g.restaurant.name} /></Card></details>}

      <div className="lg:hidden grid grid-cols-2 gap-2 mb-4" role="tablist">
        {(['menu', 'cart'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
          className={`min-h-11 rounded-full font-bold text-sm cursor-pointer ${tab === t ? 'bg-[#C40054] text-white' : 'bg-white border border-[#F0D7E2] text-[#576177]'}`}>{t === 'menu' ? 'Menu' : `Cart (${g.members.reduce((n, m) => n + m.items.length, 0)})`}</button>)}
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
        <div className={`${tab === 'menu' ? 'block' : 'hidden'} lg:block`}>
          <MenuPanel restaurantId={g.restaurant.id} canAdd={open && !!mine && left > 0} onPick={setPicked} />
        </div>
        <div className={`${tab === 'cart' ? 'block' : 'hidden'} lg:block lg:sticky lg:top-24 space-y-4`}>
          <Card>
            <h2 className="text-xl font-extrabold mb-3">Shared cart</h2>
            {g.members.every(m => m.items.length === 0) && <Empty title="The cart is empty" hint={open ? 'Pick a dish from the menu to add it.' : undefined} />}
            <ul className="space-y-5">
              {g.members.filter(m => m.items.length > 0).map(m => (
                <li key={m.member_id}>
                  <p className="font-extrabold flex items-center gap-2"><Avatar name={m.name} index={g.members.indexOf(m)} />{m.name}{m.is_me && ' (you)'}{m.role === 'host' && <span className="text-xs font-bold text-[#C40054]">Host</span>}</p>
                  <ul className="mt-1 divide-y divide-[#F5E6ED]">
                    {m.items.map(i => (
                      <li key={i.id} className="py-2 flex items-start gap-2">
                        <VegDot veg={i.is_veg} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{i.qty} × {i.dish} {i.is_shared && <Badge tone="pink">Shared</Badge>}</p>
                          {i.notes && <p className="text-xs text-[#576177]">Note: {i.notes}</p>}
                        </div>
                        <span className="text-sm font-bold tabular-nums">{rupees(i.qty * i.unit_price)}</span>
                        {m.is_me && open && <button aria-label={`Remove ${i.dish}`} disabled={busy} onClick={() => act(() => removeItem(i.id))} className="size-10 grid place-items-center rounded-full text-[#A32234] hover:bg-[#FFE7E9] cursor-pointer"><Trash2 className="size-4" /></button>}
                      </li>))}
                  </ul>
                </li>))}
            </ul>
            <div className="flex justify-between border-t border-[#F0D7E2] mt-4 pt-3 font-extrabold text-lg"><span>Food total</span><span className="tabular-nums">{rupees(g.food_total)}</span></div>
          </Card>

          {g.is_host && (open || g.status === 'locked') && (
            <Card className="space-y-3">
              <p className="font-extrabold">Host controls</p>
              {open && <Button variant="secondary" className="w-full" busy={busy} onClick={() => act(() => lockGroup(gid), 'Cart locked')}>Lock the cart</Button>}
              <a href={hrefFor({ name: 'checkout', gid })} className="inline-flex w-full min-h-12 items-center justify-center rounded-full bg-[#C40054] text-white font-bold no-underline hover:bg-[#A80047]">Go to checkout</a>
              <Button variant="danger" className="w-full" onClick={() => setConfirm('cancel')}>Cancel this order</Button>
            </Card>)}
          {!g.is_host && (open || g.status === 'locked') && <Button variant="ghost" className="w-full" onClick={() => setConfirm('leave')}>Leave this group</Button>}
        </div>
      </div>

      {picked && <AddDishModal dish={picked} rule={g.split_rule} onClose={() => setPicked(null)}
        onAdd={(qty, notes, shared) => act(async () => { await addItem(gid, picked.id, qty, notes, shared); setPicked(null); }, 'Added to the cart')} busy={busy} error={actionError} />}
      {confirm && <Modal title={confirm === 'cancel' ? 'Cancel this order?' : 'Leave this group?'} onClose={() => setConfirm(null)}>
        <p className="text-[#576177]">{confirm === 'cancel' ? 'Nobody can add dishes or pay after you cancel.' : 'Your dishes are removed from the cart.'}</p>
        <div className="mt-5 flex gap-3">
          <Button variant="danger" busy={busy} onClick={async () => {
            await act(() => (confirm === 'cancel' ? cancelGroup(gid) : leaveGroup(gid)));
            setConfirm(null); if (confirm === 'leave') navigate({ name: 'orders' });
          }}>{confirm === 'cancel' ? 'Yes, cancel the order' : 'Yes, leave'}</Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>Keep it</Button></div>
      </Modal>}
      {toast.node}
    </div>
  );
}

function MenuPanel({ restaurantId, canAdd, onPick }: { restaurantId: string; canAdd: boolean; onPick: (m: MenuItem) => void }) {
  const menu = useLoad(() => getMenu(restaurantId), [restaurantId]);
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const m = new Map<string, MenuItem[]>();
    (menu.data ?? []).filter(i => i.name.toLowerCase().includes(q.trim().toLowerCase())).forEach(i => m.set(i.category, [...(m.get(i.category) ?? []), i]));
    return [...m.entries()];
  }, [menu.data, q]);
  if (menu.loading) return <Spinner label="Loading the menu" />;
  if (menu.error) return <ErrorNote message={menu.error} onRetry={menu.reload} />;
  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search dishes" aria-label="Search dishes" className={`${inputCls} mb-4`} />
      {groups.length === 0 && <Empty title="No dishes found" />}
      {groups.map(([cat, items]) => (
        <section key={cat} className="mb-6">
          <h2 className="text-lg font-extrabold mb-2">{cat}</h2>
          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className={`flex items-center gap-3 bg-white border border-[#F0D7E2] rounded-2xl p-3 ${i.is_available ? '' : 'opacity-60'}`}>
                <div className="size-16 rounded-xl overflow-hidden bg-[#FFE3ED] shrink-0">{i.image_url && <img src={i.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><VegDot veg={i.is_veg} /><p className="font-bold leading-snug">{i.name}</p></div>
                  <p className="font-extrabold tabular-nums">{rupees(i.price)}</p>
                  {!i.is_available && <p className="text-xs font-bold text-[#A32234]">Not available right now</p>}
                </div>
                <Button variant="secondary" className="!min-h-11 !px-4" disabled={!canAdd || !i.is_available} onClick={() => onPick(i)} aria-label={`Add ${i.name}`}>Add</Button>
              </li>))}
          </ul>
        </section>))}
    </div>
  );
}

function AddDishModal({ dish, rule, onClose, onAdd, busy, error }: { dish: MenuItem; rule: Group['split_rule']; onClose: () => void; onAdd: (qty: number, notes: string | null, shared: boolean) => void; busy: boolean; error: string | null }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [shared, setShared] = useState(false);
  return (
    <Modal title={dish.name} onClose={onClose}>
      <p className="font-extrabold tabular-nums text-lg">{rupees(dish.price)} each</p>
      <div className="mt-4 flex items-center gap-4">
        <span className="font-bold">Quantity</span>
        <div className="flex items-center gap-3">
          <button aria-label="Fewer" disabled={qty <= 1} onClick={() => setQty(q => q - 1)} className="size-11 grid place-items-center rounded-full border-[1.5px] border-[#F0D7E2] disabled:opacity-40 cursor-pointer"><Minus className="size-4" /></button>
          <span className="w-8 text-center text-xl font-extrabold tabular-nums" aria-live="polite">{qty}</span>
          <button aria-label="More" onClick={() => setQty(q => q + 1)} className="size-11 grid place-items-center rounded-full border-[1.5px] border-[#F0D7E2] cursor-pointer"><Plus className="size-4" /></button>
        </div>
      </div>
      <div className="mt-4"><Field label="Note for the restaurant (optional)"><input value={notes} maxLength={140} onChange={e => setNotes(e.target.value)} placeholder="For example: less spicy, no onion" className={inputCls} /></Field></div>
      {rule === 'itemised'
        ? <label className="mt-4 flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} className="mt-1 size-5 accent-[#C40054]" />
            <span><span className="font-bold block">Shared</span><span className="text-sm text-[#576177]">This dish is split equally across everyone in the group.</span></span></label>
        : <p className="mt-4 text-sm text-[#576177]">This group splits everything equally, so there is no need to mark dishes as Shared.</p>}
      {error && <div className="mt-4"><ErrorNote message={error} /></div>}
      <div className="mt-5 flex gap-3"><Button busy={busy} onClick={() => onAdd(qty, notes.trim() || null, rule === 'itemised' && shared)}>Add {qty} · {rupees(dish.price * qty)}</Button><Button variant="secondary" onClick={onClose}>Cancel</Button></div>
    </Modal>
  );
}
