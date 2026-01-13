
-- Create teams table
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.teams enable row level security;

-- Policy: Authenticated users can read teams (to validate code or see their team name)
create policy "Authenticated users can read teams"
  on public.teams for select
  to authenticated, anon
  using (true);

-- Add team_id to profiles
alter table public.profiles 
add column if not exists team_id uuid references public.teams(id);

-- Insert default team
insert into public.teams (name, code)
values ('Antigravity', 'AG-2026')
on conflict (code) do nothing;

-- Update handle_new_user function to handle team code
create or replace function public.handle_new_user()
returns trigger as $$
declare
  team_id_val uuid;
begin
  -- Look up team by code provided in metadata
  select id into team_id_val from public.teams where code = new.raw_user_meta_data->>'team_code';

  -- If no team found, raise error (blocks signup)
  if team_id_val is null then
    raise exception 'Invalid Team Code';
  end if;

  insert into public.profiles (id, full_name, avatar_url, role, team_id, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'general', -- Default role
    team_id_val,
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;
