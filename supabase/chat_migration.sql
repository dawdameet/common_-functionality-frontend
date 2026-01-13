
-- --- Chat Channels ---
create table public.channels (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.channels enable row level security;

-- Select: Everyone (authenticated)
create policy "Read channels"
  on public.channels for select
  to authenticated
  using (true);

-- Insert: Moderators only
create policy "Create channels"
  on public.channels for insert
  with check ( (select role from public.profiles where id = auth.uid()) = 'moderator' );

-- --- Chat Messages ---
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  channel_id uuid references public.channels(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.messages enable row level security;

-- Select: Everyone (authenticated)
create policy "Read messages"
  on public.messages for select
  to authenticated
  using (true);

-- Insert: Everyone (authenticated)
create policy "Send messages"
  on public.messages for insert
  with check ( auth.role() = 'authenticated' );

-- Realtime
alter publication supabase_realtime add table public.channels;
alter publication supabase_realtime add table public.messages;

-- Insert default channel 'General' (if not exists)
insert into public.channels (name, description, created_by)
select 'General', 'Default workspace chat', id 
from public.profiles 
where role = 'moderator' 
order by created_at asc 
limit 1;
-- Note: Optimistic insert; might fail if no mod exists yet, but table creation is key.
