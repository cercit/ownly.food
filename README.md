# Ownly Together (ownly.food)

Group ordering for Ownly, Rapido's zero-commission food app: friends or office colleagues add their own dishes to one shared order, the host places it, and everyone pays only their share.

**Concept prototype by Sameer Mittimani**, built for the IIT Roorkee × Masai PM course. Not an official Rapido product. Demo data only, and payments in test mode.

| File | What it is |
|---|---|
| `PRD.md` | Problem, users, north star, do and don't, stories with acceptance criteria, risks, sprint |
| `schema.md` | The 9 tables at a glance |
| `db/ownly_together_supabase.sql` | Everything for Supabase in one file: tables, privacy rules, functions, restaurant catalogue |
| `db/01_schema.sql`, `02_logic_and_rls.sql`, `03_seed.sql` | The same SQL in three parts |
| `db/csv/` | 9 CSVs for the Airtable / Softr course version |
| `db/make_seed.py` | Regenerates the demo data |
| `db/tests/run.mjs` | 36 local checks on in-memory Postgres (PGlite) |

## Functions the app calls
`create_group_order`, `join_group`, `add_item`, `remove_item`, `leave_group`, `lock_group`, `place_group`, `cancel_group`, `pay_share`, `get_group`, `my_group_orders`. Login is Supabase email OTP; the first login creates the profile.

## Sign-up
Anyone can sign up with email OTP. There are no demo accounts and no sign-up limit. Group orders hold up to 12 people. Payments are demo only, and the payment screen says so.
