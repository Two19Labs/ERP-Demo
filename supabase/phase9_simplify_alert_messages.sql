-- Phase 9 (Owner-Friendly Polish): rewrite alert messages so the owner
-- gets a short, action-oriented explanation instead of a technical one.
-- Applied via Supabase MCP migration "phase9_simplify_alert_messages".

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
  duplicate_count integer;
  prev_qty_count integer;
begin
  select pb.*, v.name as vendor_name
  into b_rec
  from public.purchase_bills pb
  left join public.vendors v on pb.vendor_id = v.id
  where pb.id = bill_id;

  if not found then
    return;
  end if;

  delete from public.bill_alerts
  where purchase_bill_id = bill_id and status = 'active';

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
        'Bill number ' || b_rec.bill_number || ' from ' || b_rec.vendor_name || ' was already entered. This bill may be a duplicate.'
      );
    end if;
  end if;

  if b_rec.vendor_id is null then
    insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
    values (
      bill_id,
      'unknown_vendor',
      'warning',
      'Vendor is not on your approved list. Add them in Stock Setup, or fix the spelling on the bill.'
    );
  end if;

  for item_rec in
    select pbi.*, si.name as stock_item_name, si.default_unit as stock_default_unit
    from public.purchase_bill_items pbi
    left join public.stock_items si on pbi.stock_item_id = si.id
    where pbi.purchase_bill_id = bill_id
  loop
    total_items_price := total_items_price + item_rec.line_total;

    if item_rec.stock_item_id is null then
      insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
      values (
        bill_id,
        'unknown_item',
        'warning',
        '"' || item_rec.raw_item_name || '" is not in your stock list. Add it in Stock Setup so future bills match it automatically.'
      );
    else
      if item_rec.unit <> item_rec.stock_default_unit then
        insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
        values (
          bill_id,
          'unit_change',
          'warning',
          item_rec.stock_item_name || ' is billed in "' || item_rec.unit || '" but you usually track it in "' || item_rec.stock_default_unit || '". Double-check the quantity.'
        );
      end if;

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
              item_rec.stock_item_name || ' price jumped ' || round(pct_inc, 0) || '%: now ₹' || item_rec.unit_price || ', last time ₹' || prev_price || '. Confirm the new rate before approving.'
            );
          end;
        end if;
      end if;

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
            'Large order of ' || item_rec.stock_item_name || ': ' || item_rec.quantity || ' vs typical ~' || round(avg_qty, 1) || '. Confirm this much was actually ordered.'
          );
        end if;
      end if;

    end if;
  end loop;

  if abs(b_rec.total - (total_items_price + b_rec.extra_charges)) > 0.05 then
    insert into public.bill_alerts (purchase_bill_id, alert_type, severity, message)
    values (
      bill_id,
      'total_mismatch',
      'critical',
      'Bill total ₹' || b_rec.total || ' does not match line items + charges (₹' || (total_items_price + b_rec.extra_charges) || '). Check the math before approving.'
    );
  end if;

end;
$$;
