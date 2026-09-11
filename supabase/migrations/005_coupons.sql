create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null,
  max_uses integer default null,
  used_count integer default 0,
  is_active boolean default true,
  expires_at timestamptz default null,
  created_at timestamptz default now()
);

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references coupons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  redeemed_at timestamptz default now(),
  unique(coupon_id, user_id)
);

alter table upgrade_requests add column if not exists coupon_code text;
