import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChargesLines, MemberShareRow, ShareBreakdown } from '../src/components/ShareBreakdown.tsx';
import { describe as describeActivity } from '../src/screens/ActivityScreen.tsx';
import type { Group, GroupMember, SharePayment } from '../src/lib/types.ts';

const pay = (food: number, shared: number, charges: number, total: number, status: SharePayment['status'] = 'pending'): SharePayment =>
  ({ food, shared_share: shared, charges_share: charges, tax_share: 0, total, status, method: null, reference: null, paid_at: null });
const member = (name: string, role: 'host' | 'member', is_me: boolean, p: SharePayment): GroupMember =>
  ({ member_id: name, name, role, is_me, done: false, items: [{ id: name + 'i', dish: 'Masala Dosa', qty: 1, unit_price: 100, notes: null, is_veg: true, is_shared: false, image_url: null }], payment: p });

// The worked example from the plan: 4 people, charges 40 + 20 + 36 = 96 (24 each), one shared 280 platter (70 each).
const itemised: Group = {
  id: 'g1', share_code: 'TNR742', status: 'placed', cut_off_at: '2026-10-24T10:00:00Z', split_rule: 'itemised',
  delivery_fee: 40, packaging_fee: 20, taxes: 36, max_members: 12, food_total: 830, is_member: true, is_host: true,
  placed_at: '2026-10-24T10:05:00Z', delivered_at: null,
  charges: { delivery: 40, packaging: 20, taxes: 36, total: 96, distance_km: 2 },
  restaurant: { id: 'r', name: 'Test Kitchen', cuisine: 'South Indian', area: 'Adyar', image_url: null, lat: 13.0, lng: 80.25 }, deliver_to: null,
  members: [
    member('Host', 'host', true, pay(220, 70, 24, 314, 'paid')),
    member('Member 2', 'member', false, pay(180, 70, 24, 274)),
    member('Member 3', 'member', false, pay(0, 70, 24, 94)),
    member('Member 4', 'member', false, pay(150, 70, 24, 244)),
  ],
};
const equal: Group = { ...itemised, split_rule: 'equal', members: itemised.members.map(m => ({ ...m, payment: pay(205.5, 0, 26, 231.5) })) };

const amounts = (html: string) => [...html.matchAll(/data-amount[^>]*>([^<]+)</g)].map(m => m[1]);

describe('share display shows exactly what the database returned', () => {
  it('itemised: own dishes, shared share, charges share and total for each person', () => {
    const totals = ['₹314', '₹274', '₹94', '₹244'];
    itemised.members.forEach((m, i) => {
      const html = renderToStaticMarkup(<ShareBreakdown group={itemised} member={m} />);
      expect(amounts(html)).toEqual([`₹${m.payment!.food}`, '₹70', '₹24', totals[i]]);
      expect(html).toContain('Pay for what you ordered');
    });
  });
  it('equal: one equal food share, charges share and total, no shared line', () => {
    const html = renderToStaticMarkup(<ShareBreakdown group={equal} member={equal.members[0]} />);
    expect(amounts(html)).toEqual(['₹205.5', '₹26', '₹231.5']);
    expect(html).toContain('Split everything equally');
    expect(html).not.toContain('shared dishes');
  });
  it('does not recompute: a total the database rounded differently is shown as given', () => {
    const odd = { ...itemised.members[0], payment: pay(220, 70, 24.01, 314.01) };
    expect(amounts(renderToStaticMarkup(<ShareBreakdown group={itemised} member={odd} />))).toEqual(['₹220', '₹70', '₹24.01', '₹314.01']);
  });
  it('member rows show food, shared, charges, total and Paid or Pending', () => {
    const host = renderToStaticMarkup(<ul><MemberShareRow member={itemised.members[0]} /></ul>);
    expect(host).toContain('Paid');
    expect(host).toContain('data-field="total">₹314<');
    const m2 = renderToStaticMarkup(<ul><MemberShareRow member={itemised.members[1]} /></ul>);
    expect(m2).toContain('Pending');
    expect(m2).toContain('data-field="food">₹180<');
  });
  it('shows the database charges as plain lines with their total', () => {
    const html = renderToStaticMarkup(<ChargesLines group={itemised} />);
    expect(amounts(html)).toEqual(['₹40', '₹20', '₹36', '₹96']);
    ['Delivery', 'Packaging', 'Taxes', 'GST 5%', '2.0 km'].forEach(w => expect(html).toContain(w));
  });
  it('while the cart is open, charges are marked as not final and explain how they were worked out', () => {
    const open: Group = { ...itemised, status: 'open', charges: { delivery: 174, packaging: 90, taxes: 5.25, total: 269.25, distance_km: 8.7, pinned: false, dishes: 3, per_km: 20, packaging_per_item: 30, gst_rate: 0.05 } };
    const html = renderToStaticMarkup(<ChargesLines group={open} />);
    expect(amounts(html)).toEqual(['₹174', '₹90', '₹5.25', '₹269.25']);
    ['final when the host places the order', '8.7 km × ₹20 per km', '3 dishes × ₹30', 'middle of the delivery area'].forEach(w => expect(html).toContain(w));
  });
  it('says shares are not ready before the order is placed', () => {
    const none = { ...itemised.members[0], payment: null };
    expect(renderToStaticMarkup(<ShareBreakdown group={itemised} member={none} />)).toContain('once the host places the order');
  });
});

describe('activity wording', () => {
  it('turns audit rows into plain sentences', () => {
    expect(describeActivity({ at: '', who: 'Ownly', is_me: false, table_name: 'group_orders', action: 'update', changes: { status: { from: 'open', to: 'locked' } } })).toBe('changed the order status to locked');
    expect(describeActivity({ at: '', who: 'Ownly', is_me: false, table_name: 'payments', action: 'update', changes: { status: { from: 'pending', to: 'paid' } } })).toBe('paid a share');
  });
});
