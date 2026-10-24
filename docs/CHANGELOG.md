# Ownly Together: change record

What changed, when, and whether it is live. Newest first. The database also keeps its own audit log of every user action (see 06).

## Front end (`web/`), built 23 Oct 2026 (steps 1 to 7 of `BUILD-PLAN.md`)

Not deployed and not public. Pushed to `main` after every step; the repository is private.

| Step | What changed |
|---|---|
| 1 Merge | `Ownly-1st_try` copied into `web/` (no `.git`, no `.aistudio`) |
| 2 Clean | Removed Gemini, Express, dotenv, tsx, the AI Studio asset folder and every mock restaurant, menu, address and order. Concept strip: "Concept prototype by Sameer Mittimani. Not an official Rapido product." Invented ratings, prep times, fee and delivery-time claims removed |
| 3 Connect | `web/src/api/ownly-api.ts`: typed wrappers with the same names as `app/ownly-api.js` (`supabase-js@2.45.4` from npm). URL and anon key come from `import.meta.env`, with the `.env.example` values as defaults. Helpers for room code and `?join=` link, tracking clock, router, masked labels |
| 4 Sign in and profile | Email, 6-digit code, name step; profile with addresses (map pin after consent), default address, masked payment methods |
| 5 Order flow | Explore, menu, start (split rule, code, link, QR, WhatsApp), join (preview, full at 12), shared cart (Shared toggle, refresh every 5 s, countdown), host checkout (three charges), confirmation, my share and pay (demo modal), tracking (timer from `placed_at`, `markDelivered` once), orders (receipt, order again), group activity |
| 6 Layouts | One responsive app checked at 390, 768, 1024 and 1440 px |
| 7 Test | Four rounds plus a final full round recorded in `docs/TEST-REPORT.md`: build, backend 80 / 80, 36 Vitest tests, rule audit 0 hits, browser check 120 / 120 on a fake Supabase |

Test tooling added: `web/scripts/audit.mjs`, `web/scripts/live-check.mjs`, `web/scripts/browser-check.mjs`, `web/tests/`. `db/tests/run.mjs` now reads the PGlite location from `PGLITE_DIST` (it had a Windows-only path); no SQL changed.

**Not verified here:** the live read-only checks (this session's network blocks the Supabase host) and the signed-in flow (needs real email codes). Exact manual steps are in `docs/TEST-REPORT.md`. Open questions for Sameer are listed there too.


## Database scripts (Supabase project brliajwgrhsnbgxaucsu)

Sameer runs each script in the Supabase SQL editor. Claude checks it afterwards with a read-only query.

| Script | What it does | Local tests | Live |
|---|---|---|---|
| `07_fine_tune_1.sql` | Automatic charges (delivery Rs 20 per km from restaurant to address; packaging Rs 15 or Rs 30 per dish by restaurant; GST 5% on food) worked out by the database, host can't edit; mobile number required (10-digit Indian pattern, no OTP); Done status per person; group activity with names; map positions (delivery shown as the middle of the area) | 98 / 98 pass | Run 24 Oct 2026, checked: settings, 5 restaurants at Rs 30 and 10 at Rs 15, new place_group live and old one gone, set_done, group_activity, phone check, reset trigger |
| `06_delivered.sql` | Mark an order delivered; send placed/delivered times so every phone shows the same tracking stage; trim table permissions (logged-out visitors can only read restaurants and menus; people can edit only their own name, phone, default address and location consent); **audit log** of every change to orders, members, items, payments, profiles, addresses and payment methods | 80 / 80 pass | Run 24 Oct 2026, checked: mark_delivered live (signed-in only), audit log with 7 triggers and its own security rules, logged-out visitors read-only on restaurants and menus, profile email locked, no direct writes to payments or the audit log |
| `05_chennai_split_images.sql` | Photos on restaurants and dishes; host chooses the split rule ("Pay for what you ordered" or "Split everything equally"); Bengaluru/Hyderabad catalogue replaced by 15 Chennai restaurants and 150 dishes | 51 / 51 pass | Run 24 Oct 2026, checked: 15 restaurants, 150 dishes, all with photos, split rule present |
| `04_security_tidy.sql` | Logged-out visitors can't run the order functions | Covered | Run 23 Oct 2026, checked |
| `ownly_together_supabase.sql` (01 + 02 + 03) | 9 tables, row-level security, 16 functions, sign-up trigger, first catalogue | 36 / 36 pass | Run 23 Oct 2026, checked |

## Supabase dashboard settings

| Date | Setting |
|---|---|
| 24 Oct 2026 | Email templates "Confirm sign up" and "Magic Link" show the 6-digit code (`{{ .Token }}`), subject "Your Ownly Together code"; Email OTP length 6 (Sameer) |
| 23 Oct 2026 | Custom SMTP via Gmail, sender "ownly-sam" (Sameer) |

## Product decisions (Sameer)

| Date | Decision |
|---|---|
| 24 Oct 2026 | Ownly pink design system replaces the Stitch yellow. Stitch screens to be redesigned from `prompts/stitch-redesign-pink.txt` |
| 24 Oct 2026 | Keep an audit log of all changes |
| 24 Oct 2026 | Orders are marked delivered when the tracking timer finishes (prototype) |
| 24 Oct 2026 | Real Chennai restaurants from GPT research, including McDonald's and Pizza Hut; free Pexels photos only |
| 23–24 Oct 2026 | Launch city is Chennai (Ownly isn't there yet) |
| 23–24 Oct 2026 | Host picks the split rule: pay for what you ordered (default) or split everything equally |
| 23 Oct 2026 | Up to 12 people per group, no order-value limit, unlimited sign-ups, no demo accounts, email-code sign-in |
| 23 Oct 2026 | Own dishes at full price; shared dishes and Rapido charges split equally; everyone, host included, pays on a demo payment screen |
| 23 Oct 2026 | No fee discounts, price comparisons, rider names or made-up Rapido product names |

## Front end

| Date | What | Checks |
|---|---|---|
| 24 Oct 2026 | Cloud session built `web/` (steps 1-7 of BUILD-PLAN.md) | Build, 36 unit, audit 0, browser 120/120; live check run locally: pass |
| 24 Oct 2026 | First signed-in test on live Supabase (Sameer + second account): sign-up, address, group order, join, shared dish, lock, place, split Rs 1,102 + Rs 1,062 = Rs 2,164, failed then successful demo payment, tracking to Delivered, 15-step audit trail | All pass |
| 24 Oct 2026 | Fine-tune round 1 (`docs/FINE-TUNE-1-PLAN.md`): automatic charges, Done, required mobile, real map, icon buttons, activity names | 39 unit, audit 0, live pass, 98 database; checked in the browser |

## Still open

- Site URL and redirect URLs once the app is deployed
- Only the host can lock, place or cancel; one restaurant per group (built this way, not yet confirmed by Sameer)
- Deploy (Vercel or GitHub Pages; repo stays private): waiting for Sameer's choice. Site URL and redirect URLs go with it
- Run `npm run live` and the manual signed-in steps in `docs/TEST-REPORT.md`
