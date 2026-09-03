create table if not exists public.guest_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 1 and 80),
  plus_one_name text,
  rsvp_status text not null check (rsvp_status in ('coming','maybe','declined')),
  food_category text,
  bringing_item text,
  frosting_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guest_entries enable row level security;

grant select, insert, update on public.guest_entries to authenticated;

create policy "party guests can view entries"
on public.guest_entries for select
to authenticated
using (true);

create policy "party guests can create own entry"
on public.guest_entries for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "party guests can update own entry"
on public.guest_entries for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
