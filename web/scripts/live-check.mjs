// Live read-only checks against Supabase with the public anon key. No login, no writes.
// Run: npm run live   (needs network access to the Supabase host)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = readFileSync(path.join(here, '..', '.env.example'), 'utf8');
const get = k => env.match(new RegExp(`^${k}=(.*)$`, 'm'))[1].trim();
const URL_ = get('VITE_SUPABASE_URL'), KEY = get('VITE_SUPABASE_ANON_KEY');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
let fail = 0;
const ok = (c, m) => { if (!c) fail++; console.log(c ? '  ok  ' : '  FAIL', m); };

let rs;
try { rs = await (await fetch(`${URL_}/rest/v1/restaurants?select=id,name,city,image_url&active=eq.true`, { headers: H })).json(); }
catch (e) { console.log(`BLOCKED: cannot reach ${URL_} (${e.cause?.code ?? e.message}). Allow the host in the network settings and run again.`); process.exit(2); }
ok(Array.isArray(rs) && rs.length === 15, `15 restaurants visible logged out (got ${rs.length ?? rs.message})`);
ok(rs.every(r => r.city === 'Chennai'), 'all in Chennai');
ok(rs.every(r => r.image_url), 'all have photos');
let dishes = 0, noPhoto = 0;
for (const r of rs) {
  const m = await (await fetch(`${URL_}/rest/v1/menu_items?select=id,image_url&restaurant_id=eq.${r.id}`, { headers: H })).json();
  dishes += m.length; noPhoto += m.filter(x => !x.image_url).length;
}
ok(dishes === 150, `150 dishes visible logged out (got ${dishes})`);
console.log(`  info ${noPhoto} dishes without a photo`);

for (const [fn, body] of [['get_group', { p_code: 'AAAAAA' }], ['join_group', { p_code: 'AAAAAA' }], ['my_group_orders', {}]]) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  ok(res.status === 401 || res.status === 403 || /permission denied/i.test(j.message ?? ''), `${fn} logged out -> ${res.status} ${j.message ?? ''}`);
}
const w = await fetch(`${URL_}/rest/v1/group_orders`, { method: 'POST', headers: H, body: '{}' });
ok(w.status >= 400, `direct insert into group_orders refused (${w.status})`);
console.log(fail ? `\nLive check FAILED: ${fail}` : '\nLive check passed');
process.exit(fail ? 1 : 0);
