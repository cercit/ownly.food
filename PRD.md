# Ownly Together: PRD

**Group ordering for Ownly, Rapido's zero-commission food app**
Concept PRD by Sameer Mittimani · IIT Roorkee × Masai, Class 29 (No-code foundations) · 23 Oct 2026, updated 24 Oct 2026 · v1.1 (Chennai)
*Concept prototype. Not an official Rapido product.*

---

## 1. Problem statement

When a group of friends or office colleagues order food together today, one person does all the work outside the app. They collect everyone's choices on WhatsApp, rebuild the cart by hand, pay the full bill, then chase each person for their share over UPI for the next day or two. Choices get lost ("who wanted no onion?"), late additions arrive after the order is placed, and the host often never gets all their money back.

Ownly makes this more relevant than on other apps. Its model is zero commission for restaurants. It launched in Bengaluru (Koramangala, HSR, BTM) in August 2025, went citywide in March 2026 and reached Hyderabad on 25 Sep 2026 ([Business Standard](https://www.business-standard.com/companies/news/rapido-launches-ownly-app-enters-food-delivery-with-zero-commission-model-125081301836_1.html)). **It isn't in Chennai yet, and Ownly Together is how it launches there.** Every group order brings up to 11 new people into the app through one share link, which is a cheaper way to win a new city than one customer at a time. Chennai's office corridors (OMR, Velachery) and its flatmate and hostel areas (T. Nagar, Adyar, Anna Nagar, Nungambakkam, Mylapore) order in groups often.

**Evidence status:** the coordination pain comes from my own experience and observation. It has not been measured. Section 7 lists the validation planned before any build beyond the prototype, and the interview guide and survey are ready in `docs/02-user-research/`.

## 2. Users

- **Host:** starts the group order, usually the office "lunch organiser" or the flatmate with the app. Wants less coordination work and to get paid back in full.
- **Member:** joins from a link and adds their own food. Wants to pick quickly, see what others ordered and pay only their share.
- **Restaurant (secondary):** receives one larger order that's clearly itemised per person.
- **Rider (secondary):** does one normal delivery. Gets no new incentive and must not be disadvantaged.

## 3. North star and metrics

**North star:** group orders completed per week (placed and delivered, with at least 2 members).

| Type | Metric | Why |
|---|---|---|
| L1 | Average members per group order | Shows real group use, not solo orders through a new screen |
| L1 | Median time from link shared to order placed | Coordination speed is the core promise |
| L1 | % of members' shares paid within 24 hours | The host-repayment problem |
| Counter | Shares still unpaid after 7 days | The feature must not create bad debts between friends |
| Counter | Group orders cancelled after the cut-off | Too much friction or confusion |
| Counter | Delivery complaints on group orders vs single orders | Larger orders mustn't hurt riders or quality |

Targets are set after a 2-week baseline. No numbers are invented here.

## 4. Do and don't (scope)

**We do (MVP):**
- Email OTP login with name, phone (optional) and saved addresses (home, office, friend's place), each with a GPS pin.
- A host starts a group order: picks a restaurant, delivery address, cut-off time and **split rule**, and gets a 6-character share code, a link and a QR code.
- Members join with the link and add their own items with notes.
- A live shared cart showing who added what and the running total.
- The host locks the order at or before the cut-off, then places it.
- Automatic split, by the host's choice of rule:
  - **Pay for what you ordered** (default): your own dishes at full price; any dish marked **shared** split equally across everyone; Rapido's charges (delivery, packaging, taxes) split equally across everyone.
  - **Split everything equally:** the whole bill divided equally by the number of people.
- Pay your share on a payment screen with a clear **demo** warning (UPI, card or "paid the host in cash"). Everyone pays, including the host. Paid and pending status for everyone.
- Order confirmation with the share link, and live tracking anyone in the group can open (Order accepted → Preparing → Picked up → On the way → Delivered).
- Group order history, with "Order again with this group".
- An audit log of every change (who did what, when), visible to the group's members.

**We don't (this version):**
- No delivery-fee discounts or pricing incentives. The delivery fee is whatever Ownly charges for that one order. Riders are paid per trip, so pooling reduces their trips, and we won't build a pricing story on top of that.
- No orders from multiple restaurants in one group.
- No changes to rider pay, dispatch or routing.
- No real payments. A Razorpay-style demo screen only, and no card numbers, CVVs or UPI PINs stored.
- No group larger than 12 people. No limit on order value, and no limit on sign-ups.
- No recurring office-lunch subscriptions (Phase 2).

## 5. User stories and acceptance criteria

**S1 · Start a group order (host)**
As a host, I want to start a group order and share a link, so my friends add their own food instead of messaging me.
- *Happy path:* Given I'm logged in and choose a restaurant, address and cut-off, when I tap Start, then a group order opens with a 6-character code, a share link and me as host.
- *Blocked:* Given the restaurant is closed or the cut-off is in the past, when I tap Start, then I'm told why and nothing is created.
- *Already done:* Given I already host an open group order at this restaurant, when I start another, then I'm asked whether to continue the existing one.

**S2 · Join and add items (member)**
As a member, I want to join from a link and add my items, so the host doesn't have to type my order.
- *Happy path:* Given an open group order, when I open the link and log in with email OTP, then I join it and can add items with notes.
- *Blocked:* Given the order is locked or full (12 people), when I try to join or add, then I see the reason and nothing is added.
- *Already done:* Given I already joined, when I open the link again, then I go straight to my items. I'm not added twice.

**S3 · Split and pay (all)**
As a member, I want to see and pay only my share, so nobody has to chase anyone.
- *Happy path:* Given the order is placed, when I open it, then I see my own dishes, my share of shared dishes and my share of Rapido's charges, and can pay on the demo payment screen.
- *Blocked:* Given payment fails, then my share stays "pending" with a retry button, and the host sees who is pending.
- *Already done:* Given I already paid, when I tap Pay again, then I see "Paid" with the reference, and no second charge.

## 6. Data, privacy and the prototype

**Tables (Supabase):** profiles, addresses (label home/office/friend, lat/lng, source GPS or manual), restaurants, menu_items, group_orders, group_members, order_items, payment_methods (masked labels and gateway tokens only), payments, and audit_log (every change, written only by the database). Restaurants and menus are 15 real Chennai restaurants and 150 dishes with free Pexels photos. Full schema is in `schema.md`.

**Privacy:**
- Users see only their own profile, addresses and payment methods.
- Group members see the cart, everyone's items and shares, and only the area and label of the delivery address.
- GPS is captured only after consent, and the consent time is stored.
- All demo data is synthetic.

**Prototype:**
- Screens designed in Google Stitch from the Ownly pink design system (26 screens, mobile and desktop).
- Front end built with Google AI Studio, on Supabase (email OTP auth, database and row-level security).
- Hosted on GitHub Pages, with Ownly branding and a "concept prototype" strip on every screen.
- Anyone can sign up with email OTP and try it. No demo accounts.

**Screens:**
1. Email code sign-in
2. Explore restaurants (Chennai)
3. Menu
4. Start group order (with split rule)
5. Join via code or link
6. Shared cart
7. Host checkout (lock and place)
8. Order confirmation and share link
9. My share and pay
10. Live tracking
11. Order history
12. Profile and addresses
13. Edge states (group full, link expired, dish unavailable, payment failed, empty cart)

## 7. Risks and validation

| Risk | Mitigation |
|---|---|
| Large group orders strain riders (bag size, wait time) | 12-person cap. Track complaints as a counter metric |
| Unpaid shares sour friendships, and users blame the app | Clear pending status, one-tap reminders, "paid in cash" option |
| Restaurants mis-pack itemised orders | Items grouped by person on the restaurant ticket |
| The problem is smaller than assumed | Before Phase 2: 10 interviews with office and hostel organisers, plus a WhatsApp-poll survey (n ≈ 50) on how often they order as a group and how long repayment takes |
| Brand confusion | Concept strip on every screen, demo warning on the payment screen |

## 8. First sprint (23 Oct 2026, kept as a record)

| Time | Task | Owner | Done when |
|---|---|---|---|
| 7:00–7:45 pm | Stitch: 9 screens, Ownly look, concept strip | Sameer | Screens exported |
| 7:45–8:30 | Supabase: run schema SQL, row-level security, load demo CSVs | Claude + Sameer | Tables filled, rules tested |
| 8:30–9:00 | Auth: email OTP on, code in the email template, redirect URL set | Sameer (dashboard) | OTP email arrives, login works |
| 9:00–11:00 | AI Studio: build the front end from the Stitch screens and the Supabase client | Sameer + Claude | S1–S3 happy paths work |
| 11:00–11:45 | Test the 9 acceptance criteria and fix | Claude + Sameer | All 9 pass |
| 11:45–12:15 am | Deploy to GitHub Pages, smoke test on a phone | Claude | Live link works on phone and laptop |
| 12:15–12:30 | README and screenshots | Claude | Repo ready to share |

Not in that sprint: Softr/Airtable course version (same CSVs), the pitch email to Rapido, and the walkthrough video.

**What changed after it (24 Oct):** launch city moved to Chennai; real Chennai restaurants and menus; host chooses the split rule; delivered status and a shared tracking clock; audit log; tighter database permissions; Ownly pink design system and a full Stitch redesign. The 12-week plan to a real launch is in `docs/05-roadmap/`. Every change is recorded in `docs/CHANGELOG.md`.
