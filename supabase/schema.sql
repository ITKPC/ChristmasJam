create table if not exists public.guest_entries (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(guest_name) between 1 and 80),
  plus_one_name text check (plus_one_name is null or char_length(plus_one_name) <= 80),
  party_size smallint not null default 1 check (party_size between 1 and 2),
  is_host boolean not null default false,
  rsvp_status text not null check (rsvp_status in ('coming','maybe','declined')),
  food_category text check (food_category is null or food_category in ('Appetizer','Main','Side','Dessert','Drink','Snack','Other','Hosts')),
  bringing_item text check (bringing_item is null or char_length(bringing_item) <= 300),
  frosting_description text check (frosting_description is null or char_length(frosting_description) <= 500),
  edit_token uuid,
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
grant select (id, guest_name, plus_one_name, party_size, is_host, rsvp_status, food_category, bringing_item, frosting_description, created_at, updated_at) on table public.guest_entries to anon, authenticated;
grant select on table public.contributions to anon, authenticated;

drop policy if exists "party guests can view entries" on public.guest_entries;
drop policy if exists "party guests can add entries" on public.guest_entries;
drop policy if exists "party guests can view contributions" on public.contributions;
drop policy if exists "party guests can add contributions" on public.contributions;

create policy "party guests can view entries" on public.guest_entries for select to anon, authenticated using (true);
create policy "party guests can view contributions" on public.contributions for select to anon, authenticated using (true);

create or replace function public.get_my_rsvp(p_guest_id uuid, p_edit_token uuid)
returns table (
  id uuid,
  guest_name text,
  plus_one_name text,
  party_size smallint,
  is_host boolean,
  rsvp_status text,
  food_category text,
  bringing_item text,
  frosting_description text
)
language sql
security definer
set search_path = public
stable
as $$
  select g.id, g.guest_name, g.plus_one_name, g.party_size, g.is_host, g.rsvp_status,
         g.food_category, g.bringing_item, g.frosting_description
  from public.guest_entries g
  where g.id = p_guest_id
    and g.edit_token = p_edit_token
    and g.is_host = false;
$$;

create or replace function public.save_guest_rsvp(
  p_guest_id uuid,
  p_edit_token uuid,
  p_guest_name text,
  p_plus_one_name text,
  p_rsvp_status text,
  p_category text,
  p_item_name text,
  p_frosted_name text
)
returns table (
  id uuid,
  guest_name text,
  plus_one_name text,
  party_size smallint,
  is_host boolean,
  rsvp_status text,
  food_category text,
  bringing_item text,
  frosting_description text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_party_size smallint;
  v_category text;
  v_item text;
  v_frosted text;
begin
  if p_edit_token is null then raise exception 'missing edit token'; end if;
  if p_guest_name is null or char_length(trim(p_guest_name)) < 1 or char_length(trim(p_guest_name)) > 80 then raise exception 'invalid guest name'; end if;
  if p_plus_one_name is not null and char_length(trim(p_plus_one_name)) > 80 then raise exception 'invalid guest name'; end if;
  if p_rsvp_status not in ('coming','maybe','declined') then raise exception 'invalid RSVP status'; end if;
  if p_category is not null and p_category not in ('Appetizer','Main','Side','Dessert','Other') then raise exception 'invalid food category'; end if;
  if p_item_name is not null and char_length(trim(p_item_name)) > 200 then raise exception 'food name too long'; end if;
  if p_frosted_name is not null and char_length(trim(p_frosted_name)) > 120 then raise exception 'Frosted Jam name too long'; end if;

  v_party_size := case when nullif(trim(coalesce(p_plus_one_name, '')), '') is null then 1 else 2 end;
  v_category := case when p_rsvp_status = 'declined' then null else nullif(trim(coalesce(p_category, '')), '') end;
  v_item := case when p_rsvp_status = 'declined' then null else nullif(trim(coalesce(p_item_name, '')), '') end;
  v_frosted := case when p_rsvp_status = 'declined' then null else nullif(trim(coalesce(p_frosted_name, '')), '') end;

  if (v_category is null) <> (v_item is null) then raise exception 'food category and food name must be supplied together'; end if;
  if v_frosted is not null and v_item is null then raise exception 'real food name required before Frosted Jam name'; end if;

  if p_guest_id is null then
    insert into public.guest_entries (guest_name, plus_one_name, party_size, is_host, rsvp_status, food_category, bringing_item, frosting_description, edit_token)
    values (trim(p_guest_name), nullif(trim(coalesce(p_plus_one_name, '')), ''), v_party_size, false, p_rsvp_status, v_category, v_item, v_frosted, p_edit_token)
    returning public.guest_entries.id into v_id;
  else
    update public.guest_entries g
    set guest_name = trim(p_guest_name), plus_one_name = nullif(trim(coalesce(p_plus_one_name, '')), ''), party_size = v_party_size,
        rsvp_status = p_rsvp_status, food_category = v_category, bringing_item = v_item, frosting_description = v_frosted, updated_at = now()
    where g.id = p_guest_id and g.edit_token = p_edit_token and g.is_host = false
    returning g.id into v_id;
    if v_id is null then raise exception 'invalid edit credentials'; end if;
  end if;

  delete from public.contributions c where c.guest_entry_id = v_id;
  if v_category is not null and v_item is not null then
    insert into public.contributions (guest_entry_id, category, item_name, frosting_description)
    values (v_id, v_category, v_item, v_frosted);
  end if;

  return query
  select g.id, g.guest_name, g.plus_one_name, g.party_size, g.is_host, g.rsvp_status, g.food_category, g.bringing_item, g.frosting_description
  from public.guest_entries g where g.id = v_id;
end;
$$;

grant execute on function public.get_my_rsvp(uuid, uuid) to anon, authenticated;
grant execute on function public.save_guest_rsvp(uuid, uuid, text, text, text, text, text, text) to anon, authenticated;
