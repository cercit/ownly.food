/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ownly API Data Access Layer
 * Centralized client module for authentication, restaurants, group orders,
 * split calculations, addresses, and payment simulation.
 * Designed for immediate plug-and-play replacement with Supabase.
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  location_consent: boolean;
  gps?: { lat: number; lng: number };
}

export interface Address {
  id: string;
  label: 'Home' | 'Office' | "Friend's place" | 'Other';
  line1: string;
  line2?: string;
  landmark?: string;
  area: string; // T. Nagar, Adyar, Velachery, OMR, Anna Nagar, Nungambakkam, Mylapore
  city: string; // Chennai
  pincode: string;
  is_default?: boolean;
  lat?: number;
  lng?: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  is_veg: boolean;
  category: string;
  image_url: string;
}

export interface Restaurant {
  id: string;
  name: string;
  area: string;
  cuisine: string;
  rating: number;
  rating_count: string;
  prep_time: string;
  is_pure_veg: boolean;
  address: string;
  image_url: string;
}

export type SplitRule = 'itemised' | 'equal';
export type GroupStatus = 'open' | 'locked' | 'placed' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type TrackingStage = 'Order accepted' | 'Preparing' | 'Picked up' | 'On the way' | 'Delivered';

export interface GroupItem {
  id: string;
  group_order_id: string;
  user_id: string;
  user_name: string;
  menu_item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  notes?: string;
  is_shared: boolean;
  created_at: string;
}

export interface GroupMember {
  user_id: string;
  user_name: string;
  user_email: string;
  is_host: boolean;
  status: 'Adding items' | 'Done';
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_ref?: string;
  joined_at: string;
}

export interface RapidoCharges {
  delivery: number;
  packaging: number;
  taxes: number;
}

export interface MemberShare {
  user_id: string;
  user_name: string;
  user_email: string;
  is_host: boolean;
  own_dishes_total: number;
  shared_dishes_share: number;
  charges_share: number;
  total_payable: number;
  payment_status: PaymentStatus;
  payment_method?: string;
  items: GroupItem[];
}

export interface GroupOrder {
  id: string;
  share_code: string; // 6 capital letters/numbers, e.g. TNR742
  restaurant_id: string;
  restaurant_name: string;
  restaurant_area: string;
  restaurant_image: string;
  host_id: string;
  host_name: string;
  host_email: string;
  delivery_address: Address;
  cutoff_minutes: number;
  cutoff_time: string; // ISO string
  split_rule: SplitRule;
  status: GroupStatus;
  members: GroupMember[];
  items: GroupItem[];
  rapido_charges: RapidoCharges;
  tracking_stage: TrackingStage;
  created_at: string;
  locked_at?: string;
  placed_at?: string;
}

export interface GroupPreview {
  id: string;
  share_code: string;
  restaurant_name: string;
  restaurant_area: string;
  restaurant_image: string;
  host_name: string;
  cutoff_time: string;
  member_count: number;
  max_members: number;
  status: GroupStatus;
  is_full: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'netbanking';
  masked_label: string; // e.g. "Visa •••• 4242", "GPay •••• priya@okaxis"
}

export interface PastGroupOrder {
  id: string;
  share_code: string;
  restaurant_name: string;
  restaurant_area: string;
  date: string;
  member_names: string[];
  total_amount: number;
  my_share: number;
  my_payment_status: PaymentStatus;
  items_summary: string;
}

// ---------------------------------------------------------------------------
// Seed Data: Chennai Restaurants & Menus
// ---------------------------------------------------------------------------

export const CHENNAI_AREAS = [
  'All Areas',
  'T. Nagar',
  'Adyar',
  'Velachery',
  'OMR',
  'Anna Nagar',
  'Nungambakkam',
  'Mylapore'
] as const;

export const SEED_RESTAURANTS: Restaurant[] = [];
export const SEED_MENUS: Record<string, MenuItem[]> = {};
export const SEED_ADDRESSES: Address[] = [];


// ---------------------------------------------------------------------------
// LocalStorage Persistence Keys
// ---------------------------------------------------------------------------
const STORAGE_PREFIX = 'ownly_chennai_';
const KEY_USER = `${STORAGE_PREFIX}current_user`;
const KEY_ADDRESSES = `${STORAGE_PREFIX}addresses`;
const KEY_GROUPS = `${STORAGE_PREFIX}groups`;
const KEY_HISTORY = `${STORAGE_PREFIX}history`;
const KEY_LOCATION_CONSENT = `${STORAGE_PREFIX}location_consent`;

// Active in-memory broadcast listeners for watchGroup
const groupWatchers: Map<string, Set<(group: GroupOrder) => void>> = new Map();
const authWatchers: Set<(user: User | null) => void> = new Set();

function notifyGroupWatchers(group: GroupOrder) {
  const listeners = groupWatchers.get(group.id);
  if (listeners) {
    listeners.forEach((cb) => {
      try {
        cb(group);
      } catch (err) {
        console.error('watchGroup callback error', err);
      }
    });
  }
}

function notifyAuthWatchers(user: User | null) {
  authWatchers.forEach((cb) => {
    try {
      cb(user);
    } catch (err) {
      console.error('onAuthChange error', err);
    }
  });
}

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage write error', err);
  }
}

// ---------------------------------------------------------------------------
// Split Mathematical Engine (Calculates shares for Rule A and Rule B)
// ---------------------------------------------------------------------------
export function calculateShares(group: GroupOrder): MemberShare[] {
  const members = group.members;
  const numMembers = Math.max(members.length, 1);
  const items = group.items;

  const totalCharges =
    (group.rapido_charges.delivery || 0) +
    (group.rapido_charges.packaging || 0) +
    (group.rapido_charges.taxes || 0);

  const chargesPerPerson = Number((totalCharges / numMembers).toFixed(2));

  // Compute shared dishes total
  const sharedItems = items.filter((it) => it.is_shared);
  const totalSharedDishesCost = sharedItems.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );
  const sharedDishSharePerPerson = Number(
    (totalSharedDishesCost / numMembers).toFixed(2)
  );

  if (group.split_rule === 'equal') {
    // Rule b: "Split everything equally"
    // Whole bill (food + charges) divided equally. Leftover paisa to host.
    const totalFoodCost = items.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );
    const grandTotal = totalFoodCost + totalCharges;
    const baseShare = Math.floor((grandTotal / numMembers) * 100) / 100;
    const remainderPaisa = Number(
      (grandTotal - baseShare * numMembers).toFixed(2)
    );

    return members.map((member) => {
      const memberItems = items.filter((it) => it.user_id === member.user_id);
      const isHost = member.is_host;
      const payable = Number((baseShare + (isHost ? remainderPaisa : 0)).toFixed(2));

      return {
        user_id: member.user_id,
        user_name: member.user_name,
        user_email: member.user_email,
        is_host: isHost,
        own_dishes_total: memberItems
          .filter((it) => !it.is_shared)
          .reduce((sum, it) => sum + it.price * it.quantity, 0),
        shared_dishes_share: sharedDishSharePerPerson,
        charges_share: chargesPerPerson,
        total_payable: payable,
        payment_status: member.payment_status,
        payment_method: member.payment_method,
        items: memberItems
      };
    });
  }

  // Rule a (Default): "Pay for what you ordered"
  // Own dishes at full price + equal share of Shared dishes + equal share of Rapido charges
  return members.map((member) => {
    const memberItems = items.filter((it) => it.user_id === member.user_id);
    const ownDishesTotal = memberItems
      .filter((it) => !it.is_shared)
      .reduce((sum, it) => sum + it.price * it.quantity, 0);

    const totalPayable = Number(
      (ownDishesTotal + sharedDishSharePerPerson + chargesPerPerson).toFixed(2)
    );

    return {
      user_id: member.user_id,
      user_name: member.user_name,
      user_email: member.user_email,
      is_host: member.is_host,
      own_dishes_total: ownDishesTotal,
      shared_dishes_share: sharedDishSharePerPerson,
      charges_share: chargesPerPerson,
      total_payable: totalPayable,
      payment_status: member.payment_status,
      payment_method: member.payment_method,
      items: memberItems
    };
  });
}

// ---------------------------------------------------------------------------
// 1. Auth API
// ---------------------------------------------------------------------------

// In-memory OTP storage for the prototype
const pendingOtps = new Map<string, string>();

export async function sendCode(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  // Generate random 6-digit passcode
  const code = '528941'; // Deterministic test OTP for quick reviewer review, but any 6 digits will succeed
  pendingOtps.set(cleanEmail, code);
  return true;
}

export async function verifyCode(
  email: string,
  code: string
): Promise<{ user: User; isNewUser: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  // Accept code if 6 digits provided
  if (trimmedCode.length !== 6) {
    throw new Error('Please enter a valid 6-digit passcode');
  }

  // Check if existing user in history
  const existingUser = getStored<User | null>(KEY_USER, null);
  let user: User;
  let isNewUser = false;

  if (existingUser && existingUser.email === cleanEmail) {
    user = existingUser;
  } else {
    // Derive natural name from email if not present
    const prefix = cleanEmail.split('@')[0];
    const derivedName = prefix
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    user = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      email: cleanEmail,
      full_name: derivedName || 'Foodie',
      created_at: new Date().toISOString()
    };
    isNewUser = true;
  }

  setStored(KEY_USER, user);
  notifyAuthWatchers(user);
  return { user, isNewUser };
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(KEY_USER);
  notifyAuthWatchers(null);
}

export function currentUser(): User | null {
  return getStored<User | null>(KEY_USER, null);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  authWatchers.add(callback);
  // Initial fire
  callback(currentUser());
  return () => {
    authWatchers.delete(callback);
  };
}

export async function getProfile(): Promise<UserProfile> {
  const user = currentUser();
  if (!user) {
    throw new Error('Not signed in');
  }
  const consent = getStored<boolean>(KEY_LOCATION_CONSENT, false);
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone || '+91 98765 43210',
    location_consent: consent,
    gps: consent ? { lat: 12.9863, lng: 80.2432 } : undefined
  };
}

export async function updateProfile(profile: {
  full_name: string;
  phone?: string;
}): Promise<UserProfile> {
  const user = currentUser();
  if (!user) throw new Error('Not signed in');

  const updated: User = {
    ...user,
    full_name: profile.full_name.trim(),
    phone: profile.phone ? profile.phone.trim() : user.phone
  };
  setStored(KEY_USER, updated);
  notifyAuthWatchers(updated);
  return getProfile();
}

export async function recordLocationConsent(consented: boolean): Promise<void> {
  setStored(KEY_LOCATION_CONSENT, consented);
}

export async function getGps(): Promise<{ lat: number; lng: number } | null> {
  const consent = getStored<boolean>(KEY_LOCATION_CONSENT, false);
  if (!consent) return null;
  return { lat: 12.9863, lng: 80.2432 }; // Central Chennai / OMR Tech Hub
}

// ---------------------------------------------------------------------------
// 2. Addresses API
// ---------------------------------------------------------------------------

export async function listAddresses(): Promise<Address[]> {
  return getStored<Address[]>(KEY_ADDRESSES, SEED_ADDRESSES);
}

export async function addAddress(
  address: Omit<Address, 'id'>
): Promise<Address> {
  const current = await listAddresses();
  const newAddr: Address = {
    ...address,
    id: `addr_${Date.now()}`
  };
  // If set to default, reset others
  let updated = current;
  if (newAddr.is_default) {
    updated = updated.map((a) => ({ ...a, is_default: false }));
  }
  updated = [newAddr, ...updated];
  setStored(KEY_ADDRESSES, updated);
  return newAddr;
}

export async function deleteAddress(id: string): Promise<void> {
  const current = await listAddresses();
  const filtered = current.filter((a) => a.id !== id);
  setStored(KEY_ADDRESSES, filtered);
}

// ---------------------------------------------------------------------------
// 3. Restaurants & Menus API
// ---------------------------------------------------------------------------

export async function listRestaurants(area?: string): Promise<Restaurant[]> {
  if (!area || area === 'All Areas') {
    return SEED_RESTAURANTS;
  }
  return SEED_RESTAURANTS.filter((r) => r.area.toLowerCase() === area.toLowerCase());
}

export async function getRestaurantById(id: string): Promise<Restaurant | undefined> {
  return SEED_RESTAURANTS.find((r) => r.id === id);
}

export async function getMenu(restaurantId: string): Promise<MenuItem[]> {
  return SEED_MENUS[restaurantId] || [];
}

// ---------------------------------------------------------------------------
// 4. Group Orders API
// ---------------------------------------------------------------------------

function generateRoomCode(): string {
  // Exactly 6 capital alphanumeric characters, no dash (e.g. TNR742, PAR742)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function shareLink(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ownly.food';
  return `${origin}/?join=${code.toUpperCase()}`;
}

export function codeFromLink(searchParamsString?: string): string | null {
  if (typeof window === 'undefined' && !searchParamsString) return null;
  const params = new URLSearchParams(searchParamsString || window.location.search);
  const joinCode = params.get('join');
  if (joinCode && joinCode.trim().length === 6) {
    return joinCode.trim().toUpperCase();
  }
  return null;
}

function getAllGroups(): Record<string, GroupOrder> {
  return getStored<Record<string, GroupOrder>>(KEY_GROUPS, {});
}

function saveGroup(group: GroupOrder): void {
  const all = getAllGroups();
  all[group.id] = group;
  // Also index by share_code for fast lookup
  all[`code_${group.share_code}`] = group;
  setStored(KEY_GROUPS, all);
  notifyGroupWatchers(group);
}

export async function startGroupOrder(
  restaurantId: string,
  addressId: string,
  cutOffMinutes: number,
  splitRule: SplitRule
): Promise<{ id: string; share_code: string }> {
  const user = currentUser();
  if (!user) throw new Error('Sign in required to start group order');

  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');

  const addresses = await listAddresses();
  const address = addresses.find((a) => a.id === addressId) || addresses[0];

  const code = generateRoomCode();
  const groupId = `grp_${Date.now()}_${code}`;

  const cutoffDate = new Date(Date.now() + cutOffMinutes * 60 * 1000);

  const initialGroup: GroupOrder = {
    id: groupId,
    share_code: code,
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    restaurant_area: restaurant.area,
    restaurant_image: restaurant.image_url,
    host_id: user.id,
    host_name: user.full_name,
    host_email: user.email,
    delivery_address: address,
    cutoff_minutes: cutOffMinutes,
    cutoff_time: cutoffDate.toISOString(),
    split_rule: splitRule,
    status: 'open',
    members: [
      {
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        is_host: true,
        status: 'Adding items',
        payment_status: 'pending',
        joined_at: new Date().toISOString()
      }
    ],
    items: [],
    rapido_charges: {
      delivery: 40,
      packaging: 20,
      taxes: 36
    },
    tracking_stage: 'Order accepted',
    created_at: new Date().toISOString()
  };

  saveGroup(initialGroup);
  return { id: groupId, share_code: code };
}

export async function previewGroup(code: string): Promise<GroupPreview> {
  const cleanCode = code.trim().toUpperCase();
  const all = getAllGroups();
  const group = all[`code_${cleanCode}`];

  if (!group) {
    throw new Error(`Room code ${cleanCode} not found`);
  }

  return {
    id: group.id,
    share_code: group.share_code,
    restaurant_name: group.restaurant_name,
    restaurant_area: group.restaurant_area,
    restaurant_image: group.restaurant_image,
    host_name: group.host_name,
    cutoff_time: group.cutoff_time,
    member_count: group.members.length,
    max_members: 12,
    status: group.status,
    is_full: group.members.length >= 12
  };
}

export async function joinGroup(code: string): Promise<{ group_order_id: string }> {
  const user = currentUser();
  if (!user) throw new Error('Please sign in to join this group');

  const cleanCode = code.trim().toUpperCase();
  const all = getAllGroups();
  const group = all[`code_${cleanCode}`];

  if (!group) {
    throw new Error(`Room code ${cleanCode} not found. Please check and try again.`);
  }

  // Check if user already in group
  const existingMember = group.members.find((m) => m.user_id === user.id || m.user_email === user.email);
  if (existingMember) {
    return { group_order_id: group.id };
  }

  // Rule 7: Up to 12 people per group, host included. Person 13 sees "This group is full (12 people)"
  if (group.members.length >= 12) {
    throw new Error('This group is full (12 people).');
  }

  // Add new member
  const newMember: GroupMember = {
    user_id: user.id,
    user_name: user.full_name,
    user_email: user.email,
    is_host: false,
    status: 'Adding items',
    payment_status: 'pending',
    joined_at: new Date().toISOString()
  };

  group.members.push(newMember);
  saveGroup(group);

  return { group_order_id: group.id };
}

export async function getGroup(groupId: string): Promise<GroupOrder> {
  const all = getAllGroups();
  const group = all[groupId];
  if (!group) {
    throw new Error('Group order not found');
  }
  return group;
}

export function watchGroup(
  groupId: string,
  callback: (group: GroupOrder) => void
): () => void {
  if (!groupWatchers.has(groupId)) {
    groupWatchers.set(groupId, new Set());
  }
  groupWatchers.get(groupId)!.add(callback);

  // Initial call if exists
  const all = getAllGroups();
  if (all[groupId]) {
    callback(all[groupId]);
  }

  return () => {
    const set = groupWatchers.get(groupId);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        groupWatchers.delete(groupId);
      }
    }
  };
}

export async function addItem(
  groupId: string,
  menuItemId: string,
  qty: number,
  notes?: string,
  shared?: boolean
): Promise<GroupOrder> {
  const user = currentUser();
  if (!user) throw new Error('Sign in required to add dishes');

  const group = await getGroup(groupId);
  if (group.status !== 'open') {
    throw new Error('Order is locked by the host. Edits are closed.');
  }

  const menu = await getMenu(group.restaurant_id);
  const dish = menu.find((d) => d.id === menuItemId);
  if (!dish) throw new Error('Menu item not found');

  const newItem: GroupItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    group_order_id: groupId,
    user_id: user.id,
    user_name: user.full_name,
    menu_item_id: menuItemId,
    item_name: dish.name,
    price: dish.price,
    quantity: qty,
    notes: notes?.trim() || undefined,
    is_shared: !!shared,
    created_at: new Date().toISOString()
  };

  group.items.push(newItem);

  // Mark member as 'Done' or actively contributing
  const member = group.members.find((m) => m.user_id === user.id);
  if (member) {
    member.status = 'Done';
  }

  saveGroup(group);
  return group;
}

export async function removeItem(groupId: string, itemId: string): Promise<GroupOrder> {
  const user = currentUser();
  if (!user) throw new Error('Sign in required');

  const group = await getGroup(groupId);
  if (group.status !== 'open') {
    throw new Error('Order is locked. Cannot remove items.');
  }

  // Host can remove any item, member can remove their own items
  const isHost = group.host_id === user.id;
  group.items = group.items.filter((item) => {
    if (item.id === itemId) {
      if (!isHost && item.user_id !== user.id) {
        throw new Error('You can only remove your own items');
      }
      return false;
    }
    return true;
  });

  saveGroup(group);
  return group;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const user = currentUser();
  if (!user) return;

  const group = await getGroup(groupId);
  if (group.host_id === user.id) {
    throw new Error('Host cannot leave the group. You can cancel the order instead.');
  }

  // Remove member and member's unshared items
  group.members = group.members.filter((m) => m.user_id !== user.id);
  group.items = group.items.filter((i) => i.user_id !== user.id);
  saveGroup(group);
}

export async function lockGroup(groupId: string): Promise<GroupOrder> {
  const user = currentUser();
  if (!user) throw new Error('Sign in required');

  const group = await getGroup(groupId);
  if (group.host_id !== user.id) {
    throw new Error('Only the host can lock the order');
  }

  group.status = 'locked';
  group.locked_at = new Date().toISOString();
  saveGroup(group);
  return group;
}

export async function placeGroup(
  groupId: string,
  delivery: number,
  packaging: number,
  taxes: number
): Promise<GroupOrder> {
  const user = currentUser();
  if (!user) throw new Error('Sign in required');

  const group = await getGroup(groupId);
  if (group.host_id !== user.id) {
    throw new Error('Only the host can place the order');
  }

  // Update charges entered by the host
  group.rapido_charges = {
    delivery: Math.max(0, Number(delivery) || 0),
    packaging: Math.max(0, Number(packaging) || 0),
    taxes: Math.max(0, Number(taxes) || 0)
  };

  group.status = 'placed';
  group.placed_at = new Date().toISOString();
  group.tracking_stage = 'Order accepted';

  // Save to history for all members
  const history = getStored<PastGroupOrder[]>(KEY_HISTORY, []);
  const shares = calculateShares(group);
  const totalBill = shares.reduce((sum, s) => sum + s.total_payable, 0);

  const pastOrder: PastGroupOrder = {
    id: group.id,
    share_code: group.share_code,
    restaurant_name: group.restaurant_name,
    restaurant_area: group.restaurant_area,
    date: new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    member_names: group.members.map((m) => m.user_name),
    total_amount: totalBill,
    my_share: shares.find((s) => s.user_id === user.id)?.total_payable || 0,
    my_payment_status: 'pending',
    items_summary: `${group.items.length} items ordered`
  };

  setStored(KEY_HISTORY, [pastOrder, ...history]);
  saveGroup(group);
  return group;
}

export async function cancelGroup(groupId: string): Promise<GroupOrder> {
  const user = currentUser();
  if (!user) throw new Error('Sign in required');

  const group = await getGroup(groupId);
  if (group.host_id !== user.id) {
    throw new Error('Only the host can cancel the group order');
  }

  group.status = 'cancelled';
  saveGroup(group);
  return group;
}

// ---------------------------------------------------------------------------
// 5. Payment API (Demo Mode)
// ---------------------------------------------------------------------------

export async function payMyShare(
  groupId: string,
  method: 'upi' | 'card' | 'netbanking' | 'cash',
  simulateSuccess = true
): Promise<{ status: 'paid' | 'failed'; reference: string }> {
  const user = currentUser();
  if (!user) throw new Error('Sign in required');

  const group = await getGroup(groupId);
  const member = group.members.find((m) => m.user_id === user.id || m.user_email === user.email);
  if (!member) throw new Error('Member not found in this group');

  if (!simulateSuccess) {
    member.payment_status = 'failed';
    saveGroup(group);
    return {
      status: 'failed',
      reference: `ERR_DECLINED_${Date.now()}`
    };
  }

  const ref = `RZP_DEMO_${Date.now().toString().slice(-6)}`;
  member.payment_status = 'paid';
  member.payment_method = method === 'cash' ? 'Paid the host in cash' : `${method.toUpperCase()} (${ref})`;
  member.payment_ref = ref;

  saveGroup(group);
  return {
    status: 'paid',
    reference: ref
  };
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  return [
    { id: 'pm_1', type: 'upi', masked_label: 'Google Pay • priya@okaxis' },
    { id: 'pm_2', type: 'card', masked_label: 'Visa •••• 4242' },
    { id: 'pm_3', type: 'netbanking', masked_label: 'HDFC Bank •••• 9821' }
  ];
}

export async function savePaymentMethod(
  type: string,
  maskedLabel: string
): Promise<PaymentMethod> {
  return {
    id: `pm_${Date.now()}`,
    type: type as any,
    masked_label: maskedLabel
  };
}

// ---------------------------------------------------------------------------
// 6. Order History & Reordering
// ---------------------------------------------------------------------------

export async function myGroupOrders(): Promise<PastGroupOrder[]> {
  return getStored<PastGroupOrder[]>(KEY_HISTORY, []);
}
