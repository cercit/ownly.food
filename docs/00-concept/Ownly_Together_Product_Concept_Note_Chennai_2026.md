# Ownly Together — Product Concept Note

**Decision requested:** Approve a gated discovery and payment-feasibility investment, not an unconditional launch commitment.  
**Assessment date:** 24 October 2026  
**Product:** Ownly Together, proposed feature within Ownly / Rapido food-delivery ecosystem  
**Initial geography:** Chennai, India  
**Status:** Concept; customer and financial hypotheses not validated  
**Evidence conventions:** **Fact** = externally documented; **Owner observation** = project creator's lived experience; **Inference** = reasoned interpretation; **Assumption** = unmeasured modeling input; **Recommendation** = proposed decision.

## 1. Executive Summary

**Recommendation: PROCEED WITH VALIDATION.** Group meals create a plausible acquisition opportunity for Ownly's Chennai expansion: one host invites up to eleven other people, and a shared cart can turn an offline WhatsApp coordination task into an in-app journey. However, shared carts already exist at Swiggy and Zomato; the distinctive proposition must be **each member pays a transparent, accurate share** without the host fronting the whole bill.

| Dimension | Leadership judgment |
|---|---|
| Problem | Hosts coordinate menu choices, pay upfront and chase reimbursement. |
| Customer | Office lunch organisers, flatmates, hostel groups; members as co-decision-makers. |
| Proposed experience | Up to 12 people, one cart, selected split rules, individual settlement, repeat groups. |
| Opportunity | Invite-led acquisition, completed group orders, retention and possibly greater basket value. |
| Value | Less coordination and payment chasing; potential new transacting users. |
| Core risk | Multi-payer settlement may be expensive, slow or incompatible with provider operations. |
| Commercial risk | Group payment costs without proven incremental revenue or new orders. |
| Decision | Validate real demand, partner architecture and brand-pricing consistency first. |

**Three material issues to resolve:** (1) Ownly publicly promises **no packaging fee**, while the draft PRD charges ₹15/₹30 per dish; (2) payment-provider features labeled “partial payment” or “split settlement” do **not** prove that the proposed 12-payer UPI flow is supported; (3) prior Chennai TAM/SAM/SOM values are *scenario outputs*, not market observations. [S1, S7, S8, S10]

## 2. Product & Problem

**Overview.** Ownly is a Rapido-associated zero-commission food-delivery business. Its Bengaluru/Hyderabad expansion and use of Rapido's logistics network are documented; Chennai-specific restaurant availability and launch readiness remain unverified for this concept. [S1, S2]

**Problem statement (owner observation, not yet measured).** A group organiser collects individual preferences on WhatsApp, re-enters meals into a delivery app, pays for the whole order, and spends time collecting UPI reimbursements. Mistakes, late additions, uncertain charges and unreturned money create effort and resentment.

**Root causes:** messaging is disconnected from cart state; only one person owns checkout; personal liabilities are not calculated transparently; reminders and reconciliation take place across apps; the process repeats each meal.

**Why now?** India's online food-delivery market has grown and industry forecasts suggest further expansion, while shared-cart behaviour is already supported by major platforms. The opportunity is a *better financial workflow*, not novelty in group ordering. [S3, S4, S5]

**Alternatives:** WhatsApp + separate transfers, ordering individually, host-paid group carts on food apps, or in-person canteen ordering.

**Jobs to be done:**
- Host: “When coordinating lunch, help everyone choose and settle their share so I don't front costs or chase friends.”
- Member: “When invited to order, let me select my dishes and verify the exact total before paying.”
- Group: “When we order regularly, let us repeat together with less setup.”

## 3. Users & Personas

*The personas were previously created for discovery; they are hypothetical, not validated interview evidence.*

| Dimension | Primary host: Arjun | Secondary member: Priya |
|---|---|---|
| Context | Office lunch organiser; OMR | Flatmate / early-career participant; Velachery / T. Nagar |
| Job | Coordinate 4–12 meals and close payments | Select the right food and pay a fair amount |
| Pains | Message overload; manual cart; paying for others | Invisible choices; uncertain bill; unfamiliar-app friction |
| Gains | Less effort; no unreimbursed balance | Autonomy; price clarity; fast joining |
| Current → desired | WhatsApp, manual cash collection → shared ordered cart and settlement | Message requests → self-selection and verified personal payment |

**Other users:** students in hostels, weekend gathering organisers and irregular group participants. **Decision structure:** the host initiates, but every additional participant has to trust and complete an independent journey; group acquisition is not guaranteed by a link being shared.

## 4. Market & Competition

### Market opportunity: illustrative, not validated

A historical Chennai Metropolitan Area *2026 planning projection* is **125.82 lakh** people; it is not a current census reading and geographic definitions may differ from commercial launch areas. [S9]

**Prior base model assumptions:** age 18–39 = 40%; online delivery use = 40% of that cohort; group participation = 30%; seven-area reach = 25%; first-year adoption of reachable users = 7%; four members/group; 0.75 group orders/week; ₹1,100/group basket. These rates are hypotheses.

| Level | Calculation | Users | Annualised GMV at mature modeled activity |
|---|---|---:|---:|
| **TAM** | 1.26 crore × 40% × 40% × 30% | ~6.05 lakh | ~₹648.65 crore |
| **SAM** | TAM × 25% reachable | ~1.51 lakh | ~₹162.16 crore |
| **SOM** | SAM × 7% adoption | 10,584 | ~₹11.35 crore |

`GMV = (active participants / 4) × 0.75 weekly orders × ₹1,100 × 52`. SOM implies ~1,985 completed orders/week *if* all assumed activity and completion are achieved. This is an **annualised steady-state run rate**, **not launch-year realised GMV, Ownly revenue, or forecast**. A ramp-up requires cohort modelling; the seven-area share must be validated with geographic data.

| SOM scenario | Adopted users | Orders/week | Annualised GMV |
|---|---:|---:|---:|
| Conservative: 3% SAM conversion, 0.5/week, ₹900 basket | 4,536 | 567 | ₹2.65 Cr |
| Base: 7%, 0.75/week, ₹1,100 | 10,584 | ~1,985 | ₹11.35 Cr |
| Optimistic: 12%, 1/week, ₹1,300 | 18,144 | 4,536 | ₹30.66 Cr |

### Competitive evidence

| Alternative | Documented strength | Product implication / uncertainty |
|---|---|---|
| Swiggy | Group ordering launched in 2024; multi-restaurant single checkout announced October 2026 [S3, S4] | Shared carts alone are table stakes; per-person settlement not confirmed. |
| Zomato | Link-based group ordering announced in August 2024 [S5] | Invites and collaborative carts are not distinctive. |
| EatSure | Group-order guidance on a QA-domain FAQ describes host paying; split payments labelled coming soon [S6] | Directionally relevant but **not reliable proof of live production capabilities**. |
| WhatsApp + UPI | Familiar, widespread, flexible manual workaround [S11] | Very low onboarding friction; high coordination costs for hosts. |

**Opportunity:** Position on *accurate individual payment and group completion*, plus reordering. **Competitive risk:** well-funded incumbents could replicate the payment workflow if it proves valuable.

## 5. Product Strategy

**Vision:** Sharing a meal should not mean sharing payment anxiety.  
**Mission:** Make a group order as easy to finish as a solo order, while every participant retains control over their items and payment.

**Value proposition:** **Order Together. Pay Your Share. No More Chasing.**

**Strategic thesis (inference):** A WhatsApp link can recruit multiple group members into a single Ownly order. If these are *incremental* customers who transact again, group ordering might lower acquisition cost and increase repeat frequency. Neither result is yet measured.

**Why Ownly might win:** existing consumer app, restaurant operations and Rapido-linked delivery capacity; an advertised pricing-first brand. **Why Ownly might lose:** mature competitor carts, merchant/restaurant coverage, fragile payments, high OTP friction, or cost per multi-payer order.

**Long term:** recurring groups, recurring office lunch occasions and potentially merchant group catering. Defer broad functionality until the payment and retention wedge is proven.

## 6. Proposed Solution

### Future-state experience

Host creates a named order → shares a WhatsApp invite → up to 11 others sign in with emailed one-time code → each member selects dishes → host chooses one of two allocation policies → group sees immutable per-member amount previews → cart locks → each member completes an individually authorized payment → the provider confirms settlement/merchant funding → everyone sees final status and their audit history → the group can reorder.

**Two host-selected split policies:** (a) **Pay for what you ordered:** own dishes plus equal shares of opted-in shared dishes and shared charges; (b) **Split everything equally** across participating members. Define discount allocation, rounding, item cancellations, membership changes and late joiners *before* launch. Host may choose a policy, not override taxes or fees.

| Capability | User problem → Solution → Expected value | Priority |
|---|---|---|
| Group creation and link invitation | Manual coordination → shareable group with max 12 members including host → fewer repeated messages | P0 |
| Passwordless email-code sign-in | Need unique participant identity → expiring, rate-limited code verification → accountable participants (but added friction) | P0 |
| Shared cart and live status | Lost selections → member-attributed items, versioning and cart cutoff → fewer mistakes | P0 |
| Deterministic split calculator | Ambiguous obligations → auditable cost allocations and exact totals → fairness and trust | P0 |
| Individual payment | Host fronts entire bill → each participant pays their verified share → no host-funded balance if feasible | **P0 / feasibility gate** |
| Group audit log | Disputes about who changed what → append-only timestamped group history → explainability | P0 |
| Cash-to-host ledger | Some pay offline → distinguish cash *received by host* from merchant *funded* → accurate status | P1 / pilot-gated |
| Saved group / reorder | Repeated setup → reuse member roster, not prior consent/payment → repeat use | P1 |

**MVP:** one restaurant per group; maximum 12 authenticated participants; live shared cart; one host-selected split method; provider-approved UPI payments (including host); accurate final status; basic cash tracking *only if reconciled safely*; append-only audit trail. No password or customer-facing demo accounts per the draft rules. Internal test fixtures may exist in nonproduction environments.

**Out of scope:** multi-restaurant orders, subscriptions, advanced recommendations, wallet/credit, automatic purchase without fresh consent, editable statutory charges, arbitrary cash reconciliation, and unverified delivery-fee marketing claims.

**Edge cases requiring signed-off specifications:** unpaid member at cutoff; partial group funding; duplicate callback/charge; abandoned member; refunds after a payer exits; restaurant rejection; shared dish eaten by subset; tax rounding to paise; coupon distribution; changed group split after a payment; multiple devices; expired invite; cancelled order; cash collected but not remitted; provider settlement failure.

**Critical policy conflicts:** The draft fixes **₹20/km delivery**, **₹15 or ₹30 per-dish packaging** and **5% food GST**. These are *proposed rules*, not verified Ownly commercial policies. Ownly's public **no-packaging-fees** promise conflicts directly, and some restaurant-service tax classifications differ; obtain Product, Finance, Tax, Legal and restaurant-partner approval. [S1, S12]

## 7. Business Case

**Value pools:** (1) genuinely new customers from referral links; (2) retention and frequency uplift; (3) operational time saved and lower order errors; (4) potentially more orders per serviced restaurant; (5) restaurant subscription value *if proven*, not automatically attributable to every order.

**Monetisation:** Ownly has publicly described a zero-restaurant-commission proposition; reports have differed on its subscription versus delivery-cost recovery emphasis. **No group-order fee or take rate is assumed.** GMV ≠ revenue ≠ gross profit. [S1, S2]

**Cost drivers:** delivery fulfilment; payment acceptance/processing per payer; support and refunds; SMS/email OTP; abuse controls; maintenance, fraud prevention, restaurant operations and acquisition incentives.

**Contribution model:** `Incremental contribution = incremental retained delivery revenue + attributable merchant monetisation – incremental logistics costs – extra payment fees – support/refunds – incentives – incremental operations`. Use **causal incremental orders** rather than all group-order GMV as value.

**Illustrative sensitivity only:** Four payments instead of one produce three additional payment transactions. If incremental cost is **hypothetically ₹1.50/extra transaction**, that is ₹4.50/order; at ~1,985 group orders/week, annualised additional processing cost is ~₹4.64 lakh. **This is neither a quoted processor fee nor full cost**. Validate actual fee structure, settlement/escrow treatment and refund fees with provider.

**Build vs buy vs partner:** Build group-cart, allocation logic and audit history in Ownly systems; **partner** with an appropriately licensed payments provider for customer payments, refunds and settlement; buy/use existing infrastructure for authentication, messaging, observability and analytics. Do not build proprietary payment aggregation without appropriate authorisation.

**Cannibalisation:** existing Ownly users could shift solo orders to joint orders, reducing net order count; multi-payer transactions might increase operating cost with no incremental demand. Measure both groups and incremental users/orders against matched cohorts.

## 8. Metrics & Validation

**North Star:** **Completed group orders per week** — distinct orders delivered and financially reconciled (excluding test, cancelled and duplicate orders). Distinguish delivered/settled from merely checkout initiated.

| Metric | Operational definition |
|---|---|
| Invite activation | New signed-in participants ÷ unique invite recipients opening valid link |
| Group activation | Groups with ≥2 joined members ÷ groups created |
| Group completion | Delivered, fully reconciled group orders ÷ submitted groups |
| Payment reliability | Successful settled payer obligations ÷ payable obligations |
| Repeat | Hosts/groups with another completed order in following 7 or 28 days |
| Incremental adoption | New *transacting* users attributable to invite vs control, not raw clicks |
| Unit economics | Incremental contribution margin per group order and acquired customer |
| Guardrails | Checkout errors, payment/refund delays, unresolved balances, complaint rate, missed delivery SLO, OTP dropoff |

### Validation experiments (thresholds are proposed decision criteria, not industry facts)

| Hypothesis | Experiment | Metric and provisional success criterion | Decision |
|---|---|---|---|
| Group coordinators face repeated costly friction | 6 host + 6 member interviews; last-order walkthroughs, independent behavioural diaries | Repeated concrete pain across relevant segments; evidence of material time/money cost | If uncommon/low stakes: **rework** value proposition |
| Invite-based onboarding is feasible | Clickable prototype with real groups, compare WhatsApp link → email code vs lighter approved identity flow | ≥60% invited participants finish sign-in and add an item in moderated trials | If dropoff concentrated at email: **redesign** identity |
| Split payments are reliable | Provider sandbox then controlled real-money pilot; test 2–12 payer scenarios | 100% ledger reconciliation; no double charge; ≥95% payment completion among consenting payers | If no acceptable provider settlement model: **stop** multi-payer build |
| Hosts and members genuinely prefer new flow | ~50 consenting pilot groups, mixed segments; compare with manual process | Majority host time savings confirmed by time diary, fewer unresolved balances, no trust regressions | Iterate or stop if burden merely moves to members |
| Group orders generate incremental customers | Invitation cohort vs suitable geographic/host control | Higher incremental first completed orders, **not just app installations** | Scale only if acquisition economics promising |
| Groups repeat | 28-day observed pilot follow-up | Positive repeat signal; initial hypothesis D7 host repeat ≥20% | Rework retention if first use doesn't repeat |

**Instrumentation:** group_created, invite_opened, sign_in_completed, member_joined, item_added, split_selected, cart_locked, payer_checkout_started, payment_succeeded, payment_failed, merchant_accepted, order_delivered, group_reconciled, cash_recorded, refund_completed, reorder_started. Avoid storing secrets in analytics.

## 9. Risks & Constraints

| Risk | Impact | Likelihood* | Mitigation |
|---|---|---|---|
| No viable compliant 12-payer checkout/settlement | Critical | High uncertainty | Payments discovery first; written provider architecture approval |
| Packaging-price contradiction | High | Certain conflict in draft | Resolve PRD with Ownly brand/merchant and legal owners |
| Invite-to-email-OTP abandonment | High | Medium-high | Observe prototype funnel; simplify approved sign-in |
| Partial member payment / timeout | Critical | Medium-high | Locked cart, idempotency, clear timeout and cancellation policies |
| Cash ledger misinterpreted as restaurant settlement | High | Medium | Dual-status ledger; no “paid restaurant” without verified remittance |
| Bad tax/fee calculation | High | Medium | Configurable tax engine with Finance/Tax sign-off, paise-level testing |
| No merchant density in Chennai pilot areas | High | Unverified | Restaurant coverage readiness before marketing |
| Competing group-cart features | Medium-high | Certain | Focus on payment and completion wedge |
| Abuse from uncapped sign-ups/order value | High | Medium | Rate limits, fraud controls, provider transaction limits; no unlimited operational guarantees |
| Inaccurate or exposed group order history | High | Medium | Member-scoped access control, encrypted logs, retention policy |
| Aggressive 12-week timeline | High | Medium-high | Gate go/no-go by payment sign-off; restrict MVP scope |

*Likelihood is subjective assessment, not measured probability.*

**Single assumption that can invalidate the concept:** Ownly can collect individual payments from all participating members, accurately reconcile them to one order and settle restaurant obligations legally and reliably, without unacceptable friction or costs.

## 10. Responsible Product Considerations

**Privacy/data minimisation:** Each member sees only necessary group-order details. No card numbers, CVVs or UPI PINs stored; protect email codes and share links; suppress personal identifiers from preview URLs; restrict group audit-log access. Retain essential financial records under an approved policy.

**Security:** Server-side price authority, idempotent charges, webhook signature validation, expiry/rotation of invites, OTP rate limits and fraud detection; tamper-evident append-only logs; granular member/host permissions. “Nobody can edit the audit log” is a system requirement, not evidence that backups or administrators are literally incapable of changes.

**Accessibility and fairness:** WCAG-aligned controls; clearly distinguish cash-received versus merchant-settled; show fee allocation before consent; Tamil-ready strings, low-bandwidth behaviour and error recovery.

**Regulation:** RBI's September 2025 Payment Aggregator Directions are relevant to fund flows and providers [S13]. NPCI discontinued P2P UPI *collect requests* effective October 2025, so do not design around unsupported P2P pull requests [S14]. The Digital Personal Data Protection rules have phased commencement, making privacy engineering prudent ahead of later operative dates [S15]. GST food and delivery treatments depend on actual service/tax classification, not a universal hardcoded flat percentage [S12]. Obtain specialist legal/tax sign-off.

**AI/model risk:** No AI capabilities are in scope, so generative-AI safety is not a primary product risk.

## 11. GTM & Rollout

**Beachhead:** Office lunch groups in OMR and Velachery, then flatmate/hostel contexts in T. Nagar, Adyar, Anna Nagar, Nungambakkam and Mylapore *where merchant coverage supports launch*. These are research hypotheses, not verified micro-market sizes.

**Positioning:** “Order Together. Pay Your Share. No More Chasing.” Demonstrate the *actual* split and payer-confirmation workflow, without implying launch completion or unapproved prices.

**Acquisition:** host starts an order → shares a WhatsApp deep link → invited member lands in the exact group → completes sign-in → selects meal → pays → is eligible to host a subsequent group. Use optional QR links for workplaces after observing demand.

**Channels:** WhatsApp invitations, app referrals, restaurant co-promotion, office/community outreach and professional-network content. Paid campaigns are secondary until funnel/unit economics are proven.

| Rollout phase | Audience | Success gate |
|---|---|---|
| Discovery | Chennai hosts and members | Evidence that problem is frequent, consequential and undertreated |
| Internal Alpha | Employees/test environments | Reliable core flow, audited split calculations, no critical crashes |
| Controlled Beta | ~50 consenting groups in supported areas | Correct settlement; strong invite completion; observable host time saving |
| UAT | Cross-functional reviewers | Zero P0, accepted P1 exceptions, legal/finance/payment sign-offs |
| Phased GA | Approved merchant-covered Chennai clusters | Stable payments, support, retention and positive incremental economics |

**Retention:** saved groups and repeat-order invitations; avoid automatic charges or reusing past consent. Host and members must explicitly review new items and payments.

## 12. Outcome-Based Roadmap

The earlier project proposed a **12-week plan without fixed dates**. Treat its sequencing as a planning envelope, **not a credible guarantee that payment approvals will be completed**.

| Phase | Objective | Key capabilities | Expected outcome |
|---|---|---|---|
| Discovery & feasibility (W1–2) | Prove user value and viable fund flow | Interviews, flow specs, partner legal/technical review, pricing resolution | Evidence-backed scope and go/no-go |
| Alpha (W3–4) | Establish core usability | Invite, email-code identity, cart, mock allocation and logs | Employee dogfood and clear defects |
| Payments build (W5–6) | Test actual settlement | Provider-controlled payments, refunds, reconciliation and auth | Secure, testable end-to-end flow |
| Limited Beta (W7–8) | Test acquisition and completed orders | Flags, pilot merchant feed, payer tracking, support | Real cohorts and retention signals |
| UAT (W9–10) | Validate production readiness | Security, perf, accessibility, refund and settlement tests | Approved release candidate |
| Controlled GA readiness (W11–12) | Release safely *if gates pass* | On-call, runbooks, rollback, launch operations | Phased deployment or no-go decision |

If settlement approval slips, delay GA or ship a **non-money-moving collaborative-cart experiment** rather than simulating successful payment.

## 13. Strategic Trade-offs

| Trade-off | Recommended choice | Rationale |
|---|---|---|
| Reach vs friction | Prefer approved lightweight entry; test email OTP | App/OTP steps can kill viral loop |
| Feature scope vs trustworthy payments | Prioritise payments and audit | Differentiation depends on financial reliability |
| Configurable split vs fairness | Two well-specified modes; immutable post-lock | Avoid disputes and hidden reallocations |
| Fast launch vs regulatory readiness | Delay payment GA if needed | Payment mistakes cost disproportionate trust |
| Monetisation vs transparent pricing | Preserve Ownly's approved public promise | Packaging charge conflict cannot be hidden in UI |
| Cash flexibility vs verifiable state | Pilot-gate cash; distinct statuses | Offline cash is not the same as digital settlement |
| Acquisition volume vs incremental value | Reward first completed, repeat orders | Invitations/signups alone can inflate vanity metrics |

## 14. Executive FAQ

**Why this?** Group ordering exposes real coordination and reimbursement pain, but local frequency is not yet established.

**Why now?** Ownly is expanding and competitors already recognise collaborative ordering as a use case. [S2–S5]

**Why Ownly?** Existing app, possible delivery network leverage, and pricing-oriented positioning; Chennai operational fit still requires verification.

**Why will customers adopt?** Only if they can join easily, choose autonomously and complete trustworthy individual checkout with less total effort.

**Why won't competitors win?** They may. Ownly needs sharper payment execution and simpler repeat groups; no permanent moat is assumed.

**What evidence supports this?** Owner observations, competitor product documentation, industry data, payment and regulatory documentation. **No completed Chennai field study or pilot data yet.**

**Biggest risk?** No feasible and economical compliant multi-payer settlement.

**Smallest version worth building?** Single-restaurant group cart plus transparent split calculator and provider-approved payer checkout; if checkout is blocked, a prototype/experiment, not a pretend live payment service.

**If we do nothing?** Hosts continue using existing messaging/payment workarounds; Ownly could miss a differentiated launch acquisition experiment, but avoids payment complexity.

**What would stop investment?** No payment provider approval, irreconcilable pricing conflict, low observed user pain, weak invite conversion, or negative incremental unit economics.

## 15. Final Recommendation

**Decision: PROCEED WITH VALIDATION — CONDITIONAL.** The idea has plausible user value and a distribution mechanism, but the proposed packaging fees, identity friction, payment architecture and real Chennai group demand are unresolved.

**Authorize now:** targeted field interviews; a moderated end-to-end prototype; written payment architecture and legal/tax review; Chennai merchant coverage audit; a small controlled experiment with explicit go/no-go thresholds.

**Do not authorize yet:** fixed public launch claims, broad paid GTM, building a proprietary payment aggregator, or committing full-scale engineering effort based on the speculative TAM.

**Immediate next step:** convene PM, Payments, Finance/Tax, Legal, Engineering and Ownly brand owners to approve one compliant **money-flow and pricing decision record**. In parallel, run the already drafted 6-host/6-member interview plan.

## 16. Assumptions & Sources

| Assumption | Importance | Confidence | How to validate |
|---|---|---|---|
| Chennai group-order pain is frequent and costly | Critical | Low | Interviews, diaries and observed last-order reconstruction |
| Share links bring *incremental* transacting users | Critical | Low | Referral attribution, matched control |
| Group checkout with 2–12 independent UPI payers is feasible | Critical | Unknown | Written processor/settlement proof, live sandbox and pilot |
| Published no-packaging-fees policy can align with proposed PRD | Critical | Conflict known | Brand, restaurant, finance and tax approval |
| Email-code onboarding is acceptable | High | Low | Prototype funnel and abandoned-flow interviews |
| Chennai SAM reaches ~1.51 lakh people | High | Low | Local geo/restaurant/frequency data |
| Four-person groups average 0.75 orders/week and ₹1,100 basket | High | Low | Survey and actual pilot orders |
| Group reordering produces retention | Medium-high | Low | D7/D28 cohorts compared with baseline |
| Cash can be recorded and settled accurately | High | Unknown | Finance/legal accounting and operational pilot |
| Existing Rapido logistics reduce incremental cost | High | Medium inference | Service-level and marginal-cost analysis |

### Research sources and reliability notes

- **[S1] Ownly official:** [Ownly Promise](https://ownly.food/hyd) — public brand claims, notably no packaging/platform/surge fees; direct company source, subject to change.
- **[S2] PTI, Sept 25 2026:** [Rapido Ownly expansion](https://theprint.in/economy/rapido-launches-ownly-in-hyderabad-plans-to-scale-food-delivery-service-to-all-metros-in-oct-dec/3053693/) — management statements regarding Hyderabad, expansion, restaurant network.
- **[S3] Swiggy primary, Aug 2024:** [How Swiggy built Group Ordering](https://blog.swiggy.com/life-at-swiggy/heres-how-swiggy-built-the-group-ordering-feature/) — collaborative group cart evidence.
- **[S4] Oct 2026:** [Swiggy multi-restaurant feature](https://retail.economictimes.indiatimes.com/news/e-commerce/e-tailing/swiggy-launches-multi-restaurant-ordering-feature-across-720-plus-cities/134963163) — a single payer checkout, not evidence of split payments.
- **[S5] Zomato founder, Aug 2024:** [Group ordering launch post](https://www.linkedin.com/posts/deepigoyal_exciting-new-weekend-update-group-ordering-activity-7230524000387395584-TaRW) — shared group invitation/cart.
- **[S6] EatSure QA-domain FAQ:** [Host payment and future split guidance](https://web.qa.behrouzbiryani.com/faq) — nonproduction domain; **not production verification**.
- **[S7] Razorpay docs:** [Partial payments](https://github.com/razorpay/markdown-docs/blob/master/payments/payment-links/partial-payments.md) — documented limitations for UPI payment links.
- **[S8] Razorpay:** [Route marketplace settlements](https://razorpay.com/route/) — splitting received funds to sellers is not the same as collecting separately from multiple customers.
- **[S9] CMDA Second Master Plan data:** [Chennai planning population](https://data.opencity.in/dataset/chennai-master-plan-2026/resource/b0011f3e-bf0c-40aa-879a-df5fcd20c887/proxy) — *projection*, not current count.
- **[S10] Swiggy placement document, Dec 2025:** [Redseer category outlook](https://www.swiggy.com/corporate/wp-content/uploads/2025/12/Swiggy-Limited-Placement_Document.pdf) — secondary industry forecast, not Ownly demand.
- **[S11] NPCI:** [UPI statistics](https://www.npci.org.in/product/upi/product-statistics) — national payment context, not proof of customer appetite for group checkout.
- **[S12] CBIC:** [Goods and Services Tax rates](https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html) — qualifying restaurant tax treatments and exceptions.
- **[S13] RBI:** [Payment Aggregators Directions press release (2025)](https://www.fidcindia.org.in/wp-content/uploads/2025/09/RBI-PAYMENT-AGGREGATORS-DIRECTIONS-PRESS-RELEASE-15-09-25.pdf) — regulatory oversight; specialist review needed.
- **[S14] NPCI circular (reproduced):** [Discontinuation of P2P Collect Requests](https://avantiscdnprodstorage.blob.core.windows.net/legalupdatedocs/45492/NPCI-issued-a-notification-regarding-the-discontinuation-of-the-service-of-UPI-Collect-Request-for-Person-to-Person-transactions-August122025.pdf) — official circular copy, verify with provider.
- **[S15] India Gazette notification:** [DPDP phased commencement](https://egazette.gov.in/WriteReadData/2025/267647.pdf) — authoritative statutory commencement dates.

**Evidence boundary:** Previously produced personas, journey maps, pilot metrics and scenario analyses are **concept artifacts**, not customer observations. Their contents inform hypotheses, not market facts. This note is not legal or tax advice.
