-- Run this in Supabase SQL Editor if schema.sql was already applied earlier.

drop policy if exists "System can manage analytics" on post_analytics;

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
