# Ownly Together (ownly.food)

Group ordering for Ownly, Rapido's zero-commission food app, launching in Chennai. Friends, flatmates or office colleagues add their own dishes to one shared order, the host places it, and everyone pays only their share.

**Concept prototype by Sameer Mittimani**, built for the IIT Roorkee × Masai PM course. Not an official Rapido product. Real Chennai restaurants and menus, demo payments only.

Start with [docs/README.md](docs/README.md): it walks through the whole product journey, from market sizing to the launch plan.

| Folder / file | What it is |
|---|---|
| `docs/` | The product journey: market, user research, personas, customer journey, roadmap, go-to-market, and `CHANGELOG.md` |
| `PRD.md` | Problem, users, north star, do and don't, stories with acceptance criteria, risks |
| `schema.md` | The 10 tables at a glance |
| `prompts/` | The implementation plan for AI Studio, the Stitch redesign prompts, the GPT restaurant-data prompt |
| `stitch/` | 26 Stitch screens (mobile and desktop) and the prompts used |
| `assets/` | Ownly logo and the pink design system (tokens, style preview) |
| `app/ownly-api.js` | Every Supabase call the front end needs, one function per action |
| `db/` | Database scripts, run in order: `ownly_together_supabase.sql` (01 + 02 + 03), `04_security_tidy.sql`, `05_chennai_split_images.sql`, `06_delivered.sql` |
| `db/chennai/` | The 15 Chennai restaurants and 150 dishes (CSV, with sources) |
| `db/tests/run.mjs` | 80 local checks on in-memory Postgres (PGlite) |
| `db/csv/` | 9 CSVs for the Airtable / Softr course version |

## Functions the app calls
`create_group_order` (with the host's split rule), `join_group`, `add_item`, `remove_item`, `leave_group`, `lock_group`, `place_group`, `cancel_group`, `pay_share`, `mark_delivered`, `get_group`, `my_group_orders`. Login is Supabase email OTP (a 6-digit code); the first login creates the profile. Every change is written to `audit_log`.

## Sign-up
Anyone can sign up with email OTP. There are no demo accounts and no sign-up limit. Group orders hold up to 12 people, with no limit on order value. Payments are demo only, and the payment screen says so.
