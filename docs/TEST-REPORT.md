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

## Questions for Sameer

1. `@supabase/supabase-js@2.45.4` (pinned by the plan) pulls an `auth-js` version with a low-severity npm advisory (path routing on malformed input). Upgrade to the latest 2.x? Left as pinned.
2. The tracking stage "Your Rapido Captain is on the way" comes from the plan (screen 9). "Captain" is kept only in that line; no names, plates or call button.
