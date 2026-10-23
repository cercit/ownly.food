# Ownly Together — Website Design System & Web Designer Handoff

**Version:** 1.0 · **Market:** Chennai, India · **Concept:** Ownly Together group food ordering · **Primary channel:** web landing page, with mobile-first product previews.

> **Design status:** An **Ownly-inspired concept direction**, derived from the earlier Chennai launch, user-persona, journey-map and competitor-analysis visuals. These are **proposed website tokens—not confirmed official Ownly brand guidelines**. Use approved official Ownly logos and assets only with permission. Ownly Together is a proposed feature, not a live product; any “Coming Soon,” sign-up, prices or UI shown in mockups must be marked accordingly.

## 1. Creative direction

**Style:** vibrant, youthful, cheerful, friendly food-tech; trustworthy enough for payments. Bold hot-pink headlines and buttons, deep navy type, ample white space, pale-blush surfaces, subtle gradients, rounded cards, playful micro-illustrations. The posters contain busy food/city imagery; translate this into a **cleaner website**: one strong hero visual per section and mostly white/soft-pink content areas.

**Three design words:** *Playful. Frictionless. Trustworthy.*

**Key message:** **Order Together. Pay Your Share. No More Chasing.**

**Visual priorities:** The shared order and individual payment experience are more important than decoration. CTA hierarchy must be obvious. Show Chennai flavour without stereotyping users.

## 2. Colour palette

| Token | Hex | Intended use |
|---|---|---|
| `--brand-pink` | `#F50062` | Primary brand expression, large headlines, graphics, accents |
| `--brand-pink-dark` | `#C40054` | Accessible primary button fill with **white** label, text links |
| `--brand-pink-hover` | `#A80047` | Hover/pressed button state |
| `--brand-pink-soft` | `#FFE3ED` | Chips, pale hero shapes, illustrations |
| `--brand-blush` | `#FFF1F6` | Alternating section backgrounds |
| `--surface` | `#FFFFFF` | Cards, nav, product panels |
| `--page` | `#FFF9FC` | Overall page background |
| `--navy` | `#111D35` | H1–H6, body copy, high-contrast UI |
| `--text-secondary` | `#576177` | Secondary descriptions |
| `--border` | `#F0D7E2` | Dividers, card borders, neutral field borders |
| `--positive` | `#16845A` | Paid/confirmed status **with label** |
| `--warning` | `#A65D00` | Pending/payment warning **with label** |
| `--violet` | `#7C3AED` | Secondary persona or optional feature highlight |
| `--orange` | `#FF922E` | Food illustrations and decorative accents |

**Colour distribution:** ~70% white/very light backgrounds; ~20% pink and blush; ~10% navy/accents. Avoid pure magenta surfaces spanning multiple consecutive sections.

**Contrast:** The display pink `#F50062` with white text is **below 4.5:1** for regular-sized text. Use `#C40054` + white for functional primary buttons; use navy text on pale-pink surfaces. Never communicate payment status only through colour.

## 3. Typography

- **Headlines:** `Plus Jakarta Sans` (700–800), or `Nunito Sans` (800) for a softer/playful look.
- **UI/body:** `Inter` (400–600). Fallback: system-ui, sans-serif.
- **Desktop H1:** 56–64px / 1.08 line-height, extra-bold. **Mobile H1:** 34–40px / 1.15.
- **H2:** 36–44px desktop, 28–32px mobile; **H3:** 22–26px.
- **Body:** 16–18px / 1.55; **metadata:** 13–14px / 1.45.
- **Buttons:** 15–16px, 700 weight, sentence case. Avoid all-caps body paragraphs and ultra-small info text.
- Treat the words **“Order Together”** or **“Pay Your Share”** in pink and the rest of the sentence in navy. Limit highlighted phrases to one per heading.

## 4. Grid, spacing, radii & effects

| Item | Desktop | Mobile |
|---|---|---|
| Content max width | 1200px (up to 1280) | fluid with 20px side padding |
| Grid | 12 columns / 24px gutters | 4 columns / 16px gutters |
| Section vertical spacing | 80–112px | 48–64px |
| Header height | 72–80px | 64–72px |
| Card padding | 24–32px | 18–24px |
| Small cards | 16–20px corners | 16–20px corners |
| Hero/feature cards | 24–32px corners | 22–28px corners |
| Pill buttons/chips | 999px corner radius | 999px corner radius |
| Button minimum height | 48–52px | 48–52px; full width when useful |
| Touch target | at least 44×44px | at least 44×44px |

**Spacing system:** multiples of 4px: `4, 8, 12, 16, 24, 32, 48, 64, 80, 96`.

**Shadows:** Soft and lightweight, e.g. `0 10px 30px rgba(17,29,53,.08)`; card hover `0 16px 42px rgba(17,29,53,.12)`. Use thin pale-pink borders to preserve definition on white backgrounds.

**Texture:** Soft radial pink glows / subtle blush gradients; use playful brushstroke underline behind *short* headlines as an accent. Keep body text backgrounds solid.

## 5. Visual language, images & icons

1. **Hero artwork:** One polished phone mockup showing a **group order** with three avatars, labelled meal items and **“Pay my share via UPI”**. All prices and data labelled as illustrative.
2. **People:** natural, modern, diverse Chennai office/flatmate/hostel contexts. Avoid tokenistic or stereotyped depictions. Stock/AI illustrations must be properly licensed/labelled.
3. **Food:** realistic South Indian and familiar multi-cuisine dishes; avoid overwhelming UI with photography.
4. **Local details:** Marina Beach silhouette, Chennai skyline or tasteful temple/railway architectural motifs; use lightly, e.g. at hero footer or launch-location cards, not in every section.
5. **Icons:** consistent rounded 2px line icons (Lucide-style): link, users, utensils, wallet, check, clock, repeat, shield, map-pin, smartphone. Keep icon size 20/24px and avoid mixing multiple icon families.
6. **Logo:** use approved Ownly SVG/PNG, properly scaled. Where unavailable, use text-only **“Ownly Together”** placeholder. The generated smile/bowl symbol must **not** be represented as an authenticated logo.

## 6. Recommended page structure (marketing landing page)

| Section | Copy / objective | Visual direction |
|---|---|---|
| **01 Navigation** | Logo, How it works, Who it's for, FAQs, **Get launch updates** | white floating navbar, dark text, pink CTA |
| **02 Hero** | Eyebrow: **A new way to order together · Chennai concept**; H1: **Order Together. Pay Your Share. No More Chasing.** | 60/40 text-and-phone mockup, pink halo glow |
| **03 How it works** | **Start a group → Share link → Everyone chooses → Each pays their share** | 4 numbered pastel cards, connecting line |
| **04 Why it matters** | “No more message chaos”; “No one fronts the full bill”; “No chasing UPI transfers” | before/after workflow cards |
| **05 For every crew** | “Office lunch”, “Flatmates”, “Hostel friends”, “Weekend plans” | use-case tiles with restrained lifestyle imagery |
| **06 Prototype preview** | Shared cart + personalised items + transparent individual payable amount | app preview; clearly marked **Proposed experience** |
| **07 Repeat with one tap** | “Order again with this group” | saved group card + subtle replay icon |
| **08 Chennai launch** | OMR, Velachery, T. Nagar, Adyar, Anna Nagar, Nungambakkam, Mylapore | Chennai city motif + upcoming areas, avoid claiming live coverage |
| **09 FAQs & trust** | How payment works; can members edit items; what happens if someone doesn't pay; data/privacy | concise accordions; plain English |
| **10 Closing CTA & footer** | **Get launch updates** / **Join waitlist** only when a real signup flow exists | pink gradient strip, approved brand mark, privacy links |

**Conversion intent:** Adoption from shared links. Each “Join group” deep link should route users directly to their particular group's preview **when actually implemented**; never send users to a generic campaign home page and make them search for the invite again.

## 7. Core app / web UX components

| Component | Design / behaviour |
|---|---|
| **Group header** | Group name, host, current members (up to 12 total, per proposal), time limit/status |
| **Invite link & share** | Copy link, WhatsApp share, confirmation toast; avoid copying private account information |
| **Shared cart** | Every item visibly attributed to member; quantity controls; reliable synchronisation |
| **Payment breakdown** | Items, taxes/fees, discounts, exact member payable total; explain how common fees split |
| **UPI payment** | Clear payee and amount; gateway handoff; confirmation and receipt; no fake success states |
| **Participant status** | Invited, Joined, Added items, Payment pending, Paid, Failed; labelled statuses |
| **Host controls** | Joining deadline, submit/lock order, manage unpaid participants with fair, clear rules |
| **Saved groups** | “Order again with this group”; never silently repurchase or charge members |
| **Error/empty states** | Link expired, restaurant unavailable, unavailable dish, UPI timeout, partial group payment |
| **Accessibility controls** | Keyboard navigation, focus rings, field labels, screen-reader announcements |

**Critical product behaviour to specify before build:** Can members order without installing? When does an order lock? Who owns delivery charges? What happens when one member fails to pay? When is a restaurant order actually placed? Do not invent these answers in the live UI.

## 8. Component specifications

**Primary CTA:** 52px height, min 16px horizontal padding (prefer 24px), fill `#C40054`, white label, 999px radius, mild elevation, hover darken to `#A80047`, focus outline. Examples: **Get launch updates**, **Join group** (only when functional).

**Secondary CTA:** White fill, 1.5px navy/pink border, navy label; hover blush; focus ring. **Tertiary action:** dark-pink text + small arrow, underlined on hover.

**Feature card:** white background, 1px `#F0D7E2` border, 24px radius, 24px padding, icon in 48px light-pink circle; short 3–6 word heading, 1–2 lines of explanation.

**Steps:** circular numeric token in brand pink, headline in navy, thin dotted connector; switch to a vertical stack on phones.

**Inputs:** min 48px height, 12px corners, visible labels, high-contrast error text; never rely on placeholder alone. Don't collect phone numbers without consent wording or working backend.

**Status chips:** filled pale surface with explicit words: **Paid**, **Pending**, **Payment failed**, **Order locked**. Icons plus text, never colour alone.

**Product screenshots:** consistent 390×844 CSS-pixel mockup frame, min 16px internal padding, rounded corners 28px, clean mobile status/header; do not copy exact third-party app UI.

## 9. Motion & interaction

- Navigation/card hover transitions: **150–200ms** ease-out.
- Scroll entry: gentle 8–16px upward fade, **250–350ms** maximum.
- Invite link copied: toast for confirmation, no confetti on every click.
- Progress/UPI: use real backend status; offer informative pending states and retry paths.
- Respect `prefers-reduced-motion: reduce`; avoid autoplay carousels or distracting parallax.

## 10. Responsive and accessibility rules

- **Mobile first:** 360–430px primary; tablet 768px; desktop 1280–1440px.
- Desktop hero two columns; mobile stacks **headline and CTA first, screenshot second**.
- Feature cards 3–4 across desktop, 2 on tablet, 1 on phone. Never shrink the matrix into unreadable text: transform into cards or scroll with a visible cue.
- Minimum body copy 16px; 4.5:1 WCAG AA text contrast; 3:1 for essential large text and interactive outlines.
- Meaningful alt text for product images; decorative skyline hidden from screen readers; logical heading levels.
- Keyboard-friendly menus, dialog focus management, error summaries, form labels, visible focus states.
- Accommodate longer Tamil translations; do not bake promotional text into images. English-first UX with Tamil-ready content structure.
- Avoid sending PII through share previews, analytics events or uncontrolled deep-link parameters.

## 11. Content / copy voice

Friendly, direct, and useful—not overly cute in trust/payment moments.

| Use | Copy example |
|---|---|
| H1 | **Order Together. Pay Your Share. No More Chasing.** |
| Supporting line | **One person starts the order. Everyone picks and pays for their meal.** |
| Benefit | **One shared cart. Your own bill.** |
| Group action | **Invite your crew** |
| Return action | **Order again with this group** |
| Preview label | **Proposed experience — coming soon** |
| Trust language | **See your items and full amount before you pay.** |

Avoid unverified “first ever”, “guaranteed savings”, “live now in Chennai”, or claims that every restaurant supports split checkout.

## 12. Designer deliverables / acceptance checklist

- [ ] Figma foundations: colour variables; text styles; radius, spacing, shadow tokens.
- [ ] Desktop 1440px, tablet 768px and mobile 390px responsive designs.
- [ ] Component library: buttons, cards, chips, inputs, accordions, nav, toasts, phone mockup.
- [ ] Landing page (all 10 sections) + responsive variants.
- [ ] Group-order flow screens: invite → join → add items → review share → pay → confirmation.
- [ ] Loading, empty, offline, failed-payment and expired-invite states.
- [ ] Colour contrast and keyboard-accessible interaction specs.
- [ ] Export approved logos/illustrations as SVG; photos as AVIF/WebP with fallback.
- [ ] All sample amounts/coverage/launch details labelled **illustrative**, **planned**, or **verified**.
- [ ] Developer-ready CSS tokens and a lightweight HTML style preview.

## 13. Included handoff files

1. **`Ownly_Together_Web_Design_System.md`** — this specification.
2. **`Ownly_Together_Design_Tokens.css`** — reusable CSS custom properties, buttons/cards and responsive defaults.
3. **`Ownly_Together_Style_Preview.html`** — browser-openable visual preview with representative cards and smartphone concept UI (keep CSS file in the same folder).

**Reference:** original Ownly-inspired Chennai competitor-analysis and journey-map graphics created during this project. **Reference site:** <https://ownly.food/hyd>. The site reference informs tone only; it is not proof of approved brand assets or of Chennai product availability.
