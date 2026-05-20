# Ghoomar Thali ERP — Build Plan

## Context

Ghoomar Traditional Thali Restaurant — 100% pure veg Rajasthani unlimited thali chain. Currently 3 outlets (Delhi NCR, Guwahati, Patna). Daily rotating menu of 24+ dishes. Today runs on Excel + manual entry. Manager is tech-averse, so the system must be dead simple — 2-3 clicks per task, mobile-first, dropdowns over typing.

## Users

- **Outlet Manager** — daily data entry. Needs the simplest possible UX.
- **HQ / Owner** — analytics and cross-outlet visibility.

## Tech Stack

- Frontend: HTML / CSS / JS (existing base)
- Backend: Supabase (Postgres + Auth + Realtime)

## Architectural Decisions Locked In

- **Recipe / Ingredient Master = shared HQ-defined**, with per-outlet price variations
- **Menu is set the day before**, not real-time
- **Procurement is post-hoc data entry** (record what was bought), not predictive PO generation
- **Cover count auto-derives** from reservations + walk-ins, not manual entry
- **Billing is cover-based**, not per-dish

---

## Phase 0 — Foundation

Set up the spine before building any features.

- [ ] Define Supabase schema: `outlets`, `users`, `roles`
- [ ] Auth flow: outlet manager login vs HQ login
- [ ] Row-level security: managers see only their outlet, HQ sees all
- [ ] Seed 3 outlets (Delhi NCR, Guwahati, Patna)
- [ ] Shell layout: sidebar nav, outlet selector for HQ users

---

## Phase 1 — Master Data

The reference data everything else depends on. Build once, edit rarely.

- [ ] `dishes` table — master list of all Rajasthani dishes Ghoomar can serve
- [ ] `ingredients` table — master list of raw materials (besan, ghee, dal, etc.)
- [ ] `vendors` table — per outlet, suppliers they buy from
- [ ] `dish_ingredients` (optional v2) — recipe mapping for future cost-per-dish analysis
- [ ] Admin UI for HQ to add/edit dishes and ingredients
- [ ] Admin UI for outlet manager to manage their own vendor list

---

## Phase 2 — Daily Menu Planner

The "what are we serving tomorrow" workflow.

- [ ] `daily_menus` table — outlet_id, date, list of dish_ids
- [ ] Manager UI: pick tomorrow's date → multi-select dishes from master list → save
- [ ] Show yesterday's menu as a starting point ("repeat with edits")
- [ ] Public read endpoint that the menu.ghoomarthali.in page can consume
- [ ] HQ view: see all 3 outlets' menus for any given date

---

## Phase 3 — Daily Procurement Entry

Replaces the Excel pain point.

- [ ] `purchases` table — outlet_id, date, vendor_id, ingredient_id, qty, unit_price
- [ ] Manager UI: one screen, add row → pick vendor → pick ingredient → enter qty + price
- [ ] Auto-total at bottom (today's spend)
- [ ] "Copy yesterday's purchases" button for standing daily items
- [ ] HQ view: spend per outlet per day, trend over time

---

## Phase 4 — Reservations & Walk-ins

Every guest, regardless of channel, ends up in one table.

- [ ] `bookings` table — outlet_id, date, time, party_size, type (reservation/walk-in), occasion, jain_flag, guest_name, phone
- [ ] Manager UI: quick-add walk-in (party size + go), full form for reservations
- [ ] Today's bookings view — live list, mark as seated/completed/no-show
- [ ] Daily cover count auto-calculates from completed bookings

---

## Phase 5 — Billing

Cover-based, kept deliberately simple.

- [ ] `thali_prices` table — per outlet, thali type (Regular / Jain / Festival) → price
- [ ] `bills` table — booking_id, covers × price × tax
- [ ] Manager UI: select table/booking → pick thali type → covers auto-filled → generate bill
- [ ] Printable bill format
- [ ] Bill ties back to booking, closing the revenue loop

---

## Phase 6 — HQ Dashboard

The owner's bird-eye view. Build last because it depends on all prior data.

- [ ] Today snapshot: revenue, covers, food cost % per outlet
- [ ] Trend charts: 7/30/90 day comparisons across outlets
- [ ] Menu compliance: was today's planned menu actually what was sold?
- [ ] Food cost outlier alerts (e.g. "Patna spent 40% more on ghee today than usual")
- [ ] Export to CSV/PDF for accountant

---

## Phase 7 — Polish & Mobile

The tech-averse manager test.

- [ ] Mobile responsive pass on every manager-facing screen
- [ ] Replace every free-text field with a dropdown where possible
- [ ] Reduce every daily task to ≤ 3 clicks
- [ ] Offline-tolerant data entry (form holds value if network drops)
- [ ] One-screen daily summary for manager: "Here's today — covers, spend, revenue"

---

## Out of Scope (Explicit)

- Staff scheduling
- Per-dish a la carte ordering
- Auto-generated purchase orders
- Loyalty / CRM
- Live performance scheduling
- Kitchen display system
