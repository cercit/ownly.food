// Ownly Together: every Supabase call the app needs. Paste into AI Studio as ownly-api.js and import from it.
// The anon key is the public browser key (safe to ship). Never put the service_role key in the app.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://brliajwgrhsnbgxaucsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJybGlhandncmhzbmJneGF1Y3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzA5NTAsImV4cCI6MjEwODM0Njk1MH0.LsVUzMeXM7k4OYd2hEhrEhkv1l2q26wko0BAprSW4S8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Every call returns data or throws an Error whose message is ready to show the user
// (for example "This group is full (12 people)").
const run = async p => { const { data, error } = await p; if (error) throw new Error(error.message); return data; };
const rpc = (fn, args = {}) => run(supabase.rpc(fn, args));

// ---------- Screen 1: email OTP sign-up / sign-in ----------
export const sendCode = email => run(supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }));
export const verifyCode = (email, code) => run(supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' }));
export const signOut = () => run(supabase.auth.signOut());
export const currentUser = async () => (await supabase.auth.getUser()).data.user;   // null when logged out
export const onAuthChange = cb => supabase.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));

// ---------- Screen 2: profile and addresses ----------
export const getProfile = async () => (await run(supabase.from('profiles').select('*').limit(1)))[0] ?? null;
export const updateProfile = async ({ full_name, phone }) => {
  const me = await getProfile();
  return run(supabase.from('profiles').update({ full_name, phone }).eq('id', me.id).select().single());
};
export const recordLocationConsent = async () => {
  const me = await getProfile();
  return run(supabase.from('profiles').update({ consent_location_at: new Date().toISOString() }).eq('id', me.id));
};

// Ask the phone/browser for GPS. Resolves { lat, lng, accuracy } or throws if the user says no.
export const getGps = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('This browser cannot share location. Enter the address by hand.'));
  navigator.geolocation.getCurrentPosition(
    p => resolve({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), accuracy: Math.round(p.coords.accuracy) }),
    () => reject(new Error('Location was not shared. You can still type the address.')),
    { enableHighAccuracy: true, timeout: 10000 });
});

export const listAddresses = () => run(supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at'));

// label: 'home' | 'office' | 'friend' | 'other'; label_name e.g. "Rahul's flat"; pincode: 6 digits
export const addAddress = async ({ label, label_name, line1, line2 = null, landmark = null, area, city, pincode, gps = null, is_default = false }) => {
  const me = await getProfile();
  if (is_default) await run(supabase.from('addresses').update({ is_default: false }).eq('user_id', me.id).eq('is_default', true));
  return run(supabase.from('addresses').insert({
    user_id: me.id, label, label_name, line1, line2, landmark, area, city, pincode,
    lat: gps?.lat ?? null, lng: gps?.lng ?? null, gps_accuracy_m: gps?.accuracy ?? null,
    source: gps ? 'gps' : 'manual', is_default
  }).select().single());
};
export const deleteAddress = id => run(supabase.from('addresses').delete().eq('id', id));

// ---------- Screen 3: restaurants and menus (work without login) ----------
export const listRestaurants = (city = null) => {
  let q = supabase.from('restaurants').select('*').eq('active', true).order('name');
  if (city) q = q.eq('city', city);
  return run(q);
};
export const getMenu = restaurantId => run(supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('category').order('price'));

// ---------- Screen 4: start a group order (host) ----------
// cutOff: a Date or ISO string in the future. splitRule: 'itemised' (pay for what you ordered) or 'equal'.
// Returns { id, share_code, split_rule, existing }.
export const startGroupOrder = (restaurantId, addressId, cutOff, splitRule = 'itemised') =>
  rpc('create_group_order', { p_restaurant: restaurantId, p_address: addressId, p_cut_off: new Date(cutOff).toISOString(), p_split: splitRule });
export const shareLink = code => `${location.origin}${location.pathname}?join=${code}`;

// ---------- Screen 5: join via code or link ----------
export const codeFromLink = () => new URLSearchParams(location.search).get('join');
export const previewGroup = code => rpc('get_group', { p_code: code });   // non-members get a short preview
export const joinGroup = code => rpc('join_group', { p_code: code });     // returns { group_order_id, member_id, already }

// ---------- Screen 6: shared cart ----------
export const getGroup = groupId => rpc('get_group', { p_group: groupId });
// shared = true: the dish is split across everyone in the group
export const addItem = (groupId, menuItemId, qty = 1, notes = null, shared = false) =>
  rpc('add_item', { p_group: groupId, p_menu_item: menuItemId, p_qty: qty, p_notes: notes, p_shared: shared });
export const removeItem = itemId => rpc('remove_item', { p_item: itemId });
export const leaveGroup = groupId => rpc('leave_group', { p_group: groupId });

// Refresh the cart every few seconds while the screen is open. Returns a stop() function.
export const watchGroup = (groupId, cb, everyMs = 5000) => {
  let stopped = false;
  const tick = async () => { if (stopped) return; try { cb(await getGroup(groupId)); } catch (e) { cb(null, e); } if (!stopped) setTimeout(tick, everyMs); };
  tick();
  return () => { stopped = true; };
};

// ---------- Screen 7: host locks and places ----------
export const lockGroup = groupId => rpc('lock_group', { p_group: groupId });
// delivery, packaging, taxes: Rapido's charges for this one order, typed by the host
export const placeGroup = (groupId, delivery, packaging = 0, taxes = 0) =>
  rpc('place_group', { p_group: groupId, p_delivery: delivery, p_packaging: packaging, p_taxes: taxes });
export const cancelGroup = groupId => rpc('cancel_group', { p_group: groupId });

// ---------- Screen 8: my share and pay (DEMO payments, no real money) ----------
// method: 'upi' | 'card' | 'netbanking' | 'cash'. Returns { status, reference, already }.
export const payMyShare = (groupId, method) => rpc('pay_share', { p_group: groupId, p_method: method });
export const listPaymentMethods = () => run(supabase.from('payment_methods').select('*').order('is_default', { ascending: false }));
// Save only a masked label such as "sam•••@okaxis" or "Visa •••• 4242". Full card numbers are rejected.
export const savePaymentMethod = async (type, display_label, is_default = false) => {
  const me = await getProfile();
  return run(supabase.from('payment_methods').insert({ user_id: me.id, type, display_label, is_default }).select().single());
};

// ---------- Screen 8b: live tracking ----------
// Stages run on a timer counted from getGroup(...).placed_at, so every phone shows the same stage.
// When the timer reaches "Delivered", call this once (safe to call again).
export const markDelivered = groupId => rpc('mark_delivered', { p_group: groupId });

// ---------- Screen 9: history ----------
export const myGroupOrders = () => rpc('my_group_orders');
// Everything that happened in a group order, oldest first (audit log; members only)
export const groupActivity = groupId =>
  run(supabase.from('audit_log').select('at, actor_id, table_name, action, changes').eq('group_order_id', groupId).order('at'));

// ---------- helpers for the UI ----------
export const rupees = n => '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const DEMO_NOTICE = 'Demo payment: no real money moves. Ownly Together is a concept prototype by Sameer Mittimani, not an official Rapido product.';
