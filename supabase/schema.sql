create table if not exists public.guest_entries (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(guest_name) between 1 and 80),
  plus_one_name text check (plus_one_name is null or char_length(plus_one_name) <= 80),
  party_size smallint not null default 1 check (party_size between 1 and 2),
  is_host boolean not null default false,
  rsvp_status text not null check (rsvp_status in ('coming','maybe','declined')),
  -- Backup copy of a guest's food choice so it is not lost if the feast-list insert fails.
  food_category text check (food_category is null or food_category in ('Appetizer','Main','Side','Dessert','Drink','Snack','Other','Hosts')),
  bringing_item text check (bringing_item is null or char_length(bringing_item) <= 300),
  -- Used by the current app as the optional Frosted Jam display name.
  frosting_description text check (frosting_description is null or char_length(frosting_description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  guest_entry_id uuid not null references public.guest_entries(id) on delete cascade,
  category text not null check (category in ('Appetizer','Main','Side','Dessert','Other')),
  item_name text not null check (char_length(item_name) between 1 and 200),
  frosting_description text check (frosting_description is null or char_length(frosting_description) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists contributions_guest_entry_id_idx on public.contributions (guest_entry_id);

alter table public.guest_entries enable row level security;
alter table public.contributions enable row level security;

revoke all on table public.guest_entries from anon, authenticated;
revoke all on table public.contributions from anon, authenticated;
grant select, insert on table public.guest_entries to anon, authenticated;
grant select, insert on table public.contributions to anon, authenticated;

drop policy if exists "party guests can view entries" on public.guest_entries;
drop policy if exists "party guests can add entries" on public.guest_entries;
drop policy if exists "party guests can view contributions" on public.contributions;
drop policy if exists "party guests can add contributions" on public.contributions;

create policy "party guests can view entries" on public.guest_entries for select to anon, authenticated using (true);
create policy "party guests can add entries" on public.guest_entries for insert to anon, authenticated with check (is_host = false and guest_name <> '');
create policy "party guests can view contributions" on public.contributions for select to anon, authenticated using (true);
create policy "party guests can add contributions" on public.contributions for insert to anon, authenticated with check (exists (select 1 from public.guest_entries g where g.id = guest_entry_id and g.is_host = false));
