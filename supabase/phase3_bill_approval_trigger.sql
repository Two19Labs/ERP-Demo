-- Trigger function to automatically create stock movements when a purchase bill is approved.
create or replace function public.process_bill_approval()
returns trigger
language plpgsql
security definer
as $$
declare
  item_row record;
begin
  if new.status = 'approved' and old.status <> 'approved' then
    -- Set approved fields if not set
    new.approved_by := coalesce(new.approved_by, auth.uid());
    new.approved_at := coalesce(new.approved_at, now());
    
    -- Insert stock movements for each item
    for item_row in 
      select id, stock_item_id, quantity, unit
      from public.purchase_bill_items
      where purchase_bill_id = new.id
    loop
      insert into public.stock_movements (
        stock_item_id,
        movement_type,
        quantity,
        unit,
        source_bill_item_id,
        notes,
        created_by
      ) values (
        item_row.stock_item_id,
        'purchase_added',
        item_row.quantity,
        item_row.unit,
        item_row.id,
        'Auto-added via bill approval: ' || coalesce(new.bill_number, new.id::text),
        coalesce(new.approved_by, auth.uid())
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_process_bill_approval on public.purchase_bills;
create trigger tr_process_bill_approval
before update on public.purchase_bills
for each row
execute function public.process_bill_approval();
