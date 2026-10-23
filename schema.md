# Ownly Together: schema (agreed 23 Oct 2026)

Supabase / Postgres. The same tables work in Airtable for the Softr course version. Login is Supabase Auth email OTP, so there's no custom OTP table.

| # | Table | Key columns |
|---|---|---|
| 1 | profiles | id (= auth.users.id), full_name, email, phone?, default_address_id → addresses, consent_location_at, created_at |
| 2 | addresses | id, user_id → profiles, label (home / office / friend / other), label_name, line1, line2, landmark, area, city, pincode, lat, lng (numeric 9,6), gps_accuracy_m, source (gps / manual), is_default |
| 3 | restaurants | id, name, cuisine, area, city, lat, lng, veg_only, opens_at, closes_at, active |
| 4 | menu_items | id, restaurant_id → restaurants, name, category, price, is_veg, is_available |
| 5 | group_orders | id, share_code (unique, 6 characters), host_id → profiles, restaurant_id, delivery_address_id → addresses, cut_off_at, status (open / locked / placed / delivered / cancelled), delivery_fee, packaging_fee, taxes, max_members (12), placed_at, delivered_at |
| 6 | group_members | id, group_order_id, user_id, role (host / member), status (joined / left), joined_at; unique (group_order_id, user_id) |
| 7 | order_items | id, group_order_id, member_id → group_members, menu_item_id, qty, unit_price (copied at the time of ordering), notes, is_shared (split across everyone) |
| 8 | payment_methods | id, user_id, type (upi / card / netbanking / cash), display_label (masked), gateway_token, is_default. Card numbers, CVVs and UPI PINs are never stored |
| 9 | payments | id, group_order_id, member_id, food_amount (own dishes), shared_share, delivery_share (Rapido charges ÷ people), total, payee (host / restaurant), method_type, status (pending / paid / failed / refunded), gateway_payment_id, paid_at; unique (group_order_id, member_id) |

**Row-level security:**
- profiles, addresses and payment_methods: owner only.
- group_orders, group_members, order_items and payments: readable by members of that group. Writes are limited to your own items and your own payment; the host can lock and place.
- A delivery address is visible to group members only as its label and area.

**Split rule:** own dishes at full price; shared dishes ÷ everyone in the group; Rapido charges (delivery + packaging + taxes) ÷ everyone. Everyone, host included, pays on the demo payment screen.

**Supabase seed:** the restaurant catalogue only. Users sign up with email OTP, with no limit and no demo accounts.

**CSV demo data (Airtable course version only, synthetic):**
- 12 users with @example.com emails and fake phone numbers.
- About 30 addresses with GPS points placed near area centres (Koramangala, HSR, BTM, Gachibowli).
- 8 restaurants and about 80 menu items in ₹.
- 6 group orders covering every status, with members, items and payments.
- Masked payment methods with fake tokens.
