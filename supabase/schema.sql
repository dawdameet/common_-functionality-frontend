-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- --- 1. Profiles ---
-- Create profiles table that mirrors auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  role text check (role in ('moderator', 'general')) default 'general',
  status text, -- e.g. "Deep Work", "Available"
  department text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'general');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- --- 2. Scribbles (Private) ---
create table public.scribbles (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) not null,
  content jsonb, -- Storing as JSON to support rich text/blocks if needed, or just text inside
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_archived boolean default false
);

alter table public.scribbles enable row level security;

create policy "Users can perform all actions on own scribbles"
  on public.scribbles for all
  using ( auth.uid() = owner_id );


-- --- 3. Board Items (Shared Board) ---
create type board_item_status as enum ('pending', 'approved', 'archived');
create type board_item_type as enum ('idea', 'decision', 'constraint', 'note', 'summary', 'text', 'line', 'circle', 'arrow', 'pencil'); 
-- Note: 'line', 'circle' etc added to support BoardCanvas shapes. 'note' covers sticky notes.

create table public.board_items (
  id uuid default uuid_generate_v4() primary key,
  title text default '',
  content text default '', -- For text items or notes
  author_id uuid references public.profiles(id) not null,
  status board_item_status default 'pending',
  type text not null, -- Using text to be flexible or enum if strict. Let's use text to allow 'line', 'pencil' etc easily or map to enum. Let's use the enum defined above but we might need to cast.
  position jsonb default '{"x": 0, "y": 0}',
  meta jsonb, -- Extra data: color, points (for pencil), dimensions (for shapes)
  created_at timestamptz default now()
);

alter table public.board_items enable row level security;

-- Read: Approved items OR Own Pending items
create policy "Read approved or own items"
  on public.board_items for select
  using ( status = 'approved' or author_id = auth.uid() );

-- Insert: Authenticated users can insert (default pending)
create policy "Insert board items"
  on public.board_items for insert
  with check ( auth.role() = 'authenticated' );

-- Update: Moderators can update anything. Authors can update own pending.
create policy "Start/Update Items"
  on public.board_items for update
  using ( 
    (select role from public.profiles where id = auth.uid()) = 'moderator' 
    or 
    (author_id = auth.uid() and status = 'pending')
  );

-- Delete: Moderators only (or maybe author if pending? Let's restrict to Mod for strictness per plan)
create policy "Delete Items"
  on public.board_items for delete
  using ( (select role from public.profiles where id = auth.uid()) = 'moderator' );


-- --- 4. Tasks (Execution Spine) ---
create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'medium', 'high');

create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  status task_status default 'todo',
  priority task_priority default 'medium',
  assignee_id uuid references public.profiles(id),
  creator_id uuid references public.profiles(id),
  origin_board_item_id uuid references public.board_items(id),
  deadline timestamptz,
  attachment_url text,
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;

-- Read: Everyone
create policy "Tasks are viewable by everyone"
  on public.tasks for select
  using ( true );

-- Insert: Moderators create for anyone; General for themselves.
create policy "Tasks creation"
  on public.tasks for insert
  with check (
    (select role from public.profiles where id = auth.uid()) = 'moderator'
    or
    assignee_id = auth.uid()
  );

-- Update: Moderators update all; Assignees update status of own.
create policy "Tasks update"
  on public.tasks for update
  using (
    (select role from public.profiles where id = auth.uid()) = 'moderator'
    or
    assignee_id = auth.uid()
  );


-- --- 5. Calendar ---
create type calendar_event_type as enum ('meeting', 'deadline', 'reminder');

create table public.calendar_events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  type calendar_event_type default 'meeting',
  is_global boolean default false,
  owner_id uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

alter table public.calendar_events enable row level security;

-- Read: Global OR Own
create policy "Read events"
  on public.calendar_events for select
  using ( is_global = true or owner_id = auth.uid() );

-- Insert: Mods can set global; Others forced to false.
create policy "Insert events"
  on public.calendar_events for insert
  with check (
    (
      (select role from public.profiles where id = auth.uid()) = 'moderator'
    )
    or
    (
      owner_id = auth.uid() and is_global = false
    )
  );

-- Update: Mods manage global; Users manage own.
create policy "Update events"
  on public.calendar_events for update
  using (
    (
       (select role from public.profiles where id = auth.uid()) = 'moderator'
       and
       is_global = true
    )
    or
    owner_id = auth.uid()
  );

-- Delete: same as update
create policy "Delete events"
  on public.calendar_events for delete
  using (
     (
       (select role from public.profiles where id = auth.uid()) = 'moderator'
       and
       is_global = true
    )
    or
    owner_id = auth.uid()
  );

-- Enable Realtime
alter publication supabase_realtime add table public.board_items;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.calendar_events;
