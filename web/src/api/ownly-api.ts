// Ownly Together: every Supabase call the app makes, typed. Same names as app/ownly-api.js.
// Every call returns data or throws an Error whose message is ready to show the user.
import { createClient, type User } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/config.ts';
import { buildShareLink, readJoinParam } from '../lib/room.ts';
import type {
  ActivityRow, Address, AddressLabel, GroupView, HistoryRow, JoinedGroup, MenuItem, PayMethod,
  PaymentMethodRow, Profile, Restaurant, SplitRule, StartedGroup,
} from '../lib/types.ts';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function plainError(message: string): string {
  if (/permission denied/i.test(message)) return 'Please sign in first.';
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Cannot reach the server. Check your internet and try again.';
  if (/rate limit|after \d+ seconds|too many/i.test(message)) return 'Too many tries. Please wait a minute and try again.';
  if (/otp.*(expired|invalid)|token has expired or is invalid/i.test(message)) return 'That code is wrong or has expired. Check the latest email, or ask for a new code.';
  return message;
}

const run = async <T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> => {
  const { data, error } = await p;
  if (error) throw new Error(plainError(error.message));
  return data;
};
const rpc = <T>(fn: string, args: Record<string, unknown> = {}) => run<T>(supabase.rpc(fn, args) as never);

// ---------- sign-in: email + 6-digit code ----------
export const sendCode = (email: string) =>
  run(supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } }) as never);
export const verifyCode = (email: string, code: string) =>
  run(supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' }) as never);
export const signOut = async () => { await run(supabase.auth.signOut() as never); };
export const currentUser = async (): Promise<User | null> => (await supabase.auth.getUser()).data.user;
export const onAuthChange = (cb: (u: User | null) => void) => {
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null));
  return () => data.subscription.unsubscribe();
};

// ---------- profile and addresses ----------
export const getProfile = async (): Promise<Profile | null> =>
  ((await run<Profile[]>(supabase.from('profiles').select('*').limit(1) as never))[0]) ?? null;

export const updateProfile = async (p: { full_name: string; phone?: string | null }): Promise<Profile> => {
  const me = await getProfile();
  if (!me) throw new Error('Please sign in first.');
  return run<Profile>(supabase.from('profiles').update({ full_name: p.full_name.trim(), phone: p.phone?.trim() || null }).eq('id', me.id).select().single() as never);
};

export const recordLocationConsent = async () => {
  const me = await getProfile();
  if (!me) throw new Error('Please sign in first.');
  await run(supabase.from('profiles').update({ consent_location_at: new Date().toISOString() }).eq('id', me.id) as never);
};

export interface Gps { lat: number; lng: number; accuracy: number }
/** Asks the browser for GPS. Call only after the person agreed. */
export const getGps = (): Promise<Gps> => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('This browser cannot share location. Enter the address by hand.'));
  navigator.geolocation.getCurrentPosition(
    p => resolve({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), accuracy: Math.round(p.coords.accuracy) }),
    () => reject(new Error('Location was not shared. You can still type the address.')),
    { enableHighAccuracy: true, timeout: 10000 });
});

export const listAddresses = () =>
  run<Address[]>(supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at') as never);

export interface NewAddress {
  label: AddressLabel; label_name?: string | null; line1: string; line2?: string | null; landmark?: string | null;
  area: string; city: string; pincode: string; gps?: Gps | null; is_default?: boolean;
}
export const addAddress = async (a: NewAddress): Promise<Address> => {
  const me = await getProfile();
  if (!me) throw new Error('Please sign in first.');
  if (a.is_default) await run(supabase.from('addresses').update({ is_default: false }).eq('user_id', me.id).eq('is_default', true) as never);
  return run<Address>(supabase.from('addresses').insert({
    user_id: me.id, label: a.label, label_name: a.label_name ?? null, line1: a.line1, line2: a.line2 ?? null,
    landmark: a.landmark ?? null, area: a.area, city: a.city, pincode: a.pincode,
    lat: a.gps?.lat ?? null, lng: a.gps?.lng ?? null, gps_accuracy_m: a.gps?.accuracy ?? null,
    source: a.gps ? 'gps' : 'manual', is_default: !!a.is_default,
  }).select().single() as never);
};
export const deleteAddress = async (id: string) => { await run(supabase.from('addresses').delete().eq('id', id) as never); };

export const setDefaultAddress = async (id: string) => {
  const me = await getProfile();
  if (!me) throw new Error('Please sign in first.');
  await run(supabase.from('addresses').update({ is_default: false }).eq('user_id', me.id).eq('is_default', true) as never);
  await run(supabase.from('addresses').update({ is_default: true }).eq('id', id) as never);
  await run(supabase.from('profiles').update({ default_address_id: id }).eq('id', me.id) as never);
};

// ---------- restaurants and menus (work without login) ----------
export const listRestaurants = (city: string | null = 'Chennai') => {
  let q = supabase.from('restaurants').select('*').eq('active', true).order('name');
  if (city) q = q.eq('city', city);
  return run<Restaurant[]>(q as never);
};
export const getMenu = (restaurantId: string) =>
  run<MenuItem[]>(supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('category').order('price') as never);

// ---------- start, share, join ----------
export const startGroupOrder = (restaurantId: string, addressId: string, cutOff: Date | string, splitRule: SplitRule = 'itemised') =>
  rpc<StartedGroup>('create_group_order', { p_restaurant: restaurantId, p_address: addressId, p_cut_off: new Date(cutOff).toISOString(), p_split: splitRule });
export const shareLink = (code: string) => buildShareLink(code, location.origin, location.pathname);
export const codeFromLink = () => readJoinParam(location.search);
export const previewGroup = (code: string) => rpc<GroupView>('get_group', { p_code: code });
export const joinGroup = (code: string) => rpc<JoinedGroup>('join_group', { p_code: code });

// ---------- shared cart ----------
export const getGroup = (groupId: string) => rpc<GroupView>('get_group', { p_group: groupId });
export const addItem = (groupId: string, menuItemId: string, qty = 1, notes: string | null = null, shared = false) =>
  rpc<string>('add_item', { p_group: groupId, p_menu_item: menuItemId, p_qty: qty, p_notes: notes, p_shared: shared });
export const removeItem = (itemId: string) => rpc<null>('remove_item', { p_item: itemId });
export const leaveGroup = (groupId: string) => rpc<null>('leave_group', { p_group: groupId });

/** Refreshes the group every few seconds while a screen is open. Returns stop(). */
export const watchGroup = (groupId: string, cb: (g: GroupView | null, err?: Error) => void, everyMs = 5000) => {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = async () => {
    if (stopped) return;
    try { cb(await getGroup(groupId)); } catch (e) { cb(null, e as Error); }
    if (!stopped) timer = setTimeout(tick, everyMs);
  };
  tick();
  return () => { stopped = true; if (timer) clearTimeout(timer); };
};

// ---------- host: lock, place, cancel ----------
export const lockGroup = (groupId: string) => rpc<null>('lock_group', { p_group: groupId });
export const placeGroup = (groupId: string, delivery: number, packaging = 0, taxes = 0) =>
  rpc<null>('place_group', { p_group: groupId, p_delivery: delivery, p_packaging: packaging, p_taxes: taxes });
export const cancelGroup = (groupId: string) => rpc<null>('cancel_group', { p_group: groupId });

// ---------- pay my share (demo) ----------
export interface PayResult { status: 'paid'; reference: string; already: boolean }
export const payMyShare = (groupId: string, method: PayMethod) => rpc<PayResult>('pay_share', { p_group: groupId, p_method: method });
export const listPaymentMethods = () =>
  run<PaymentMethodRow[]>(supabase.from('payment_methods').select('*').order('is_default', { ascending: false }) as never);
/** Saves a masked label only, such as "Visa •••• 4242". */
export const savePaymentMethod = async (type: PayMethod, display_label: string, is_default = false) => {
  const me = await getProfile();
  if (!me) throw new Error('Please sign in first.');
  return run<PaymentMethodRow>(supabase.from('payment_methods').insert({ user_id: me.id, type, display_label, is_default }).select().single() as never);
};
export const deletePaymentMethod = async (id: string) => { await run(supabase.from('payment_methods').delete().eq('id', id) as never); };

// ---------- tracking, history, activity ----------
export const markDelivered = (groupId: string) => rpc<{ status: 'delivered'; delivered_at: string; already: boolean }>('mark_delivered', { p_group: groupId });
export const myGroupOrders = () => rpc<HistoryRow[]>('my_group_orders');
export const groupActivity = (groupId: string) =>
  run<ActivityRow[]>(supabase.from('audit_log').select('at, actor_id, table_name, action, changes').eq('group_order_id', groupId).order('at') as never);

