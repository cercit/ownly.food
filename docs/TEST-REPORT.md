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

## Questions for Sameer

1. `@supabase/supabase-js@2.45.4` (pinned by the plan) pulls an `auth-js` version with a low-severity npm advisory (path routing on malformed input). Upgrade to the latest 2.x? Left as pinned.
2. The tracking stage "Your Rapido Captain is on the way" comes from the plan (screen 9). "Captain" is kept only in that line; no names, plates or call button.
