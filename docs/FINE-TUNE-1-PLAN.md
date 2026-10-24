# Fine-tune round 1 (24 Oct 2026)

From Sameer's first signed-in test. Build database first (tested in PGlite), then screens; commit after each step; re-run every check at the end.

## Decisions (Sameer)
- **Charges are automatic** and the host can't edit them.
  - Delivery: ₹20 per km, restaurant → delivery address (straight-line distance; an address without a map pin uses the middle of its area, from the restaurants there). Rounded to the rupee.
  - Packaging: per dish. ₹15 for low-end restaurants, ₹30 for higher-end (average menu price ₹250 or more: Anjappar, Pind, Sandy's, Dindigul Thalappakatti, Bombay Brasserie). Stored per restaurant, editable later.
  - Taxes: 5% GST on the food total.
  - Rates (₹/km, GST %) live in a settings table, not in code.
- **Phone required**, checked by pattern (10-digit Indian mobile starting 6–9), no OTP. Asked with the name at sign-up and required in Profile.
- **"Done" button** for each person when they've finished adding. Everyone sees Done ✓; adding or removing a dish afterwards switches it back to "Adding items".
- **Real map** on tracking and confirmation: OpenStreetMap via Leaflet (free, no key), restaurant and delivery pins, route line, rider moving with the stages.
- **Track the order / Order confirmation / Group activity** as pill buttons with icons.
- Address form fields get proper labels (screen readers); group activity shows names instead of "A group member".

## Steps
1. `db/07_fine_tune_1.sql` + tests: settings table, packaging per restaurant, `charges_for(group)`, `place_group(group)` computes charges, `get_group` returns live charges and member done status, `set_done`, done resets on add/remove, phone pattern, `group_activity(group)` with names.
2. API wrappers and types.
3. Checkout and cart: read-only charges; Done button and status chips.
4. Sign-in and Profile: phone with pattern check.
5. Map on tracking and confirmation.
6. Icon buttons, address labels, activity names.
7. Full check round: lint, build, unit tests, audit, live check, backend tests, browser check; then Sameer runs 07 and we retest signed in.
