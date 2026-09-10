-- Daily Expenses Table
-- Supabase (PostgreSQL) — Paste in SQL Editor and Run

create table if not exists daily_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'other' check (category in (
    'food', 'transport', 'shopping', 'bills', 'health', 'entertainment', 'education', 'other'
  )),
  description text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Indexes for fast queries
create index if not exists idx_daily_expenses_user_id on daily_expenses (user_id);
create index if not exists idx_daily_expenses_date on daily_expenses (user_id, expense_date);
create index if not exists idx_daily_expenses_category on daily_expenses (category);

-- Row Level Security
alter table daily_expenses enable row level security;

create policy "Users can manage own expenses" on daily_expenses
  for all using (auth.uid() = user_id);
