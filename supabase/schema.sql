-- CrossPoster Database Schema
-- Supabase (PostgreSQL) — Phase 1
-- Ye pura file Supabase Dashboard > SQL Editor me paste karke "Run" karo.

-- 1. Users apne aap Supabase Auth (auth.users) me store hote hain.
--    Hum sirf ek "profiles" table banate hain extra info ke liye.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. Platform connections (Phase 2/3 me use hoga — OAuth tokens yahan store honge)
create table if not exists platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'twitter', 'linkedin')),
  access_token text not null,       -- encrypt karke store karna (app layer par)
  refresh_token text,
  platform_username text,
  connected_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, platform)
);

-- 3. Posts
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  media_url text,
  platforms text[] not null default '{}',   -- e.g. {'twitter','linkedin'}
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Per-platform publish results (ek post, kai platforms — har ek ka apna status)
create table if not exists post_results (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  platform text not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  platform_post_id text,   -- us platform par bana post ID (agar success)
  error_message text,
  attempted_at timestamptz
);

-- 5. Post analytics — per-platform performance metrics
create table if not exists post_analytics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  platform text not null,
  impressions integer default 0,
  engagements integer default 0,
  clicks integer default 0,
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  reach integer default 0,
  fetched_at timestamptz not null default now(),
  unique (post_id, platform)
);

-- 6. Recurring posts — scheduled repeats (daily/weekly/monthly)
create table if not exists recurring_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid references posts (id) on delete set null,
  content text not null,
  media_url text,
  platforms text[] not null default '{}',
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  interval_count integer not null default 1,  -- e.g. every 2 weeks = weekly, interval 2
  days_of_week integer[],                      -- for weekly: [0=Sun, 1=Mon, ...6=Sat]
  day_of_month integer,                        -- for monthly: 1-31
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7. Teams — collaboration support
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 8. Team members — team membership
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- 9. Team invitations
create table if not exists team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  accepted boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 10. Listening queries — social listening (brand mentions)
create table if not exists listening_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,            -- e.g. "PostPilot", "#mybrand"
  platform text not null default 'twitter',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 11. Brand voice profiles — custom tones for AI generation
create table if not exists brand_voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  tone text not null default 'casual',
  keywords text[] default '{}',
  avoid_words text[] default '{}',
  examples text[] default '{}',
  hashtag_style text not null default 'moderate' check (hashtag_style in ('none', 'minimal', 'moderate', 'heavy')),
  emoji_usage text not null default 'moderate' check (emoji_usage in ('none', 'minimal', 'moderate', 'heavy')),
  language text not null default 'english',
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- 12. Post templates — reusable post templates
create table if not exists post_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  content text not null,
  platforms text[] not null default '{}',
  category text not null default 'custom' check (category in ('announcement', 'promo', 'engagement', 'educational', 'custom')),
  variables text[] default '{}',    -- auto-detected from {{var}} in content
  created_at timestamptz not null default now()
);

-- 13. Short links — URL shortener with click tracking
create table if not exists short_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original_url text not null,
  short_code text not null unique,
  short_url text not null,
  clicks integer not null default 0,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

-- 14. Scheduled post queue — for reliable scheduling
create table if not exists schedule_queue (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_posts_user_id on posts (user_id);
create index if not exists idx_posts_status on posts (status);
create index if not exists idx_platform_connections_user_id on platform_connections (user_id);
create index if not exists idx_post_analytics_post_id on post_analytics (post_id);
create index if not exists idx_recurring_posts_next_run on recurring_posts (next_run_at) where is_active = true;
create index if not exists idx_team_members_user_id on team_members (user_id);
create index if not exists idx_team_invitations_token on team_invitations (token);
create index if not exists idx_listening_queries_user on listening_queries (user_id);
create index if not exists idx_brand_voice_user on brand_voice_profiles (user_id);
create index if not exists idx_post_templates_user on post_templates (user_id);
create index if not exists idx_short_links_code on short_links (short_code);
create index if not exists idx_short_links_user on short_links (user_id);
create index if not exists idx_schedule_queue_status on schedule_queue (scheduled_for) where status = 'pending';

-- Row Level Security (RLS) — har user sirf apna data dekh/edit kar sake
alter table profiles enable row level security;
alter table platform_connections enable row level security;
alter table posts enable row level security;
alter table post_results enable row level security;
alter table post_analytics enable row level security;
alter table recurring_posts enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invitations enable row level security;
alter table listening_queries enable row level security;
alter table brand_voice_profiles enable row level security;
alter table post_templates enable row level security;
alter table short_links enable row level security;
alter table schedule_queue enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can manage own connections" on platform_connections
  for all using (auth.uid() = user_id);

create policy "Users can manage own posts" on posts
  for all using (auth.uid() = user_id);

create policy "Users can view own post results" on post_results
  for select using (
    exists (select 1 from posts where posts.id = post_results.post_id and posts.user_id = auth.uid())
  );

create policy "Users can view own analytics" on post_analytics
  for select using (
    exists (select 1 from posts where posts.id = post_analytics.post_id and posts.user_id = auth.uid())
  );

create policy "Users can manage own recurring posts" on recurring_posts
  for all using (auth.uid() = user_id);

create policy "Users can view teams they own" on teams
  for select using (auth.uid() = owner_id);
create policy "Users can manage own teams" on teams
  for all using (auth.uid() = owner_id);

create policy "Members can view their teams" on team_members
  for select using (
    auth.uid() = user_id or
    exists (select 1 from teams where teams.id = team_members.team_id and teams.owner_id = auth.uid())
  );
create policy "Team owners can manage members" on team_members
  for all using (
    exists (select 1 from teams where teams.id = team_members.team_id and teams.owner_id = auth.uid())
  );

create policy "Team owners can manage invitations" on team_invitations
  for all using (
    exists (select 1 from teams where teams.id = team_invitations.team_id and teams.owner_id = auth.uid())
  );

create policy "Users can manage own listening queries" on listening_queries
  for all using (auth.uid() = user_id);

create policy "Users can manage own brand voice profiles" on brand_voice_profiles
  for all using (auth.uid() = user_id);

create policy "Users can manage own post templates" on post_templates
  for all using (auth.uid() = user_id);

create policy "Users can manage own short links" on short_links
  for all using (auth.uid() = user_id);

create policy "Users can manage own schedule queue" on schedule_queue
  for all using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: recurring_posts next_run_at auto-calculate
-- ============================================================

create or replace function public.calculate_next_run()
returns trigger as $$
begin
  if new.frequency = 'daily' then
    new.next_run_at := new.next_run_at + (new.interval_count || ' days')::interval;
  elsif new.frequency = 'weekly' then
    new.next_run_at := new.next_run_at + (new.interval_count || ' weeks')::interval;
  elsif new.frequency = 'monthly' then
    new.next_run_at := new.next_run_at + (new.interval_count || ' months')::interval;
  end if;
  return new;
end;
$$ language plpgsql;

-- Naya user signup hone par profile auto-create karo
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.increment_clicks(link_id uuid)
returns void as $$
begin
  update public.short_links
  set clicks = clicks + 1
  where id = link_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- STORAGE BUCKET (image uploads ke liye)
-- SQL Editor se nahi banega — ye manually karna hai:
-- 1. Supabase Dashboard → Storage → "New bucket"
-- 2. Name: post-media
-- 3. Public bucket: ON (taaki image URLs directly access ho sakein)
-- 4. Phir neeche wali policy SQL Editor me chalao (bucket banane ke baad):
-- ============================================================

create policy "Users can upload own media"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view media"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "Users can delete own media"
  on storage.objects for delete
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
