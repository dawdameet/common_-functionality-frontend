
-- Add email column to profiles
alter table public.profiles 
add column if not exists email text;

-- Update handle_new_user function to handle team code and email
create or replace function public.handle_new_user()
returns trigger as $$
declare
  team_id_val uuid;
begin
  -- Look up team by code provided in metadata
  select id into team_id_val from public.teams where code = new.raw_user_meta_data->>'team_code';

  -- If no team found, raise error (should be caught by client, but safeguard)
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
