-- Revert Phase 9 cascading deletes back to default (NO ACTION).
-- Run this in the Supabase SQL editor.

alter table public.purchase_bill_items
  drop constraint if exists purchase_bill_items_stock_item_id_fkey;
alter table public.purchase_bill_items
  add constraint purchase_bill_items_stock_item_id_fkey
  foreign key (stock_item_id) references public.stock_items (id);

alter table public.stock_movements
  drop constraint if exists stock_movements_stock_item_id_fkey;
alter table public.stock_movements
  add constraint stock_movements_stock_item_id_fkey
  foreign key (stock_item_id) references public.stock_items (id);

alter table public.stock_movements
  drop constraint if exists stock_movements_source_bill_item_id_fkey;
alter table public.stock_movements
  add constraint stock_movements_source_bill_item_id_fkey
  foreign key (source_bill_item_id) references public.purchase_bill_items (id);

alter table public.purchase_bills
  drop constraint if exists purchase_bills_vendor_id_fkey;
alter table public.purchase_bills
  add constraint purchase_bills_vendor_id_fkey
  foreign key (vendor_id) references public.vendors (id);
