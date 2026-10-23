# Ownly Together front end: test report

Each round runs: build (`npm ci`, lint, build), backend tests, unit tests, live read-only checks, rule audit, browser check, self review.

Commands (from `web/`): `npm ci && npm run lint && npm run build`, `npm test`, `npm run audit`, `npm run live`. Backend (from repo root): `PGLITE_DIST=<path to @electric-sql/pglite/dist/> node db/tests/run.mjs`. The test file had a Windows-only path to PGlite; it now reads `PGLITE_DIST` first and falls back to the old path. No SQL changed.

## Round 1: after step 2 (clean), 23 Oct 2026

| Check | Result |
|---|---|
| `npm ci`, lint, build | Pass |
| Backend `db/tests/run.mjs` | Pass, 80 / 80 |
| Unit tests | Not written yet (step 3 to 5) |
| Live read-only (`npm run live`) | **Blocked**: this cloud session's network blocks `brliajwgrhsnbgxaucsu.supabase.co`. Script is ready; run it on your laptop |
| Rule audit | 7 hits, all in the old mock service (`rating`, `prep_time`, `localStorage`); the mock is replaced in step 3 |
| Browser 390 / 1440 px | Not run yet (needs the screens connected) |
| Self review | Done for config, strip, audit script |

Fixed this round: removed `@google/genai`, `express`, `dotenv`, `tsx`, `esbuild`, `metadata.json`, the AI Studio asset folder and the Gemini `.env.example`; removed the `user-scalable=no` zoom lock; concept strip now reads exactly "Concept prototype by Sameer Mittimani. Not an official Rapido product."; removed invented ratings, prep times, "Direct kitchen tariffs", "Express Rush", "Privacy Guard" and delivery-time claims from the old screens; removed seed restaurants, menus, addresses and history.

## Round 2: after step 3 (connect), 23 Oct 2026

| Check | Result |
|---|---|
| `npm ci`, lint, build | Pass |
| Backend `db/tests/run.mjs` | Pass, 80 / 80 |
| Unit tests (`npm test`) | Pass, 19 / 19: room code (`TNR742` ok, `TNR-742` and wrong lengths rejected with a message, `?join=` read and built), tracking clock (same stage for two clocks, boundaries, next-stage countdown), router |
| Live read-only | Blocked (network), script ready |
| Rule audit | Pass, 0 hits in 17 files (mock service deleted) |
| Browser 390 / 1440 px | Explore, menu and sign-in pages show the concept strip with no sideways scroll; `signin` and `start` routes are not built yet (step 4/5), so those two scenarios fail by design |
| Self review | Typed API wrappers match `app/ownly-api.js` names; errors turned into plain words |

Fixed this round: audit false positives (code comments, `localeCompare`). Added `scripts/browser-check.mjs` with a fixture server (`tests/fixture-server.mjs`) that answers Supabase calls from the real catalogue CSVs, so signed-in screens can be rendered here without a real email code.

## Round 3: after step 4 (sign in and profile), 23 Oct 2026

| Check | Result |
|---|---|
| `npm ci`, lint, build | Pass |
| Backend | Pass, 80 / 80 |
| Unit tests | Pass, 27 / 27 (added: masked UPI, card and bank labels reject full numbers; first-time name step) |
| Live read-only | Blocked (network) |
| Rule audit | First run: 1 hit (the heading "What should we call you?" matched the word "call"); reworded to "What is your name?"; re-run: 0 hits |
| Browser 390 / 1440 px | Sign-in (email, code step), profile and add-address pass at both widths; only the `start` route (step 5) still fails by design |
| Self review | Sign-in: email, 6-digit code, name step for first-time people, "send a new code", plain errors. Profile: name, optional phone, addresses with label, line 1 and 2, landmark, area, pincode check, default, delete; location asked first with a reason, consent time saved, map pin shown; payment methods save masked labels only |

## Round 4: after step 5 (order flow), 23 Oct 2026

| Check | Result |
|---|---|
| `npm ci`, lint, build | Pass |
| Backend | Pass, 80 / 80 |
| Unit tests | Pass, 36 / 36. New: share display (itemised example from the plan: 314, 274, 94, 244; equal rule; a database total is shown as given, never recomputed; Paid / Pending; three charge lines), activity wording, `markDelivered` reported once (also under simultaneous calls; retried only after a failure) |
| Live read-only | Blocked (network), script ready |
| Rule audit | First run: 2 hits (a code identifier named `call` matched the "call button" rule); renamed; re-run: 0 hits in 32 files |
| Browser 390 / 1440 px (fixture) | Pass, 60 of 60 screen/width pairs. Every screen shows the concept strip, no sideways scroll, no console errors. Interactions checked against the calls sent: start order (itemised rule), add dish (qty 1, not shared), place order (40 / 20 / 36), pay in cash |
| Self review | Reviewed all 13 screens: loading, empty and error states, plain error words, buttons do what they say. Fixed during review: adding is disabled after the cut-off (the database refuses it) with a plain note |

Screens now wired to Supabase: sign in, explore, menu, start (split rule, code, link, QR, copy, WhatsApp), join (preview, full at 12, closed, dashed code message, sign-in first), shared cart (menu beside cart on desktop, tabs on mobile, Shared toggle, live refresh every 5 s, countdown, lock, cancel, leave), host checkout (three charges, place), confirmation, my share and pay (demo modal: UPI, QR, card, netbanking, cash, simulate success / failure, retry), tracking (five stages from `placed_at`, `markDelivered` once), orders (in progress / past, receipt, order again, activity), group activity.

## Round 5: after step 6 (layouts), 23 Oct 2026

| Check | Result |
|---|---|
| Build, backend, unit tests, audit | Pass (see round 6 for the final full run) |
| Browser (fixture) | Pass, 120 of 120 screen/width pairs: 30 screens at 390, 768, 1024 and 1440 px, concept strip on all, no sideways scroll, no console errors |
| Self review | One responsive app: header with pill navigation from 1024 px, bottom navigation below it; menu beside the cart from 1024 px and Menu / Cart tabs below; avatars on member cards; tracking timeline with a clock time per stage; container 1240 px wide. Layouts follow the Stitch desktop and mobile structure; the Stitch and `owny-new_*` texts for savings, pods, fees and delivery estimates were not carried over |

## Questions for Sameer

1. `@supabase/supabase-js@2.45.4` (pinned by the plan) pulls an `auth-js` version with a low-severity npm advisory (path routing on malformed input). Upgrade to the latest 2.x? Left as pinned.
2. The tracking stage "Your Rapido Captain is on the way" comes from the plan (screen 9). "Captain" is kept only in that line; no names, plates or call button.
3. Tracking timings are my choice, not a rule: Order accepted 0 s, Preparing 30 s, Picked up 90 s, On the way 120 s, Delivered 180 s after `placed_at` (`web/src/lib/tracking.ts`). Tell me the timings you want.
4. Before the order is placed the app shows each person's own dishes, not a share, because shares are only worked out by `place_group` in the database (plan rule). A "preview of shares" before placing would need a new database function; not built.
5. "Simulate failure" is a screen-only state: the database has no call that records a failed payment, so the share simply stays Pending. Add `fail_share` to the database if failures should show in the audit log.
6. Member status ("Adding items" / "Done") and a progress bar to the cut-off are in the Stitch screens but have no database field (`get_group` has no `created_at` or member status), so they are not shown.
7. The group activity page says "A group member" for other people: `audit_log` stores only profile ids and `get_group` does not return them. Return names from a database function if you want "Priya added a dish".
8. "Order again with this group" opens Start at the same restaurant. There is no database list of past members to re-invite, so you share the new code again.
9. Tracking uses each phone's own clock against `placed_at`. A phone with a wrong clock shows a different stage. A server-time offset could fix that if it matters.
10. Dish photos and restaurant photos load from Pexels URLs in the database. If a photo URL is blank the card shows a pink block.
11. The default image fonts (Inter, Plus Jakarta Sans) load from Google Fonts. Say if you want them bundled.

## Manual test steps for the signed-in flow (needs real email codes)

The cloud session cannot receive email, so Sameer runs these on a laptop after `git pull`. Use `cd web && npm ci && npm run dev` (http://localhost:3000), or two browsers / one normal and one private window for the second and third person. Allow the site address under Supabase Authentication, URL configuration, if sign-in links complain.

1. **Sign up (person A, host).** Sign in, enter your email, press "Send me a code", type the 6-digit code from the email. Enter your name. Open Profile and add an address (try "Add a map pin from my location" once, and once type it by hand). Add a saved payment method: a UPI id, and a card with only the last 4 digits. Check that a full card number is refused.
2. **Start an order with each rule.** Explore, pick a restaurant, "Start group order". Do it once with "Pay for what you ordered" and once with "Split everything equally" (cancel the first, or use a different restaurant: a second order at the same restaurant reopens the existing one). Check the room code is 6 capitals or numbers with no dash, the link ends `?join=CODE`, the QR opens the same link, "Copy link" and "Share on WhatsApp" work.
3. **Join (person B, second browser).** Open the link signed out: you are asked to sign in, then land on the join preview (restaurant, host, cut-off, people, rule). Join. Open the link again: you go straight to the cart. Type the code in Join, and type it with a dash (`TNR-742`) to see the message.
4. **Add dishes.** As both people add dishes with notes. As person B mark one dish Shared (itemised rule). Both carts refresh within about 5 seconds. Remove one of your own dishes.
5. **Group full.** Sign up 11 more people (plus-addresses of one inbox work, for example you+u2@gmail.com) and join. Person 13 must see "This group is full (12 people)."
6. **Lock and place.** As host press "Lock the cart", check person B cannot add. Go to checkout, type delivery 40, packaging 20, taxes 36 and place the order. Check the confirmation shows each person's food, shared share, charges share and total, and that the numbers match the worked example in `prompts/implementation_plan.md` section 3 when you use the same dishes; under the equal rule the whole bill divides equally.
7. **Pay.** Everyone opens "My share and pay". Person B: "Simulate failure", then Retry, then "Simulate success" with UPI. Host: "Paid the host in cash". Check Paid / Pending changes for everyone within a few seconds, and that the note "Demo payment: no real money moves." shows.
8. **Track.** Open Track from the confirmation or the link on both phones: both show the same stage at the same moment. After the last stage the order shows Delivered, and Orders shows "Delivered". Reload during delivery: no second "mark delivered" error.
9. **History.** Orders shows in progress and past orders with my share and status, Receipt, "Order again with this group" (opens Start at the same restaurant), and Activity (who joined, added, paid).
10. **Cancel.** Start another order, add a dish, cancel as host. Person B sees "The host cancelled this order."
11. **Edge states.** Open a link for an order that was cancelled or closed (join shows "closed"); try a code that does not exist (message from the database); mark a dish unavailable only if you edit the catalogue yourself.
