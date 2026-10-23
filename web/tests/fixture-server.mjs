// Fake Supabase for the browser check only. Answers the same URLs the app calls, from the real catalogue CSVs.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..', '..');
const rcsv = readCsv(path.join(repo, 'db/chennai/restaurants.csv'));
const mcsv = readCsv(path.join(repo, 'db/chennai/menu_items.csv'));
export const restaurants = rcsv.map((r, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, name: r.name, cuisine: r.cuisine, area: r.area, city: r.city,
  lat: +r.lat, lng: +r.lng, veg_only: r.veg_only === 'true', opens_at: r.opens_at + ':00', closes_at: r.closes_at + ':00', active: true, image_url: null,
}));
export const menu = mcsv.map((m, i) => ({
  id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  restaurant_id: restaurants.find(r => r.name === m.restaurant_name)?.id, name: m.name, category: m.category,
  price: +m.price, is_veg: m.is_veg === 'true', is_available: m.is_available === 'true', image_url: null,
}));

export const ME = { id: '20000000-0000-4000-8000-000000000001', email: 'sameer@example.org', full_name: 'Sameer' };

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });

/** Intercepts every Supabase call for one page. `sc.signedIn` fakes a session. */
export async function installFixture(ctx, page, sc) {
  const state = { calls: [], ...(sc.state ?? {}) };
  const url = new URL('https://brliajwgrhsnbgxaucsu.supabase.co');
  if (sc.signedIn) {
    const session = { access_token: 'x.y.z', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
      user: { id: 'u1', aud: 'authenticated', email: ME.email, app_metadata: {}, user_metadata: {}, created_at: '2026-10-23T00:00:00Z' } };
    await ctx.addInitScript(s => localStorage.setItem('sb-brliajwgrhsnbgxaucsu-auth-token', JSON.stringify(s)), session);
  }
  await page.route(`${url.origin}/**`, async route => {
    const req = route.request();
    const u = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const p = u.pathname;
    state.calls.push(`${req.method()} ${p}${u.search}`);
    if (p === '/auth/v1/user') return sc.signedIn ? json(route, { id: 'u1', aud: 'authenticated', email: ME.email, app_metadata: {}, user_metadata: {}, created_at: '2026-10-23T00:00:00Z' }) : json(route, { msg: 'no session' }, 401);
    if (p.startsWith('/auth/v1/')) return json(route, {});
    if (p.startsWith('/rest/v1/rpc/')) {
      const fn = p.split('/').pop(); const body = req.postData() ? JSON.parse(req.postData()) : {};
      state.calls.push(`rpc ${fn} ${JSON.stringify(body)}`);
      const h = state.rpc?.[fn];
      if (h) { const out = h(body, state); if (out && out.__error) return json(route, { message: out.__error, code: 'P0001' }, 400); return json(route, out); }
      if (fn === 'my_group_orders') return json(route, state.history ?? []);
      return json(route, null);
    }
    if (p === '/rest/v1/audit_log') return json(route, state.audit ?? []);
    if (sc.handler) { const r = await sc.handler({ req, u, p, state, json: b => json(route, b) , route }); if (r !== undefined) return; }
    if (p === '/rest/v1/restaurants') return json(route, restaurants);
    if (p === '/rest/v1/menu_items') { const rid = (u.searchParams.get('restaurant_id') ?? '').replace('eq.', ''); return json(route, menu.filter(m => m.restaurant_id === rid)); }
    if (p === '/rest/v1/profiles') return json(route, [{ ...ME, phone: null, default_address_id: null, consent_location_at: null }]);
    if (p === '/rest/v1/addresses' || p === '/rest/v1/payment_methods') return json(route, state[p.split('/').pop()] ?? []);
    if (p === '/rest/v1/rpc/my_group_orders') return json(route, state.history ?? []);
    return json(route, []);
  });
  return state;
}

const R0 = restaurants[0];
const iso = ms => new Date(Date.now() + ms).toISOString();
const item = (id, dish, qty, price, shared = false, notes = null, veg = true) => ({ id, dish, qty, unit_price: price, notes, is_veg: veg, is_shared: shared, image_url: null });
const pay = (food, sh, ch, total, status = 'pending') => ({ food, shared_share: sh, charges_share: ch, tax_share: 0, total, status, method: status === 'paid' ? 'upi' : null, reference: status === 'paid' ? 'pay_TEST_ABC123' : null, paid_at: status === 'paid' ? iso(-60000) : null });
export const makeGroup = (over = {}, withPay = false) => ({
  id: 'g-1', share_code: 'TNR742', status: 'open', cut_off_at: iso(25 * 60000), split_rule: 'itemised', delivery_fee: null, packaging_fee: null, taxes: null,
  max_members: 12, food_total: 550, is_member: true, is_host: true, placed_at: null, delivered_at: null,
  restaurant: { id: R0.id, name: R0.name, cuisine: R0.cuisine, area: R0.area, image_url: null },
  deliver_to: { label: 'office', label_name: 'Office', area: 'OMR', city: 'Chennai' },
  members: [
    { member_id: 'm1', name: 'Sameer', role: 'host', is_me: true, items: [item('i1', menu[0].name, 2, 110, false, 'less spicy'), item('i2', 'Crispy starter platter', 1, 280, true)], payment: withPay ? pay(220, 70, 24, 314, 'paid') : null },
    { member_id: 'm2', name: 'Priya', role: 'member', is_me: false, items: [item('i3', menu[1].name, 1, 180, false, null, false)], payment: withPay ? pay(180, 70, 24, 274) : null },
    { member_id: 'm3', name: 'Rahul', role: 'member', is_me: false, items: [], payment: withPay ? pay(0, 70, 24, 94) : null },
    { member_id: 'm4', name: 'Anita', role: 'member', is_me: false, items: [item('i4', menu[2].name, 1, 150)], payment: withPay ? pay(150, 70, 24, 244) : null },
  ], ...over,
});
const placed = (ms = -100000, over = {}) => makeGroup({ status: 'placed', placed_at: iso(ms), delivery_fee: 40, packaging_fee: 20, taxes: 36, food_total: 830, ...over }, true);
const preview = (over = {}) => ({ id: 'g-1', share_code: 'TNR742', status: 'open', cut_off_at: iso(20 * 60000), restaurant: R0.name, area: R0.area, image_url: null, host: 'Ananya', split_rule: 'itemised', members: 3, is_member: false, ...over });
const addr = [{ id: 'a1', label: 'office', label_name: 'Office', line1: 'Tower B, 5th floor', line2: null, landmark: null, area: 'OMR', city: 'Chennai', pincode: '600096', lat: null, lng: null, source: 'manual', is_default: true }];
const history = [
  { id: 'g-1', share_code: 'TNR742', status: 'placed', restaurant: R0.name, created_at: iso(-3600000), placed_at: iso(-3000000), role: 'host', members: 4, my_total: 314, my_payment_status: 'paid' },
  { id: 'g-2', share_code: 'ADY882', status: 'delivered', restaurant: restaurants[3].name, created_at: iso(-86400000 * 3), placed_at: iso(-86400000 * 3), role: 'member', members: 5, my_total: 284, my_payment_status: 'paid' },
  { id: 'g-3', share_code: 'OMR555', status: 'cancelled', restaurant: restaurants[6].name, created_at: iso(-86400000 * 6), placed_at: null, role: 'host', members: 2, my_total: null, my_payment_status: null },
];
const pendingMe = () => placed(-100000, { members: placed().members.map(m => m.is_me ? { ...m, payment: { ...m.payment, status: 'pending', method: null, reference: null, paid_at: null } } : m) });
const getG = g => body => (body.p_code && g.__preview ? g.__preview : g);

export const scenarios = [
  { name: 'explore', hash: '/', expect: 'Order together.', waitFor: 'ul li' },
  { name: 'menu', hash: `/menu/${restaurants[0].id}`, expect: restaurants[0].name, waitFor: 'h2' },
  { name: 'signin', hash: '/signin', expect: 'Sign in' },
  { name: 'signed-out-start', hash: '/start', expect: 'Sign in first' },
  { name: 'signin-code-step', hash: '/signin', expect: '6-digit code',
    act: async page => { await page.getByLabel('Email').fill('priya@example.org'); await page.getByRole('button', { name: 'Send me a code' }).click(); await page.getByLabel('6-digit code').waitFor(); } },
  { name: 'profile', hash: '/profile', signedIn: true, expect: 'Saved addresses',
    state: {
      addresses: [
        { id: 'a1', label: 'office', label_name: 'Office', line1: 'Tower B, 5th floor', line2: null, landmark: 'Opposite the metro', area: 'OMR', city: 'Chennai', pincode: '600096', lat: 12.9442, lng: 80.2375, source: 'gps', is_default: true },
        { id: 'a2', label: 'friend', label_name: "Rahul's flat", line1: '12 Second Street', line2: null, landmark: null, area: 'Adyar', city: 'Chennai', pincode: '600020', lat: null, lng: null, source: 'manual', is_default: false },
      ],
      payment_methods: [{ id: 'p1', type: 'card', display_label: 'Visa •••• 4242', is_default: true }],
    } },
  { name: 'profile-add-address', hash: '/profile', signedIn: true, expect: 'Address line 1',
    act: async page => { await page.getByRole('button', { name: 'Add address' }).click(); } },
  { name: 'start', hash: `/start/${R0.id}`, signedIn: true, expect: 'Start a group order', state: { addresses: addr, rpc: { create_group_order: () => ({ id: 'g-1', share_code: 'TNR742', split_rule: 'itemised', existing: false }) } } },
  { name: 'start-created', hash: `/start/${R0.id}`, signedIn: true, expect: 'Your group order is open', state: { addresses: addr, rpc: { create_group_order: () => ({ id: 'g-1', share_code: 'TNR742', split_rule: 'itemised', existing: false }) } },
    act: async page => { await page.getByRole('button', { name: 'Start group order' }).click(); await page.getByTestId('room-code').waitFor(); },
    verify: st => st.calls.some(c => /^rpc create_group_order .*"p_split":"itemised"/.test(c)) ? null : 'create_group_order not called with the itemised rule' },
  { name: 'start-no-address', hash: `/start/${R0.id}`, signedIn: true, expect: 'You have no saved address yet' },
  { name: 'join-link', hash: '', search: '?join=TNR742', signedIn: true, expect: 'Join this group', state: { rpc: { get_group: () => preview() } } },
  { name: 'join-full', hash: '/join/TNR742', signedIn: true, expect: 'This group is full (12 people).', state: { rpc: { get_group: () => preview({ members: 12 }) } } },
  { name: 'join-dashed-code', hash: '/join/TNR-742', signedIn: true, expect: 'no dash or spaces' },
  { name: 'join-signed-out', hash: '/join/TNR742', expect: 'Sign in to see and join group TNR742' },
  { name: 'cart', hash: '/g/g-1/cart', signedIn: true, expect: 'Shared cart', state: { rpc: { get_group: () => makeGroup() } },
    act: async page => { const t = page.getByRole('tab', { name: /^Cart/ }); if (await t.isVisible()) await t.click(); } },
  { name: 'cart-add-dish', hash: '/g/g-1/cart', signedIn: true, expect: 'Added to the cart', state: { rpc: { get_group: () => makeGroup(), add_item: () => 'i9' } },
    act: async page => { await page.getByRole('button', { name: /^Add / }).first().click(); await page.getByRole('button', { name: /^Add 1/ }).click(); },
    verify: st => st.calls.some(c => /^rpc add_item .*"p_qty":1.*"p_shared":false/.test(c)) ? null : 'add_item was not called with qty 1, not shared' },
  { name: 'cart-locked', hash: '/g/g-1/cart', signedIn: true, expect: 'The host has locked the cart', state: { rpc: { get_group: () => makeGroup({ status: 'locked' }) } } },
  { name: 'cart-empty', hash: '/g/g-1/cart', signedIn: true, expect: 'The cart is empty', state: { rpc: { get_group: () => makeGroup({ food_total: 0, members: makeGroup().members.map(m => ({ ...m, items: [] })) }) } },
    act: async page => { const t = page.getByRole('tab', { name: /^Cart/ }); if (await t.isVisible()) await t.click(); } },
  { name: 'checkout', hash: '/g/g-1/checkout', signedIn: true, expect: "Rapido's charges for this order", state: { rpc: { get_group: () => makeGroup() } } },
  { name: 'confirmed', hash: '/g/g-1/confirmed', signedIn: true, expect: 'Order placed!', state: { rpc: { get_group: () => placed() } } },
  { name: 'pay', hash: '/g/g-1/pay', signedIn: true, expect: 'You pay', state: { rpc: { get_group: () => placed(-100000, { members: placed().members.map(m => m.is_me ? { ...m, payment: { ...m.payment, status: 'pending', method: null, reference: null, paid_at: null } } : m) }) } } },
  { name: 'pay-modal', hash: '/g/g-1/pay', signedIn: true, expect: 'Demo payment: no real money moves.', state: { rpc: { get_group: () => placed(-100000, { members: placed().members.map(m => m.is_me ? { ...m, payment: { ...m.payment, status: 'pending', method: null, reference: null, paid_at: null } } : m) }), pay_share: () => ({ status: 'paid', reference: 'pay_TEST_XYZ', already: false }) } },
    act: async page => { await page.getByRole('button', { name: 'Pay my share' }).click(); await page.getByTestId('demo-note').waitFor(); } },
  { name: 'pay-success', hash: '/g/g-1/pay', signedIn: true, expect: 'Payment successful', state: { rpc: { get_group: () => pendingMe(), pay_share: () => ({ status: 'paid', reference: 'pay_TEST_XYZ', already: false }) } },
    act: async page => { await page.getByRole('button', { name: 'Pay my share' }).click(); await page.getByRole('tab', { name: 'Paid the host in cash' }).click(); await page.getByRole('button', { name: 'Simulate success' }).click(); await page.getByText('Payment successful').waitFor(); },
    verify: st => st.calls.some(c => /^rpc pay_share .*"p_method":"cash"/.test(c)) ? null : 'pay_share was not called with cash' },
  { name: 'checkout-place', hash: '/g/g-1/checkout', signedIn: true, expect: 'Order placed!', state: { n: 0, rpc: { get_group: (b, st) => (st.placedNow ? placed() : makeGroup()), place_group: (b, st) => { st.placedNow = true; return null; } } },
    act: async page => { await page.getByLabel('Delivery (₹)').fill('40'); await page.getByLabel('Packaging (₹)').fill('20'); await page.getByLabel('Taxes (₹)').fill('36'); await page.getByRole('button', { name: 'Place order' }).first().click(); await page.getByRole('dialog').getByRole('button', { name: 'Place order' }).click(); await page.getByText('Order placed!').waitFor(); },
    verify: st => st.calls.some(c => /^rpc place_group .*"p_delivery":40.*"p_packaging":20.*"p_taxes":36/.test(c)) ? null : 'place_group not called with 40, 20, 36' },
  { name: 'pay-failed', hash: '/g/g-1/pay', signedIn: true, expect: 'Your share is still Pending', state: { rpc: { get_group: () => placed(-100000, { members: placed().members.map(m => m.is_me ? { ...m, payment: { ...m.payment, status: 'pending', method: null, reference: null, paid_at: null } } : m) }) } },
    act: async page => { await page.getByRole('button', { name: 'Pay my share' }).click(); await page.getByRole('button', { name: 'Simulate failure' }).click(); } },
  { name: 'track-on-the-way', hash: '/g/g-1/track', signedIn: true, expect: 'Your Rapido Captain is on the way.', state: { rpc: { get_group: () => placed(-130000) } } },
  { name: 'track-delivered', hash: '/g/g-1/track', signedIn: true, expect: 'Delivered. Enjoy your meal!', state: { rpc: { get_group: () => placed(-400000), mark_delivered: () => ({ status: 'delivered', delivered_at: iso(0), already: false }) } } },
  { name: 'orders', hash: '/orders', signedIn: true, expect: 'Past orders', state: { history } },
  { name: 'orders-empty', hash: '/orders', signedIn: true, expect: 'No group orders yet', state: { history: [] } },
  { name: 'activity', hash: '/g/g-1/activity', signedIn: true, expect: 'Group activity', state: { audit: [
    { at: iso(-3600000), actor_id: ME.id, table_name: 'group_orders', action: 'insert', changes: {} },
    { at: iso(-3500000), actor_id: 'x', table_name: 'group_members', action: 'insert', changes: {} },
    { at: iso(-3400000), actor_id: 'x', table_name: 'order_items', action: 'insert', changes: { qty: 2, is_shared: false } }] } },
];
