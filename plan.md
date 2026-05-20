# Universal Restaurant Stock Tracker - Phased Build Plan

## Product Direction

Build a stock-only backend ERP prototype for a single restaurant owner.

The product helps owners who currently manage purchases and stock through WhatsApp messages, bill photos, and informal staff updates. The main pain is that supplier bills are hard to verify, stock is not tracked cleanly, and staff can inflate purchases or quantities without the owner noticing.

This prototype should work for any restaurant, cafe, bakery, cloud kitchen, bar, or food business because every food business buys stock, receives supplier bills, and needs inventory control.

## Product Promise

> Upload or paste supplier bills, and the system turns them into stock entries, purchase history, vendor price records, and suspicious bill alerts.

## Primary Users

- **Owner / Operator**
  - Reviews stock, purchases, vendors, and suspicious bills.
  - Approves bills before they affect stock.
  - Wants simple visibility without manual spreadsheet work.

- **Staff / Manager**
  - Uploads or pastes bills.
  - Can submit purchase details for owner review.
  - Should not be able to silently change approved history.

## Explicit Scope

## In Scope

- Single-outlet stock tracking
- Supplier bill capture
- Purchase register
- Stock item master
- Vendor master
- Stock ledger
- Manual usage, wastage, and correction entries
- Price history
- Suspicious bill alerts
- WhatsApp-style bill paste simulation

## Out of Scope

- Sales
- POS
- Customer billing
- Reservations
- Menu planning
- Multi-outlet operations
- Full accounting
- Auto-generated purchase orders

---

# Phase 0 - Product Reframe

## Goal

Remove the restaurant ERP/menu planner direction and lock the app around one job: stock tracking from supplier bills.

## Build

- [x] Rename the product concept to stock tracker / stock control system.
- [x] Remove menu planning from visible copy.
- [x] Remove multi-outlet language from visible UI.
- [x] Replace HQ/outlet framing with owner/staff framing.
- [x] Rewrite demo story around WhatsApp bills, stock visibility, and inflated bill detection.

## Deliverable

A clear prototype brief and UI direction focused only on stock.

## Success Criteria

- A restaurant owner can understand the product in under 30 seconds.
- No visible screens imply sales, menus, customer billing, or multi-outlet workflows.

---

# Phase 1 - Core Data Foundation

## Goal

Create the minimum backend structure needed for stock tracking.

## Build

- [x] Create `users`.
- [x] Create `roles` or simple user type: owner/staff.
- [x] Create `stock_items`.
- [x] Create `vendors`.
- [x] Create `purchase_bills`.
- [x] Create `purchase_bill_items`.
- [x] Create `stock_movements`.
- [x] Create basic RLS policies.

## Suggested Tables

## `stock_items`

- id
- name
- category
- default_unit
- low_stock_threshold
- is_active
- notes

## `vendors`

- id
- name
- contact_name
- phone
- category_supplied
- notes
- is_active

## `purchase_bills`

- id
- vendor_id
- bill_date
- bill_number
- source
- original_text
- file_url
- subtotal
- extra_charges
- total
- status
- created_by
- approved_by
- approved_at

## `purchase_bill_items`

- id
- purchase_bill_id
- stock_item_id
- raw_item_name
- quantity
- unit
- unit_price
- line_total
- confidence_score
- match_status

## `stock_movements`

- id
- stock_item_id
- movement_type
- quantity
- unit
- source_bill_item_id
- notes
- created_by
- created_at

## Deliverable

Supabase schema for stock items, vendors, bills, bill lines, and stock movement history.

## Success Criteria

- Owner/staff users can be represented.
- Purchases can be stored.
- Stock can be calculated from movements.
- Every stock increase can be traced back to a bill line.

---

# Phase 2 - Stock Item & Vendor Master

## Goal

Let the owner maintain the master data required before bill tracking works.

## Build

- [ ] Build Stock Items screen.
- [ ] Add/edit stock item.
- [ ] Set category, unit, and low-stock threshold.
- [ ] Activate/deactivate item.
- [ ] Build Vendors screen.
- [ ] Add/edit vendor.
- [ ] Store vendor contact details and notes.
- [ ] Seed generic demo data.

## Demo Stock Items

- Tomatoes - Vegetables - kg
- Onions - Vegetables - kg
- Paneer - Dairy - kg
- Cooking Oil - Dry Goods - litre
- Rice - Dry Goods - kg
- Flour - Dry Goods - kg
- Chicken - Meat / Protein - kg
- Paper Containers - Packaging - pieces
- Cleaning Liquid - Cleaning Supplies - litre

## Demo Vendors

- Fresh Market Supplier
- Daily Dairy Partner
- City Dry Goods
- Packaging Depot
- Kitchen Cleaning Supply Co.

## Deliverable

Working master data UI for inventory items and suppliers.

## Success Criteria

- Owner can add a new stock item.
- Owner can add a new vendor.
- Purchase bill entry can use dropdowns instead of free typing for known items/vendors.

---

# Phase 3 - Manual Purchase Bill Entry

## Goal

Allow the owner or staff to enter supplier bills manually before automation.

## Build

- [ ] Build Purchase Register screen.
- [ ] Build Add Bill form.
- [ ] Select vendor.
- [ ] Add bill date and bill number.
- [ ] Add multiple line items.
- [ ] Select stock item, quantity, unit, unit price.
- [ ] Auto-calculate line totals.
- [ ] Auto-calculate bill total.
- [ ] Save as draft.
- [ ] Approve bill.
- [ ] On approval, create stock movements.

## Bill Statuses

- Draft
- Pending Review
- Approved
- Rejected

## Deliverable

Manual purchase bill workflow from entry to approval to stock update.

## Success Criteria

- A full supplier bill can be entered.
- Bill totals are calculated automatically.
- Approved bills increase stock.
- Rejected bills do not affect stock.

---

# Phase 4 - Stock Dashboard & Ledger

## Goal

Give the owner immediate visibility into current stock and recent movement.

## Build

- [ ] Build Stock Dashboard.
- [ ] Show current stock value.
- [ ] Show low-stock items.
- [ ] Show recent purchases.
- [ ] Show recent stock movements.
- [ ] Build Stock Ledger screen.
- [ ] Filter ledger by item and date.
- [ ] Add manual movement form.
- [ ] Support opening stock, usage, wastage, return, and correction.

## Movement Types

- Opening Stock
- Purchase Added
- Usage
- Wastage
- Return to Vendor
- Correction

## Stock Formula

`opening + purchases - usage - wastage - returns + corrections`

## Deliverable

Owner can see current stock and the full movement history behind every item.

## Success Criteria

- Current stock updates after bill approval.
- Owner can manually record usage or wastage.
- Low-stock indicators work from item thresholds.
- Every stock number has traceable movement history.

---

# Phase 5 - WhatsApp-Style Bill Capture

## Goal

Make data entry feel like the owner's current workflow: paste a WhatsApp bill and review the extracted result.

## Build

- [ ] Build Bill Capture screen.
- [ ] Add chat-style input for pasted bill text.
- [ ] Parse vendor name, date, item lines, quantities, rates, and totals.
- [ ] Show extracted bill preview.
- [ ] Auto-match extracted item names to stock items.
- [ ] Let owner correct vendor, item matches, quantities, units, and rates.
- [ ] Save original pasted text for audit.
- [ ] Submit extracted bill as Pending Review.

## Example Input

```text
Fresh Market Supplier
Tomato 10 kg x 42 = 420
Onion 8 kg x 30 = 240
Paneer 5 kg x 280 = 1400
Total 2060
```

## Deliverable

A demo-ready WhatsApp bill capture workflow.

## Success Criteria

- Owner can paste bill text.
- System creates editable draft bill lines.
- Original message is preserved.
- Confirmed bill follows the same approval and stock update flow as manual entry.

---

# Phase 6 - Price History

## Goal

Show the owner whether today's purchase price makes sense.

## Build

- [ ] Show last purchase price per item.
- [ ] Show average purchase price per item.
- [ ] Show highest and lowest recent price.
- [ ] Show vendor-wise price comparison.
- [ ] Show item price trend over time.
- [ ] Add vendor detail page with purchase history.
- [ ] Add stock item detail page with price history.

## Deliverable

Owner can compare vendor prices and identify expensive purchases.

## Success Criteria

- Owner can answer: "What did I pay for this item last time?"
- Owner can compare the same item across vendors.
- Price history is derived from approved purchase bill items.

---

# Phase 7 - Suspicious Bill Alerts

## Goal

Detect simple fraud and mistake patterns that are easy to explain in a demo.

## Build

- [ ] Create `bill_alerts`.
- [ ] Detect price jumps above configured percentage.
- [ ] Detect duplicate bill numbers.
- [ ] Detect bill total mismatch.
- [ ] Detect unusually high quantities.
- [ ] Detect unknown vendors.
- [ ] Detect unknown item names.
- [ ] Detect unexpected unit changes.
- [ ] Build Alerts screen.
- [ ] Let owner mark alerts as accepted, rejected, or resolved.

## Alert Examples

- Tomato price increased 42% compared to last purchase.
- Same bill number was already uploaded last week.
- Cooking oil quantity is 3x higher than usual.
- Bill total is higher than the sum of item lines.
- Vendor name not found in approved vendor list.

## Deliverable

Suspicious bill detection and review workflow.

## Success Criteria

- Every alert has a plain-language explanation.
- Alerts appear before or during owner approval.
- Owner can resolve alerts without deleting the purchase history.

---

# Phase 8 - Bill Upload / OCR Simulation

## Goal

Support the realistic bill-photo workflow without needing full OCR in the first version.

## Build

- [ ] Add bill image/PDF upload UI.
- [ ] Store uploaded file reference.
- [ ] Show uploaded bill beside extracted/manual lines.
- [ ] Add mocked OCR output for demo samples.
- [ ] Let owner edit OCR results before approval.

## Later Integration

- OCR service
- WhatsApp Business API
- Automated document extraction
- Item alias learning

## Deliverable

Upload flow that demonstrates how bill photos become stock entries.

## Success Criteria

- Owner can attach a bill image/PDF to a purchase.
- Demo can show extraction from an uploaded bill, even if mocked.
- Uploaded bill remains linked to the purchase record.

---

# Phase 9 - Owner-Friendly Polish

## Goal

Make the prototype feel simple enough for a non-technical restaurant owner.

## Build

- [ ] Make all screens mobile-friendly.
- [ ] Use dropdowns and suggestions wherever possible.
- [ ] Keep bill approval flow short.
- [ ] Add clear empty states.
- [ ] Add confirmation messages after important actions.
- [ ] Make alert explanations simple and direct.
- [ ] Use generic restaurant sample data.
- [ ] Remove any remaining cuisine-specific language.

## Deliverable

Demo-ready universal stock tracker.

## Success Criteria

- Owner can understand the dashboard quickly.
- Staff can submit a bill with minimal training.
- The demo works for any restaurant category.
- The app tells one clear story: "stop losing money through messy bills and invisible stock."

---

# Recommended Execution Order

1. **Phase 0** - Reframe the existing UI and copy.
2. **Phase 1** - Build the stock database foundation.
3. **Phase 2** - Build item and vendor masters.
4. **Phase 3** - Build manual bill entry and approval.
5. **Phase 4** - Build dashboard and stock ledger.
6. **Phase 5** - Add WhatsApp-style bill capture.
7. **Phase 6** - Add price history.
8. **Phase 7** - Add suspicious bill alerts.
9. **Phase 8** - Add upload/OCR simulation.
10. **Phase 9** - Polish for demo.

# Demo Story

1. Owner receives supplier bills on WhatsApp.
2. Staff may inflate prices or quantities.
3. Owner pastes a supplier bill into the system.
4. System extracts the bill automatically.
5. System detects that tomatoes are 42% more expensive than last purchase.
6. Owner reviews the bill before approving it.
7. Approved bill updates stock.
8. Dashboard shows stock levels, purchase spend, and suspicious alerts.
