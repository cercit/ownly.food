export type SplitRule = 'itemised' | 'equal';
export type GroupStatus = 'open' | 'locked' | 'placed' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PayMethod = 'upi' | 'card' | 'netbanking' | 'cash';
export type AddressLabel = 'home' | 'office' | 'friend' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  default_address_id: string | null;
  consent_location_at: string | null;
}

export interface Address {
  id: string;
  label: AddressLabel;
  label_name: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  area: string;
  city: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  source: 'gps' | 'manual';
  is_default: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  area: string;
  city: string;
  veg_only: boolean;
  opens_at: string | null;
  closes_at: string | null;
  active: boolean;
  image_url: string | null;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  price: number;
  is_veg: boolean;
  is_available: boolean;
  image_url: string | null;
}

export interface PaymentMethodRow {
  id: string;
  type: PayMethod;
  display_label: string;
  is_default: boolean;
}

/** Result of create_group_order. */
export interface StartedGroup { id: string; share_code: string; split_rule: SplitRule; existing: boolean }
/** Result of join_group. */
export interface JoinedGroup { group_order_id: string; member_id: string; already: boolean }

/** get_group for someone who is not (yet) in the group. */
export interface GroupPreview {
  id: string;
  share_code: string;
  status: GroupStatus;
  cut_off_at: string;
  restaurant: string;
  area: string;
  image_url: string | null;
  host: string;
  split_rule: SplitRule;
  members: number;
  is_member: false;
}

export interface GroupItem {
  id: string;
  dish: string;
  qty: number;
  unit_price: number;
  notes: string | null;
  is_veg: boolean;
  is_shared: boolean;
  image_url: string | null;
}

/** What the database worked out for one person. Shown as returned, never recalculated. */
export interface SharePayment {
  food: number;
  shared_share: number;
  charges_share: number;
  tax_share: number;
  total: number;
  status: PaymentStatus;
  method: PayMethod | null;
  reference: string | null;
  paid_at: string | null;
}

export interface GroupMember {
  member_id: string;
  name: string | null;
  role: 'host' | 'member';
  is_me: boolean;
  /** Tapped "Done" (finished adding). Adding or removing a dish resets it. */
  done: boolean;
  items: GroupItem[];
  payment: SharePayment | null;
}

/** get_group for a member. */
export interface Group {
  id: string;
  share_code: string;
  status: GroupStatus;
  cut_off_at: string;
  split_rule: SplitRule;
  delivery_fee: number | null;
  packaging_fee: number | null;
  taxes: number | null;
  max_members: number;
  food_total: number;
  is_member: true;
  is_host: boolean;
  placed_at: string | null;
  delivered_at: string | null;
  /** Worked out by the database: live while open or locked, fixed once placed. The host can't edit them. */
  charges: Charges;
  restaurant: { id: string; name: string; cuisine: string; area: string; image_url: string | null; lat: number | null; lng: number | null };
  /** lat/lng is the middle of the delivery area, never the exact address. */
  deliver_to: { label: AddressLabel; label_name: string | null; area: string; city: string; lat: number | null; lng: number | null } | null;
  members: GroupMember[];
}

export interface Charges {
  delivery: number;
  packaging: number;
  taxes: number;
  total: number;
  distance_km: number;
  /** Present while the order is still open or locked. */
  pinned?: boolean;
  dishes?: number;
  per_km?: number;
  packaging_per_item?: number;
  gst_rate?: number;
}

export type GroupView = Group | GroupPreview;

export interface HistoryRow {
  id: string;
  share_code: string;
  status: GroupStatus;
  restaurant: string;
  created_at: string;
  placed_at: string | null;
  role: 'host' | 'member';
  members: number;
  my_total: number | null;
  my_payment_status: PaymentStatus | null;
}

export interface ActivityRow {
  at: string;
  /** Name of the person who made the change ("Ownly" for system actions). */
  who: string;
  is_me: boolean;
  table_name: string;
  action: 'insert' | 'update' | 'delete';
  changes: Record<string, unknown> | null;
}
