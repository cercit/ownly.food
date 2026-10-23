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
];
