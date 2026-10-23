# Ownly Together: web app

Concept prototype by Sameer Mittimani. Not an official Rapido product. React + TypeScript + Vite + Tailwind, on Supabase (email-code sign-in, database, row-level security).

```
cd web
cp .env.example .env     # optional: the same values are built in as defaults
npm ci
npm run dev              # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run lint` | type check |
| `npm run build` | production build into `dist/` |
| `npm test` | Vitest: share display, room code and `?join=` link, tracking clock, router, masked payment labels |
| `npm run audit` | rule audit of `src/` (banned words, other-city places, dashed codes, hard-coded restaurants, keys, browser storage) |
| `npm run live` | read-only checks against the live Supabase project (needs network access to it) |
| `node scripts/browser-check.mjs` | 390 / 768 / 1024 / 1440 px check with Playwright and a fake Supabase (`tests/fixture-server.mjs`); set `PLAYWRIGHT_MODULE` and `CHROMIUM` if they are not on the default path |

## Where things are

- `src/api/ownly-api.ts`: every Supabase call, same names as `app/ownly-api.js`. The screens call nothing else.
- `src/lib/`: room code and link, tracking clock, router, masked payment labels, formats, config (public URL and anon key only).
- `src/screens/`: one file per screen. Shares always come from the database (`place_group`); the browser never calculates them.
- Orders, carts and payments are never kept in browser storage. The Supabase library keeps the login session in the browser, as usual.

Never put the `service_role` key in this app.
