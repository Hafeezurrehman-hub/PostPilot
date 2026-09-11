create table if not exists account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  user_email text,
  reason text,
  status text default 'pending', -- pending | completed | cancelled
  requested_at timestamptz default now(),
  processed_at timestamptz,
  processed_by text
);

alter table account_deletion_requests enable row level security;

-- User can view their own request
drop policy if exists "Users view own deletion request" on account_deletion_requests;
create policy "Users view own deletion request"
  on account_deletion_requests for select
  using (auth.uid() = user_id);

-- User can insert their own request (one active request at a time is enforced in the API route)
drop policy if exists "Users insert own deletion request" on account_deletion_requests;
create policy "Users insert own deletion request"
  on account_deletion_requests for insert
  with check (auth.uid() = user_id);

-- Service role (admin) full access
drop policy if exists "Service role full access deletion requests" on account_deletion_requests;
create policy "Service role full access deletion requests"
  on account_deletion_requests for all
  using (auth.jwt() ->> 'role' = 'service_role');
