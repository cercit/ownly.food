# Ownly Together: front-end build plan

Written 24 Oct 2026. The backend is finished and live (see `CHANGELOG.md`). This plan builds the front end in `web/`, connects it to Supabase, and loops build → test → audit → rebuild → retest until every check passes. Work on `main`, commit after every step, and keep the repo private.

## Inputs

| What | Where |
|---|---|
| Base app (use this) | `cercit/Ownly-1st_try`: 13 screens, already has `src/services/ownly-api.ts`, pink tokens |
| Desktop layouts (reference only) | `cercit/owny-new_web` |
| Mobile layouts (reference only) | `cercit/owny-new_mobile` |
| Supabase calls (the real data layer) | `app/ownly-api.js` in this repo |
| Rules and screens | `prompts/implementation_plan.md` (rules), `PRD.md`, `schema.md` |
| Design | `assets/design/` (pink design system, tokens), `assets/ownly-logo.jpg`, `stitch/stitch_ownly_together_group_ordering/` (26 screens) |
| Backend tests | `db/tests/run.mjs` (80 checks, PGlite) |

Supabase project: `https://brliajwgrhsnbgxaucsu.supabase.co`. The anon key is in `app/ownly-api.js` and is safe in the browser. **Never use or ask for the service_role key. Never run SQL against the live database; Sameer runs SQL himself.**

## Product rules (must hold on every screen)

- Chennai only (OMR, Velachery, T. Nagar, Adyar, Anna Nagar, Nungambakkam, Mylapore). Restaurants and menus come from Supabase, not mock data.
- Sign-in is email + 6-digit code. No passwords, no demo accounts, no persona switcher.
- Up to 12 people per group, host included. No limit on order value. One restaurant per group. Only the host locks, places or cancels.
- Room code: 6 capital letters or numbers, no dash (e.g. `TNR742`). Share link: site address + `?join=CODE`. QR shows the same link.
- Host picks the split rule: "Pay for what you ordered" (`itemised`, default) or "Split everything equally" (`equal`). Shares come from the database (`place_group`), never calculated only in the browser.
- Rapido's delivery, packaging and taxes: entered by the host, shown as three plain lines, split equally.
- Everyone, host included, pays their own share on a Razorpay-style **demo** screen (UPI, QR, card, netbanking, "Paid the host in cash", Simulate success / failure). Note on screen: "Demo payment: no real money moves." Never ask for or store card numbers, CVVs or UPI PINs.
- Tracking stages: Order accepted → Preparing → Picked up → On the way → Delivered, on a timer counted from `placed_at` so every phone matches; call `markDelivered` at the end.
- Every screen carries: "Concept prototype by Sameer Mittimani. Not an official Rapido product."
- **Never include:** price comparisons, "markup", "₹0 fees", "you saved", "absorbed fees", savings dashboards, bag capacity gauge, any 6-person or ₹2,000 limit, rider names, number plates or a call button, "Rapido Direct", "Express Saver", "Pod", "commute", "co-riders", company names, CIN/GSTIN, made-up statistics, Hyderabad or Bengaluru places.

## Steps

| # | Step | Done when |
|---|---|---|
| 1 | **Merge.** Copy `Ownly-1st_try` into `web/` (not its `.git` or `.aistudio`). Keep the other two repos as reference only | `web/` committed |
| 2 | **Clean.** Remove `@google/genai`, `express`, `dotenv` and any server file or API-key use. Fix the rule words above. Add the logo and concept strip | `npm run build` passes; audit (below) shows no rule words |
| 3 | **Connect.** Replace the mock `web/src/services/ownly-api.ts` with typed wrappers around the functions in `app/ownly-api.js` (same names: `sendCode`, `verifyCode`, `listRestaurants`, `getMenu`, `startGroupOrder(…, splitRule)`, `joinGroup`, `getGroup`, `watchGroup`, `addItem`, `placeGroup`, `payMyShare`, `markDelivered`, `myGroupOrders`, `groupActivity`, …). Supabase JS from npm (`@supabase/supabase-js@2.45.4`); URL and anon key from `import.meta.env` with the values in `web/.env.example` | No mock data left in screens |
| 4 | **Sign in and profile.** Email → code → name; addresses with map pin after consent; masked payment methods | Screens work against Supabase (logged-out parts verified live) |
| 5 | **Order flow.** Explore → menu → start (split rule, code, QR, WhatsApp share) → join (preview, full at 12) → shared cart (Shared toggle, live refresh) → host checkout → confirmation → my share and pay → tracking → delivered → history → "Order again with this group" → group activity (audit log) | All 13 screens wired |
| 6 | **Layouts.** Desktop (1440 px) from `owny-new_web`, mobile (390 px) from `owny-new_mobile`, one responsive app | Both widths checked in a browser |
| 7 | **Test, audit, rebuild, retest** (loop below) until clean | Test report written |
| 8 | **Deploy: stop here and ask Sameer** (Vercel or GitHub Pages; repo stays private) | Sameer's choice recorded |

## Test → audit → rebuild → retest loop

Run all of these after step 2 and after every later step. If anything fails, fix it, rebuild and run the whole set again. Record each round in `docs/TEST-REPORT.md` (date, what ran, pass/fail, what was fixed).

**Build checks**
1. `cd web && npm ci && npm run lint && npm run build`: no type errors, build succeeds.
2. `node db/tests/run.mjs`: 80 / 80 (proves the backend scripts still match).

**Unit tests (add with Vitest)**
3. Share display: given a `get_group` result, the screen shows each person's food, shared share, charges share and total exactly as the database returned them.
4. Room code and link: `TNR742` accepted, `TNR-742` and `tnr742 ` normalised or rejected with a clear message; `?join=` read correctly.
5. Tracking clock: stage computed from `placed_at` + elapsed time, same answer for two clocks; `markDelivered` called once.

**Live read-only checks (no login needed)**
6. Logged-out visitor sees 15 Chennai restaurants and their menus with photos, from Supabase.
7. Logged-out visitor calling a group function gets "permission denied" (proves the anon key can't write).

**Rule audit (scripted)**
8. Search `web/src` for every "never include" word above, Hyderabad/Bengaluru places, dashed room codes, hard-coded restaurant names that aren't in `db/chennai/restaurants.csv`, and any API key other than the Supabase anon key. Zero hits.
9. Every screen renders the concept strip (check in a browser at 390 px and 1440 px).
10. No `localStorage` used for orders, carts or payments (only for UI preferences, if at all).

**Code review (self)**
11. Read every changed file once: no dead mock code, no unused screens, errors shown in plain words, loading and empty states present, buttons do what they say.

**What the cloud session cannot test:** signing in needs a real email code, so the signed-in flow (sign in, start, join from a second account, pay, deliver) is tested by Sameer and Claude locally after the push. Make that flow easy to follow and list the exact steps in `docs/TEST-REPORT.md`.

## Finish

Commit and push to `main` after every step. At the end, update `docs/CHANGELOG.md` (front end built, test rounds, open items) and stop before deploying.
