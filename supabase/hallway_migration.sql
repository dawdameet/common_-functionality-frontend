
-- 1. Update channels table
alter table public.channels add column type text check (type in ('public', 'hallway')) default 'public';
alter table public.channels add column last_activity_at timestamptz default now();

-- 2. Channel Participants table (for Hallway/Private chats)
create table public.channel_participants (
  channel_id uuid references public.channels(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  primary key (channel_id, user_id)
);

alter table public.channel_participants enable row level security;

-- RLS for participants
create policy "View participants"
  on public.channel_participants for select
  to authenticated
  using (
    -- You can see participants if it's a public channel OR if you are a participant
    exists (select 1 from public.channels c where c.id = channel_id and c.type = 'public')
    or
    channel_id in (select channel_id from public.channel_participants where user_id = auth.uid())
  );

create policy "Insert participants"
  on public.channel_participants for insert
  to authenticated
  with check (true); -- Logic handled in app/trigger usually, or allow creation

-- 3. Update RLS for Channels
drop policy "Read channels" on public.channels;

create policy "Read channels"
  on public.channels for select
  to authenticated
  using (
    type = 'public'
    or
    (
      type = 'hallway' 
      and 
      id in (select channel_id from public.channel_participants where user_id = auth.uid())
      and
      -- Self-destruct logic: Hide if inactive > 3 hours
      last_activity_at > (now() - interval '3 hours')
    )
  );

-- Update Insert for Channels (Allow auth users to create hallway)
drop policy "Create channels" on public.channels;

create policy "Create channels"
  on public.channels for insert
  with check (
    -- Moderator can create public
    (type = 'public' and (select role from public.profiles where id = auth.uid()) = 'moderator')
    or
    -- Anyone can create hallway
    (type = 'hallway' and auth.role() = 'authenticated')
  );

-- Allow deletion of hallway chats by participants
create policy "Delete hallway channels"
  on public.channels for delete
  using (
    type = 'hallway'
    and
    id in (select channel_id from public.channel_participants where user_id = auth.uid())
  );

-- 4. Trigger to update last_activity_at on new message
create or replace function public.update_channel_activity()
returns trigger as $$
begin
  update public.channels
  set last_activity_at = new.created_at
  where id = new.channel_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_message_sent
  after insert on public.messages
  for each row execute procedure public.update_channel_activity();
