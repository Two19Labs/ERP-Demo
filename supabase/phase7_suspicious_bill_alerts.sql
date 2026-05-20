-- Create bill_alerts table
create table if not exists public.bill_alerts (
  id uuid primary key default gen_random_uuid(),
  purchase_bill_id uuid not null references public.purchase_bills (id) on delete cascade,
  alert_type text not null,
  severity text not null default 'warning',
  message text not null,
  status text not null default 'active',
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bill_alerts_status_check check (status in ('active', 'resolved', 'dismissed')),
  constraint bill_alerts_severity_check check (severity in ('warning', 'critical')),
  constraint bill_alerts_type_check check (
    alert_type in ('price_jump', 'duplicate_bill_number', 'total_mismatch', 'high_quantity', 'unknown_vendor', 'unknown_item', 'unit_change')
  )
);

-- Enable RLS
alter table public.bill_alerts enable row level security;

-- Policies
drop policy if exists "users can read bill alerts" on public.bill_alerts;
create policy "users can read bill alerts"
  on public.bill_alerts for select
  using (true);

drop policy if exists "users can update bill alerts" on public.bill_alerts;
create policy "users can update bill alerts"
  on public.bill_alerts for update
  using (true);

grant select, insert, update, delete on public.bill_alerts to authenticated;
grant all on public.bill_alerts to service_role;

-- Function to evaluate alerts for a bill
create or replace function public.evaluate_bill_alerts(bill_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  b_rec record;
  item_rec record;
  prev_price numeric(12,2);
  avg_qty numeric(12,3);
  total_items_price numeric(12,2) := 0;
  v_name text;
  s_name text;
  standard_unit text;
  alert_msg text;
  duplicate_count integer;
  prev_qty_count integer;
begin
  -- Fetch the purchase bill details
  select pb.*, v.name as vendor_name
  into b_rec
  from public.purchase_bills pb
  left join public.vendors v on pb.vendor_id = v.id
  where pb.id = bill_id;

  if not found then
    return;
  end if;

  -- Delete existing active alerts for this bill to re-evaluate
  delete from public.bill_alerts 
  where purchase_bill_id = bill_id and status = 'active';

  -- 1. Duplicate Bill Number Alert
  if b_rec.bill_number is not null and b_rec.vendor_id is not null then
    select count(*)
    into duplicate_count
    from public.purchase_bills
    where id <> bill_id 
      and bill_number = b_rec.bill_number 
      and vendor_id = b_rec.vendor_id;

    if duplicate_count > 0 then
      insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
      values (
        bill_id,
        'duplicate_bill_number',
        'critical',
        'Duplicate bill number: Bill ' || b_rec.bill_number || ' from vendor "' || b_rec.vendor_name || '" already exists in the system.'
      );
    end if;
  end if;

  -- 2. Unknown Vendor Alert
  if b_rec.vendor_id is null then
    insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
    values (
      bill_id,
      'unknown_vendor',
      'warning',
      'Unknown vendor: The supplier name in this bill could not be mapped to any approved vendors.'
    );
  end if;

  -- Loop through each item in the bill for item-level checks
  for item_rec in
    select pbi.*, si.name as stock_item_name, si.default_unit as stock_default_unit
    from public.purchase_bill_items pbi
    left join public.stock_items si on pbi.stock_item_id = si.id
    where pbi.purchase_bill_id = bill_id
  loop
    total_items_price := total_items_price + item_rec.line_total;

    -- 3. Unknown Item Alert
    if item_rec.stock_item_id is null then
      insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
      values (
        bill_id,
        'unknown_item',
        'warning',
        'Unknown item line: "' || item_rec.raw_item_name || '" could not be matched to an active stock item.'
      );
    else
      -- 4. Unit Change Alert
      if item_rec.unit <> item_rec.stock_default_unit then
        insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
        values (
          bill_id,
          'unit_change',
          'warning',
          'Unit mismatch for ' || item_rec.stock_item_name || ': bill uses unit "' || item_rec.unit || '" but catalog default is "' || item_rec.stock_default_unit || '".'
        );
      end if;

      -- 5. Price Jump Alert (> 20% increase)
      -- Find last approved price for this stock item (excluding this bill)
      select pbi.unit_price
      into prev_price
      from public.purchase_bill_items pbi
      join public.purchase_bills pb on pbi.purchase_bill_id = pb.id
      where pb.status = 'approved' 
        and pbi.stock_item_id = item_rec.stock_item_id
        and pb.id <> bill_id
      order by pb.bill_date desc, pb.created_at desc
      limit 1;

      if prev_price is not null and prev_price > 0 then
        if item_rec.unit_price > (prev_price * 1.20) then
          declare
            pct_inc numeric;
          begin
            pct_inc := ((item_rec.unit_price - prev_price) / prev_price) * 100;
            insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
            values (
              bill_id,
              'price_jump',
              'critical',
              'Price jump for ' || item_rec.stock_item_name || ': unit rate is ₹' || item_rec.unit_price || ', which is ' || round(pct_inc, 0) || '% higher than the last approved rate of ₹' || prev_price || '.'
            );
          end;
        end if;
      end if;

      -- 6. High Quantity Alert (> 3x average quantity of last 5 approved bills)
      select avg(pbi.quantity), count(*)
      into avg_qty, prev_qty_count
      from (
        select pbi.quantity
        from public.purchase_bill_items pbi
        join public.purchase_bills pb on pbi.purchase_bill_id = pb.id
        where pb.status = 'approved' 
          and pbi.stock_item_id = item_rec.stock_item_id
          and pb.id <> bill_id
        order by pb.bill_date desc, pb.created_at desc
        limit 5
      ) pbi;

      if prev_qty_count >= 2 and avg_qty > 0 then
        if item_rec.quantity > (avg_qty * 3.0) then
          insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
          values (
            bill_id,
            'high_quantity',
            'warning',
            'High quantity for ' || item_rec.stock_item_name || ': quantity ' || item_rec.quantity || ' is more than 3x the recent average (' || round(avg_qty, 1) || ').'
          );
        end if;
      end if;

    end if;
  end loop;

  -- 7. Total Mismatch Alert
  -- (item subtotal + extra_charges) compared to bill total
  if abs(b_rec.total - (total_items_price + b_rec.extra_charges)) > 0.05 then
    insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
    values (
      bill_id,
      'total_mismatch',
      'critical',
      'Total mismatch: bill total is ₹' || b_rec.total || ' but the sum of items + charges is ₹' || (total_items_price + b_rec.extra_charges) || '.'
    );
  end if;

end;
$$;

-- Triggers for automatic evaluation
create or replace function public.tr_evaluate_bill_alerts_bill()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status in ('draft', 'pending_review') then
    perform public.evaluate_bill_alerts(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists tr_evaluate_bill_alerts_bill on public.purchase_bills;
create trigger tr_evaluate_bill_alerts_bill
after insert or update of status, vendor_id, bill_number, total, extra_charges on public.purchase_bills
for each row
execute function public.tr_evaluate_bill_alerts_bill();

create or replace function public.tr_evaluate_bill_alerts_item()
returns trigger
language plpgsql
security definer
as $$
declare
  bill_id uuid;
  bill_status text;
begin
  if tg_op = 'DELETE' then
    bill_id := old.purchase_bill_id;
  else
    bill_id := new.purchase_bill_id;
  end if;
  
  select status into bill_status from public.purchase_bills where id = bill_id;
  if bill_status in ('draft', 'pending_review') then
    perform public.evaluate_bill_alerts(bill_id);
  end if;
  
  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists tr_evaluate_bill_alerts_item on public.purchase_bill_items;
create trigger tr_evaluate_bill_alerts_item
after insert or update or delete on public.purchase_bill_items
for each row
execute function public.tr_evaluate_bill_alerts_item();

-- Auto-resolve alerts on bill approval or rejection
create or replace function public.tr_resolve_bill_alerts_on_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status in ('approved', 'rejected') and old.status not in ('approved', 'rejected') then
    update public.bill_alerts
    set status = 'resolved',
        resolved_by = coalesce(auth.uid(), new.approved_by),
        resolved_at = now()
    where purchase_bill_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists tr_resolve_bill_alerts_on_status_change on public.purchase_bills;
create trigger tr_resolve_bill_alerts_on_status_change
after update of status on public.purchase_bills
for each row
execute function public.tr_resolve_bill_alerts_on_status_change();

