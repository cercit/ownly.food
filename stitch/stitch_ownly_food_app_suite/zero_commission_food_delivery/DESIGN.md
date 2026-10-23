---
name: Zero-Commission Food Delivery
colors:
  surface: '#f8f9ff'
  surface-dim: '#d3dae9'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eefd'
  surface-container-high: '#e1e9f7'
  surface-container-highest: '#dbe3f1'
  on-surface: '#141c26'
  on-surface-variant: '#4e4633'
  inverse-surface: '#29313c'
  inverse-on-surface: '#eaf1ff'
  outline: '#807661'
  outline-variant: '#d1c5ad'
  surface-tint: '#755b00'
  primary: '#755b00'
  on-primary: '#ffffff'
  primary-container: '#f9c933'
  on-primary-container: '#6d5500'
  inverse-primary: '#f0c12a'
  secondary: '#b7131c'
  on-secondary: '#ffffff'
  secondary-container: '#db3231'
  on-secondary-container: '#fffbff'
  tertiary: '#006d3b'
  on-tertiary: '#ffffff'
  tertiary-container: '#73e59c'
  on-tertiary-container: '#006637'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe08f'
  primary-fixed-dim: '#f0c12a'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#584400'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb3ac'
  on-secondary-fixed: '#410003'
  on-secondary-fixed-variant: '#93000f'
  tertiary-fixed: '#87faae'
  tertiary-fixed-dim: '#6add94'
  on-tertiary-fixed: '#00210e'
  on-tertiary-fixed-variant: '#00522b'
  background: '#f8f9ff'
  on-background: '#141c26'
  surface-variant: '#dbe3f1'
  surface-cream: '#FAFAF7'
  surface-card: '#FFFFFF'
  badge-yellow-tint: '#FFF8E1'
  badge-crimson-tint: '#FDECEE'
  badge-green-tint: '#E8F7EE'
  text-muted: '#606D7C'
  border-subtle: '#E5E9EE'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 12px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies an energetic, hyper-efficient, and consumer-friendly food tech aesthetic. Rooted in direct-to-consumer value, speed, and transparency, it captures the kinetic spirit of quick-commerce delivery combined with warm, appetite-inducing hospitality. The interface prioritizes clarity, swift decision-making, and visual delight.

The aesthetic blends **Modern Commercial Minimalism** with **Tactile Food-Tech Boldness**. It balances clean canvas layouts and generous whitespace against high-impact chromatic accents: electric golden yellow for energy and velocity, paired with punchy crimson/tomato highlights for appetite stimulation, promotional urgency, and savings callouts. Rounded geometry, soft pill buttons, and cheerful badge markers ensure the brand feels democratic, accessible, and community-driven.

## Colors

The palette leverages high-contrast functional color roles built for rapid scanning in dense e-commerce environments:

- **Primary (`#F9C933`)**: The signature electric gold/yellow represents velocity, brightness, and core brand recognition. Used for primary CTAs, active states, cart triggers, and highlighted zero-commission banners. Text on primary elements always defaults to deep slate (`#121A24`) for optimal contrast and punchiness.
- **Secondary (`#D82F2F`)**: A vibrant tomato-crimson driving appetite, urgency, live tracking alerts, discount tags, and active micro-interactions.
- **Tertiary (`#1B9A59`)**: Fresh garden green strictly reserved for pure veg indicators, zero-delivery fee affirmations, positive order confirmations, and driver arrival notifications.
- **Neutral (`#121A24`)**: Deep midnight slate replaces harsh generic blacks to deliver crisp, refined typographic readability without stark visual fatigue.
- **Named Tints**: Soft saturated washes (`badge-yellow-tint`, `badge-crimson-tint`, `badge-green-tint`) allow dense meta tags—such as "0% Commission" or "Group Cart"—to coexist legibly without clashing.

## Typography

Typography relies on **Plus Jakarta Sans** across all hierarchies, delivering a friendly, rounded, yet razor-sharp modern voice that aligns closely with contemporary mobile-first consumer applications.

- **Headlines**: Set in weights 700 and 800 with tight line heights to project confidence and bold promotional clarity in restaurant listings and hero offer ribbons.
- **Body**: Uses regular (400) and medium (500) weights with comfortable reading proportions for dish descriptions, ingredient tags, and billing breakdown manifests.
- **Labels & Microcopy**: Rendered in 700 to 800 weights with controlled uppercase tracking for badges ("ZERO COMMISSION", "BESTSELLER", "GROUP ORDER ACTIVE") to guarantee readability at sub-12px sizes.

## Layout & Spacing

The layout model is governed by an adaptable, card-centric fluid grid system engineered for fast-paced catalog navigation:

- **Mobile (<768px)**: Single-column scroll with sticky bottom action bars, `1rem` margins, and `0.75rem` vertical separation between restaurant cards and food category carousels.
- **Tablet (768px - 1024px)**: 6-column grid with `1.5rem` margins and `1rem` gutters, enabling 2-column dish card lists and multi-item checkout panels.
- **Desktop (>1024px)**: 12-column layout capped at a maximum width of `1280px`, flanked by `2rem` outer canvas padding and `1rem` gutters for 3- or 4-column restaurant discovery matrices.

Vertical cadence follows a strict 4px/8px rhythm. Content units prioritize tight, bite-sized vertical clustering (`space-xs` and `space-sm`) for metadata (ratings, prep time, distance) balanced against airy module separations (`space-lg` to `space-xl`) between browsing sections.

## Elevation & Depth

Visual hierarchy rejects heavy, muddy drop-shadows in favor of crisp, layered realism and subtle chromatic atmospheric projection:

- **Level 0 (Canvas Base)**: Rendered in `surface-cream` (`#FAFAF7`) providing a warm, tactile backdrop that prevents stark white clinical glare.
- **Level 1 (Listing & Menu Cards)**: Crisp white (`#FFFFFF`) background bounded by an ultra-thin border (`1px solid #E5E9EE`) and an ambient, warm slate shadow (`0 2px 8px -2px rgba(18, 26, 36, 0.04)`).
- **Level 2 (Floating Cart Bar & Dropdowns)**: Elevated cards with `0 8px 24px -4px rgba(18, 26, 36, 0.08)`.
- **Level 3 (Modals & Delivery Trackers)**: High-altitude layered sheet with `0 20px 48px -8px rgba(18, 26, 36, 0.16)`.
- **Color Bloom Highlights**: Key primary pill buttons feature a subtle sunny under-glow (`0 4px 14px 0 rgba(249, 201, 51, 0.35)`) to signal clickability and kinetic energy.

## Shapes

The design system embraces a **Pill-shaped (Level 3)** personality. Soft, circular curves convey approachability, friendly customer care, and quick touch ergonomics:

- **Primary Buttons & Action Chips**: Full pill radii (`9999px`) for high tactile satisfaction and mobile thumb navigation.
- **Cards & Content Panels**: Generous container curves using `rounded-xl` (`1.5rem`) for restaurant banners and `rounded-lg` (`1rem`) for individual item cards.
- **Badges & Micro Indicators**: Pill geometry (`9999px`) ensuring crisp encapsulation of operational metadata like delivery estimates and dietary tags.

## Components

### Buttons
- **Primary Action (Add to Cart / Checkout)**: Full pill silhouette, filled with Primary Golden Yellow (`#F9C933`), styled with Dark Slate text (`#121A24`, weight 700), and a soft yellow glow shadow. Hover introduces a subtle scale shift (`scale: 1.02`).
- **Secondary Action (View Menu / Modify)**: Pill-shaped outline with `1.5px solid #121A24`, transparent background, dark slate text.
- **Urgent / Cancel Action**: Secondary Crimson fill (`#D82F2F`) with pure white text, pill-shaped.

### Badges & Pill Chips
- **Zero-Commission / Savings Tag**: Tinted golden yellow background (`#FFF8E1`) with slate text and a mini electric bolt icon.
- **Group Order Status**: Vibrant Crimson tint (`#FDECEE`) with `#D82F2F` text and an active user avatar count avatar stack.
- **Dietary Indicators**: Pure Veg represented by a square green border (`#1B9A59`) with a solid green circle center; Non-veg marked in deep crimson (`#D82F2F`) with a filled triangle.
- **Prototype Banner Tag**: High-contrast, top-anchored banner with golden yellow fill and a dark slate micro-capsule badge reading `CONCEPT PROTOTYPE`.

### Cards
- **Restaurant Card**: Clean `#FFFFFF` base on `#FAFAF7` background, `1.5rem` rounded corners, 16:9 ratio imagery with soft inner edge-feathering, featuring floating pill delivery time stamps (`20-25 min`) top-right and rating capsules top-left.
- **Dish Row Card**: Horizontal flex layout with clear 80x80px food thumbnail, bold dish title, customizable item counter (`- 1 +`) floating directly over the bottom of the thumbnail.

### Input Fields & Search
- Generous 48px height pill-shaped search inputs, `#FFFFFF` fill with `1px solid #E5E9EE`, prominent left-aligned magnifying glass in `#606D7C`, and dynamic placeholder cycling between popular local dishes.
- Active focus state translates into a `2px solid #F9C933` halo without jagged offsets.

### Checkboxes & Radios
- **Radio (Size / Addon Selection)**: Custom circular indicator with smooth spring animation; active state fills with `#121A24` enclosing a central `#F9C933` core.
- **Checkbox (Multi-toppings)**: Rounded-sm (`6px`) container, active state transitions to solid `#121A24` with a crisp white checkmark.