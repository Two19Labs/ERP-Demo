create extension if not exists pgcrypto;

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  service_order integer not null default 10,
  is_jain boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  base_unit text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets (id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint vendors_unique_name_per_outlet unique (outlet_id, name)
);

create index if not exists dishes_active_idx on public.dishes (is_active, service_order);
create index if not exists ingredients_active_idx on public.ingredients (is_active, category);
create index if not exists vendors_outlet_id_idx on public.vendors (outlet_id, is_active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists dishes_set_updated_at on public.dishes;
create trigger dishes_set_updated_at
before update on public.dishes
for each row
execute function public.set_updated_at();

drop trigger if exists ingredients_set_updated_at on public.ingredients;
create trigger ingredients_set_updated_at
before update on public.ingredients
for each row
execute function public.set_updated_at();

drop trigger if exists vendors_set_updated_at on public.vendors;
create trigger vendors_set_updated_at
before update on public.vendors
for each row
execute function public.set_updated_at();

alter table public.dishes enable row level security;
alter table public.ingredients enable row level security;
alter table public.vendors enable row level security;

grant select on public.dishes to authenticated;
grant select on public.ingredients to authenticated;
grant select, insert, update, delete on public.vendors to authenticated;
grant insert, update, delete on public.dishes to authenticated;
grant insert, update, delete on public.ingredients to authenticated;
grant all on public.dishes to service_role;
grant all on public.ingredients to service_role;
grant all on public.vendors to service_role;

drop policy if exists "authenticated can read dishes" on public.dishes;
create policy "authenticated can read dishes"
on public.dishes
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "hq can manage dishes" on public.dishes;
create policy "hq can manage dishes"
on public.dishes
for all
to authenticated
using (private.is_hq())
with check (private.is_hq());

drop policy if exists "authenticated can read ingredients" on public.ingredients;
create policy "authenticated can read ingredients"
on public.ingredients
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "hq can manage ingredients" on public.ingredients;
create policy "hq can manage ingredients"
on public.ingredients
for all
to authenticated
using (private.is_hq())
with check (private.is_hq());

drop policy if exists "hq can read all vendors" on public.vendors;
create policy "hq can read all vendors"
on public.vendors
for select
to authenticated
using (private.is_hq());

drop policy if exists "managers can read own outlet vendors" on public.vendors;
create policy "managers can read own outlet vendors"
on public.vendors
for select
to authenticated
using (outlet_id = private.current_outlet_id());

drop policy if exists "hq can manage all vendors" on public.vendors;
create policy "hq can manage all vendors"
on public.vendors
for all
to authenticated
using (private.is_hq())
with check (private.is_hq());

drop policy if exists "managers can insert own outlet vendors" on public.vendors;
create policy "managers can insert own outlet vendors"
on public.vendors
for insert
to authenticated
with check (
  not private.is_hq()
  and outlet_id = private.current_outlet_id()
);

drop policy if exists "managers can update own outlet vendors" on public.vendors;
create policy "managers can update own outlet vendors"
on public.vendors
for update
to authenticated
using (outlet_id = private.current_outlet_id())
with check (outlet_id = private.current_outlet_id());

drop policy if exists "managers can delete own outlet vendors" on public.vendors;
create policy "managers can delete own outlet vendors"
on public.vendors
for delete
to authenticated
using (outlet_id = private.current_outlet_id());

comment on table public.dishes is 'Shared HQ-managed dish master.';
comment on table public.ingredients is 'Shared HQ-managed ingredient master.';
comment on table public.vendors is 'Outlet-scoped vendor master.';

-- Optional starter data:
-- insert into public.dishes (name, category, service_order, is_jain)
-- values
--   ('Dal Baati Churma', 'Main', 10, false),
--   ('Gatte ki Sabzi', 'Main', 20, false),
--   ('Bajra Roti', 'Bread', 30, false);
--
-- insert into public.ingredients (name, category, base_unit)
-- values
--   ('Besan', 'Grain', 'kg'),
--   ('Desi Ghee', 'Dairy', 'litre'),
--   ('Moong Dal', 'Pulse', 'kg');
