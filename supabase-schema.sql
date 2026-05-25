-- ============================================================
-- Myrtavia — Supabase schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── Tables ─────────────────────────────────────────────────

-- Extends auth.users with display name and chosen color
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  color text not null default '#c9a961',
  created_at timestamptz default now()
);

-- A campaign is a shared workspace for one DM + their players
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default lower(substring(md5(random()::text), 1, 8)),
  dm_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Membership table — controls who sees what
create table if not exists public.campaign_members (
  campaign_id uuid references public.campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'player',  -- 'dm' | 'player'
  joined_at timestamptz default now(),
  primary key (campaign_id, user_id)
);

-- Lore notes attached to specific hotspots inside a region's detail map
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  region_id text not null,
  poi_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- User-placed custom markers
create table if not exists public.markers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  scope text not null,                 -- 'world' or a region id
  x double precision not null,         -- 0–100 percentage of map width
  y double precision not null,
  icon text not null,                  -- 'sword' | 'skull' | 'tavern' | ...
  text text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- ─── RLS ────────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.campaigns        enable row level security;
alter table public.campaign_members enable row level security;
alter table public.notes            enable row level security;
alter table public.markers          enable row level security;

-- Profiles: readable by anyone authenticated; users write own row
drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select to authenticated using (true);
create policy "profiles insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Campaigns: visible if you're a member; only DM can delete
drop policy if exists "campaigns read"   on public.campaigns;
drop policy if exists "campaigns insert" on public.campaigns;
drop policy if exists "campaigns delete" on public.campaigns;
create policy "campaigns read" on public.campaigns for select to authenticated using (
  exists (select 1 from public.campaign_members
          where campaign_id = id and user_id = auth.uid())
);
create policy "campaigns insert" on public.campaigns for insert to authenticated with check (auth.uid() = dm_user_id);
create policy "campaigns delete" on public.campaigns for delete to authenticated using (auth.uid() = dm_user_id);

-- Campaign members: only members of a campaign can see each other
drop policy if exists "members read"   on public.campaign_members;
drop policy if exists "members insert" on public.campaign_members;
drop policy if exists "members delete" on public.campaign_members;
create policy "members read" on public.campaign_members for select to authenticated using (
  exists (select 1 from public.campaign_members m2
          where m2.campaign_id = campaign_members.campaign_id and m2.user_id = auth.uid())
);
create policy "members insert" on public.campaign_members for insert to authenticated with check (auth.uid() = user_id);
create policy "members delete" on public.campaign_members for delete to authenticated using (auth.uid() = user_id);

-- Notes & markers: campaign members can read all; users write/delete their own
drop policy if exists "notes read"   on public.notes;
drop policy if exists "notes insert" on public.notes;
drop policy if exists "notes delete" on public.notes;
create policy "notes read" on public.notes for select to authenticated using (
  exists (select 1 from public.campaign_members
          where campaign_id = notes.campaign_id and user_id = auth.uid())
);
create policy "notes insert" on public.notes for insert to authenticated with check (
  auth.uid() = user_id and
  exists (select 1 from public.campaign_members
          where campaign_id = notes.campaign_id and user_id = auth.uid())
);
create policy "notes delete" on public.notes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "markers read"   on public.markers;
drop policy if exists "markers insert" on public.markers;
drop policy if exists "markers delete" on public.markers;
create policy "markers read" on public.markers for select to authenticated using (
  exists (select 1 from public.campaign_members
          where campaign_id = markers.campaign_id and user_id = auth.uid())
);
create policy "markers insert" on public.markers for insert to authenticated with check (
  auth.uid() = user_id and
  exists (select 1 from public.campaign_members
          where campaign_id = markers.campaign_id and user_id = auth.uid())
);
create policy "markers delete" on public.markers for delete to authenticated using (auth.uid() = user_id);

-- ─── Triggers ───────────────────────────────────────────────

-- On signup, create a profile row using the metadata sent from frontend
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'color', '#c9a961')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- On campaign creation, auto-add the DM as a member
create or replace function public.add_dm_as_member()
returns trigger as $$
begin
  insert into public.campaign_members (campaign_id, user_id, role)
  values (new.id, new.dm_user_id, 'dm');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_campaign_created on public.campaigns;
create trigger on_campaign_created
  after insert on public.campaigns
  for each row execute function public.add_dm_as_member();

-- ─── RPC: join campaign by invite code ─────────────────────
-- SECURITY DEFINER so it can look up the campaign even when
-- the caller is not yet a member (and therefore can't SELECT it).

create or replace function public.join_campaign_by_code(code text)
returns uuid as $$
declare
  c_id uuid;
begin
  select id into c_id from public.campaigns where invite_code = lower(code);
  if c_id is null then
    raise exception 'Invalid invite code: %', code;
  end if;
  insert into public.campaign_members (campaign_id, user_id, role)
  values (c_id, auth.uid(), 'player')
  on conflict do nothing;
  return c_id;
end;
$$ language plpgsql security definer;

revoke all on function public.join_campaign_by_code(text) from public;
grant execute on function public.join_campaign_by_code(text) to authenticated;

-- ─── Realtime ──────────────────────────────────────────────
-- Enable live updates for collaborative tables
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.markers;
alter publication supabase_realtime add table public.campaign_members;

-- Done. You can verify with:  select * from public.campaigns;
