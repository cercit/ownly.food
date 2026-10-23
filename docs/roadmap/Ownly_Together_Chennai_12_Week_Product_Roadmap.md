# Ownly Together — 12-Week Product Roadmap

**Product:** Ownly Together  
**Market:** Chennai, India  
**Feature:** Collaborative group food ordering with individual UPI payments  
**Duration:** 12 weeks | **Scale:** Weekly  
**Status:** Proposed roadmap | **Fixed dates:** None

---

## 1. Roadmap Overview

**Objective:** Launch a reliable group-ordering experience that acquires Chennai customers through WhatsApp invitations, eliminates manual payment collection, and encourages repeat orders.

**North Star Metric:** Completed group orders per week.

**MVP scope**
- Host creates a group order and shares an invitation link.
- Up to 11 members join and select their meals.
- Members see their individual totals and pay through UPI.
- Host tracks member and payment status.
- Group order follows a defined cutoff and checkout process.
- Users can reorder with their saved group.

**Out of scope for MVP:** Multi-restaurant checkout, scheduled group orders, loyalty points, and advanced recommendations.

**We are here:** `▶ W1 — Discovery and planning`

### Milestone Timeline

| Period | Milestone | Outcome |
|---|---|---|
| W1–W2 | ▶ Discovery & Architecture | Requirements, UX flows, technical feasibility |
| W3–W4 | ◆ Alpha | Internal group-ordering experience works |
| W5–W6 | Payment Integration | Real payment, order and settlement flows |
| W7–W8 | ◆ Beta | Limited Chennai customer pilot |
| W9–W10 | ◆ UAT | Release candidate validated |
| W11 | Launch Readiness | Final testing, rollback and operational readiness |
| W12 | ★ GA | Controlled public Chennai launch |

### Visual Milestone Map

| Milestone | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 | W11 | W12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Discovery | █ | █ | | | | | | | | | | |
| Alpha | | | █ | ◆ | | | | | | | | |
| Payment integration | | | | | █ | █ | | | | | | |
| Beta | | | | | | | █ | ◆ | | | | |
| UAT | | | | | | | | | █ | ◆ | | |
| Launch preparation | | | | | | | | | | | █ | |
| GA | | | | | | | | | | | | ★ |

**Legend:** █ Active work · ◆ Gate · ★ Public launch · ░ Buffer

---

## 2. Milestones & Release Gates

### ◆ Alpha — End of Week 4

**Entry criteria**
- Core group-order flow is clickable.
- Mock restaurant/menu data permitted.
- Host/member screens and cart flow connected.

**Exit criteria**
- Critical P0 functional path works.
- Crash-free sessions greater than 97%.
- Basic event logging available.
- Internal test group completes simulated ordering.

**Deliverable:** Internally testable prototype with working group and cart interactions.

### ◆ Beta — Weeks 7–8

**Entry criteria**
- Real restaurant/menu data available.
- Authentication and UPI payment integration functional.
- Payment and integration controls protected by feature flags.
- Payment-provider approval and settlement feasibility established.

**Exit criteria**
- No open P0 or P1 bugs.
- D7 repeat-group rate ≥20% (provisional target).
- Checkout API error rate ≤1%.
- Participant feedback collected and reviewed.

**Deliverable:** Limited external pilot with selected Chennai office and flatmate groups.

### ◆ UAT — End of Week 10

**Entry criteria**
- MVP feature-complete.
- Load and performance tests executed.
- Major security and accessibility checks completed.
- Critical payment/refund scenarios validated.

**Exit criteria**
- Zero open P0 defects.
- Maximum two P1 defects, each with an approved workaround.
- PM, Engineering, QA and Design sign-offs.
- Acceptance criteria passed.

**Deliverable:** Approved release candidate.

### ★ GA — Week 12

**Entry criteria**
- Deployment checklist complete.
- Operational runbooks and on-call ownership assigned.
- Analytics, alerts, support documentation and launch communications ready.
- Rollback procedure rehearsed.

**Exit criteria**
- Production deployment completed.
- Rollback plan available and tested.
- Public communications executed.
- Production dashboards and support monitoring active.

**Deliverable:** Public Chennai launch, with controlled feature-flag rollout.

---

## 3. Swimlanes — Weekly ASCII Gantt

Each cell identifies active work (█) or buffer (░). Dependencies appear in parentheses.

| Team/Period | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 | W11 | W12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Engineering — Frontend** | █ Scaffold | █ UI kit (Design) | █ Invite flow | █ Cart views (API) | █ Split-pay UI | █ Payment states (BE) | █ Pilot UX (Beta) | █ Error/a11y fixes | █ Telemetry/perf | █ UAT fixes | ░ Buffer | █ GA rollout |
| **Engineering — Backend** | █ Data model | █ Auth/schema | █ Group APIs | █ Cart APIs | █ UPI integration | █ Settlement states | █ Flags/rate limits | █ Refunds/events | █ Load/observability | █ UAT fixes | ░ Runbook/buffer | █ Production ramp |
| **Design** | █ Research | █ User flows | █ Wireframes | █ Alpha prototype | █ Checkout UX | █ Payment-copy states | █ Beta feedback | █ Accessibility | █ Design QA | █ UAT polish | ░ Buffer | █ Launch QA |
| **Testing (QA)** | █ Test strategy | █ Test environment | █ API contracts | █ Alpha E2E | █ Payment cases | █ Integration E2E | █ Beta smoke | █ Regression | █ Perf/security | █ UAT sign-off | █ Rollback rehearsal | █ GA smoke |
| **Marketing** | █ Positioning | █ Chennai messaging | █ Landing page | █ Concept testing | █ Pilot recruitment | █ Invite assets | █ Beta onboarding | █ Feedback analysis | █ Support FAQ | █ Campaign approval | █ Launch preparation | █ Chennai launch |

### Deliverables by Swimlane

**Engineering — Frontend**
1. W1–2: Mobile architecture, navigation and reusable Ownly UI components.
2. W3: Create/join group screens with WhatsApp link handling.
3. W4: Shared cart, quantities and member-level item visibility.
4. W5–6: Individual checkout, UPI redirect and payment-status screens.
5. W7: Beta-ready onboarding and feature-flag integration.
6. W8: Accessibility, loading and failure-state refinements.
7. W9–10: Analytics, performance improvements and UAT fixes.
8. W12: Production release and monitored rollout.

**Engineering — Backend**
1. W1–2: Group, member, cart, order and payment schemas.
2. W3–4: Group/cart APIs, member permissions and checkout locking.
3. W5: Payment-provider API integration and transaction identifiers.
4. W6: Payment state machine, callbacks, reconciliation and settlement.
5. W7: Feature flags, authentication controls and rate limits.
6. W8: Refund/cancellation handling and event pipeline.
7. W9–10: Observability, performance and UAT corrections.
8. W11–12: Runbooks, migration validation and production ramp.

**Design**
1. W1: Chennai host/member research synthesis.
2. W2: User journeys, service blueprint and error journeys.
3. W3: Wireframes covering invitation, cart and checkout.
4. W4: Alpha prototype and internal usability findings.
5. W5–6: Final payment, cutoff, refund and notification designs.
6. W7–8: Beta usability fixes and accessible component states.
7. W9–10: Design QA and UAT approval.
8. W12: Production UI audit and post-launch observations.

**Testing (QA)**
1. W1–2: Test strategy, device matrix and environments.
2. W3–4: API contract tests and Alpha E2E coverage.
3. W5–6: UPI, duplicate-payment, timeout and refund testing.
4. W7: Limited pilot smoke testing.
5. W8: Regression, compatibility and accessibility verification.
6. W9: Load, security and failure-recovery testing.
7. W10: UAT evidence and release recommendation.
8. W11–12: Rollback rehearsal and production smoke checks.

**Marketing**
1. W1–2: Product positioning and Chennai-specific launch messaging.
2. W3: Coming-soon landing page and interest capture.
3. W4: Message comprehension and concept testing.
4. W5: Recruit office, PG and flatmate pilot groups.
5. W6: WhatsApp invitation creatives and referral content.
6. W7–8: Beta onboarding, interviews and insight collection.
7. W9–10: Customer support FAQ and approved launch messaging.
8. W11–12: Launch communications and campaign tracking.

---

## 4. Cross-Team Dependencies

| Dependency | Required by | Owner | Deadline |
|---|---|---|---|
| Approved user flows → Frontend | Interactive screens | Design | W2 |
| Auth and group APIs → Frontend | Invitation/cart integration | Backend | W3 |
| Restaurant/menu availability → Backend | Real-data checkout | Operations/Backend | W5 |
| Payment-provider approval → Backend | Real UPI split-pay | Payments/Compliance | W5 |
| Payment callbacks → QA | End-to-end payment tests | Backend | W6 |
| Pilot recruitment → Beta | External customer validation | Marketing | W6 |
| Analytics events → Product | Pilot conversion and retention measurement | Engineering/Analytics | W7 |
| Security and release approval → GA | Production deployment | Security/QA/PM | W11 |

**Critical path:** Payment-provider feasibility → transaction/settlement integration → end-to-end reconciliation → Beta → UAT → GA.

---

## 5. Major Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| UPI multi-payer checkout unsupported | Blocks core value proposition | Validate provider and settlement architecture in W1–2 |
| Individual payments fail or time out | Financial and trust risk | Idempotency, reconciliation, refunds and clear statuses |
| Members delay payments | Orders remain incomplete | Visible deadlines, reminders and cutoff handling |
| Restaurant availability gaps | Low Chennai adoption | Validate supply in pilot neighbourhoods |
| Slow WhatsApp invite conversion | Weak viral acquisition | Deep links, streamlined onboarding, funnel experiments |
| Inconsistent shared cart | Incorrect orders and totals | Versioning, authoritative totals, checkout locking |
| Low repeat-group usage | Poor retention | Saved groups and reorder experiments |
| Release slips | Launch delay | W11 buffer, feature flags and strict MVP scope |

**Stop condition:** Do not release real-money split checkout unless payment collection, settlement, reconciliation, refund responsibilities and required approvals are verified.

**Buffer:** W11 absorbs outstanding release defects; it is not reserved for new features.

---

## 6. Product Metrics & Instrumentation

### North Star

**Completed Group Orders per Week**

Count distinct group orders successfully accepted and completed, excluding cancellations, test orders and duplicate events.

### Supporting Metrics

| Metric | Definition | Initial planning target |
|---|---|---|
| Invite-to-signup conversion | New signups ÷ unique invited visitors | Establish during Beta |
| Group activation | Groups with ≥2 members ÷ groups created | ≥60% |
| Payment completion rate | Required member payments completed ÷ payments requested | ≥95% |
| Group checkout conversion | Completed group orders ÷ checkout-started groups | ≥70% |
| D7 host repeat rate | Hosts repeating within 7 days ÷ eligible first-order hosts | ≥20% |
| P0/P1 incidents | Critical/high-severity open bugs | Beta: 0; UAT: 0 P0 |

*These thresholds are provisional launch hypotheses, not observed Chennai benchmarks.*

### Instrumentation Events

`group_created`  
`invite_link_generated`  
`invite_link_opened`  
`member_joined`  
`item_added`  
`cart_locked`  
`payment_initiated`  
`payment_succeeded`  
`payment_failed`  
`group_order_completed`  
`group_order_cancelled`  
`reorder_initiated`

**Dashboards:** Acquisition funnel, group activation, checkout, payment reconciliation, retention, app stability and live operations.

**Alerts:** Checkout errors, unsuccessful payments, reconciliation mismatches, API latency and crash spikes.

---

## 7. Quality Bars

| Category | Release requirement |
|---|---|
| Stability | Alpha >97% crash-free; GA target ≥99.5% |
| API reliability | Checkout error rate ≤1% |
| Performance | P95 key-screen load ≤3 seconds on representative 4G |
| Cart synchronisation | Target visible updates ≤2 seconds |
| Accessibility | WCAG 2.2 AA-aligned relevant mobile checks |
| Security | Secure authentication, access controls, encryption and approved security testing |
| Payments | Idempotency, callback verification, audit trail, settlement/reconciliation and refund testing |
| Observability | Structured logs, dashboards, alerts and traceable order IDs |
| Compatibility | Defined Android/iOS device matrix passes |
| Recovery | Verified feature kill switch and rollback |

Quality thresholds should be validated with representative Chennai network conditions and the actual production architecture.

---

## 8. Launch Checklist

### Product & Engineering
- [ ] Core user journeys approved
- [ ] Restaurant/menu integration verified
- [ ] Payment reconciliation and refunds tested
- [ ] Feature flags configured
- [ ] Production environment and database migrations validated
- [ ] Rollback plan rehearsed

### Quality & Security
- [ ] No P0 defects open
- [ ] P1 exceptions approved with workarounds
- [ ] Performance thresholds met
- [ ] Accessibility checks complete
- [ ] Security approvals obtained
- [ ] UAT sign-offs recorded

### Marketing & Operations
- [ ] Chennai pilot learnings incorporated
- [ ] Launch areas and merchant coverage confirmed
- [ ] Landing page and invitation copy approved
- [ ] Customer support FAQ published
- [ ] Support escalation and on-call roster ready
- [ ] Launch campaigns and communications scheduled

### Analytics & Post-Launch
- [ ] North Star dashboard operating
- [ ] Funnel events validated
- [ ] Payment anomaly alerts enabled
- [ ] First-day operational review assigned
- [ ] W13–W14 optimisation backlog prioritised

---

## 9. Release Decision & Next Steps

**Week 12 GA decision:** Launch only when the critical payment path, order reliability, security approvals, support readiness and launch gates are satisfied.

Use a controlled rollout by eligible users and verified Chennai restaurant coverage. Expand exposure only after payment health, checkout completion and reliability remain within approved limits.

**Success after launch means:**
1. Invited members become active Ownly customers.
2. Groups complete orders without manual payment chasing.
3. Hosts and members return to order together.
4. Weekly completed group orders increase without unacceptable payment or reliability failures.

**Roadmap principle:** Protect the core group-order and individual-payment experience before adding expansion features.
