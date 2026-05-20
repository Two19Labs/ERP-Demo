create extension if not exists pgcrypto;

create table if not exists public.daily_menus (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets (id) on delete cascade,
  menu_date date not null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_menus_unique_outlet_date unique (outlet_id, menu_date)
);

create table if not exists public.daily_menu_items (
  id uuid primary key default gen_random_uuid(),
  daily_menu_id uuid not null references public.daily_menus (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete restrict,
  display_order integer not null default 1,
  dish_name_snapshot text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint daily_menu_items_unique_dish unique (daily_menu_id, dish_id)
);

create index if not exists daily_menus_outlet_date_idx on public.daily_menus (outlet_id, menu_date);
create index if not exists daily_menu_items_menu_order_idx on public.daily_menu_items (daily_menu_id, display_order);

create or replace function public.set_daily_menu_audit_fields()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists daily_menus_set_updated_at on public.daily_menus;
create trigger daily_menus_set_updated_at
before update on public.daily_menus
for each row
execute function public.set_daily_menu_audit_fields();

create or replace function private.can_access_outlet(target_outlet_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select private.is_hq() or target_outlet_id = private.current_outlet_id()
$$;

grant execute on function private.can_access_outlet(uuid) to authenticated;
grant execute on function private.can_access_outlet(uuid) to service_role;

alter table public.daily_menus enable row level security;
alter table public.daily_menu_items enable row level security;

grant select, insert, update, delete on public.daily_menus to authenticated;
grant select, insert, update, delete on public.daily_menu_items to authenticated;
grant all on public.daily_menus to service_role;
grant all on public.daily_menu_items to service_role;

drop policy if exists "users can read accessible daily menus" on public.daily_menus;
create policy "users can read accessible daily menus"
on public.daily_menus
for select
to authenticated
using (private.can_access_outlet(outlet_id));

drop policy if exists "users can manage accessible daily menus" on public.daily_menus;
create policy "users can manage accessible daily menus"
on public.daily_menus
for all
to authenticated
using (private.can_access_outlet(outlet_id))
with check (private.can_access_outlet(outlet_id));

drop policy if exists "users can read accessible menu items" on public.daily_menu_items;
create policy "users can read accessible menu items"
on public.daily_menu_items
for select
to authenticated
using (
  exists (
    select 1
    from public.daily_menus m
    where m.id = daily_menu_id
      and private.can_access_outlet(m.outlet_id)
  )
);

drop policy if exists "users can manage accessible menu items" on public.daily_menu_items;
create policy "users can manage accessible menu items"
on public.daily_menu_items
for all
to authenticated
using (
  exists (
    select 1
    from public.daily_menus m
    where m.id = daily_menu_id
      and private.can_access_outlet(m.outlet_id)
  )
)
with check (
  exists (
    select 1
    from public.daily_menus m
    where m.id = daily_menu_id
      and private.can_access_outlet(m.outlet_id)
  )
);

create or replace view public.public_daily_menu_view as
select
  m.id as daily_menu_id,
  o.id as outlet_id,
  o.code as outlet_code,
  o.name as outlet_name,
  o.city,
  m.menu_date,
  count(i.id) as dish_count,
  jsonb_agg(
    jsonb_build_object(
      'dish_id', d.id,
      'name', d.name,
      'category', d.category,
      'is_jain', d.is_jain,
      'display_order', i.display_order
    )
    order by i.display_order, d.name
  ) as dishes_json
from public.daily_menus m
join public.outlets o on o.id = m.outlet_id
join public.daily_menu_items i on i.daily_menu_id = m.id
join public.dishes d on d.id = i.dish_id
group by m.id, o.id, o.code, o.name, o.city, m.menu_date;

grant select on public.public_daily_menu_view to authenticated;
grant select on public.public_daily_menu_view to anon;
grant select on public.public_daily_menu_view to service_role;

comment on table public.daily_menus is 'One menu header per outlet per date.';
comment on table public.daily_menu_items is 'Dish selections inside a daily menu.';
comment on view public.public_daily_menu_view is 'Public menu feed for website consumption.';
