# Ownly Together: change record

What changed, when, and whether it is live. Newest first. The database also keeps its own audit log of every user action (see 06).

## Database scripts (Supabase project brliajwgrhsnbgxaucsu)

Sameer runs each script in the Supabase SQL editor. Claude checks it afterwards with a read-only query.

| Script | What it does | Local tests | Live |
|---|---|---|---|
| `06_delivered.sql` | Mark an order delivered; send placed/delivered times so every phone shows the same tracking stage; trim table permissions (logged-out visitors can only read restaurants and menus; people can edit only their own name, phone, default address and location consent); **audit log** of every change to orders, members, items, payments, profiles, addresses and payment methods | 80 / 80 pass | Not yet run |
| `05_chennai_split_images.sql` | Photos on restaurants and dishes; host chooses the split rule ("Pay for what you ordered" or "Split everything equally"); Bengaluru/Hyderabad catalogue replaced by 15 Chennai restaurants and 150 dishes | 51 / 51 pass | Run 24 Oct 2026, checked: 15 restaurants, 150 dishes, all with photos, split rule present |
| `04_security_tidy.sql` | Logged-out visitors can't run the order functions | Covered | Run 23 Oct 2026, checked |
| `ownly_together_supabase.sql` (01 + 02 + 03) | 9 tables, row-level security, 16 functions, sign-up trigger, first catalogue | 36 / 36 pass | Run 23 Oct 2026, checked |

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

## Still open

- Supabase email templates: add `{{ .Token }}` to "Confirm signup" and "Magic Link" (Sameer, dashboard)
- Site URL and redirect URLs once the app is deployed
- Only the host can lock, place or cancel; one restaurant per group (built this way, not yet confirmed by Sameer)
- AI Studio front-end export; then wire to `app/ownly-api.js`, apply the pink design system, deploy
