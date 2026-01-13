
-- Table to store last read timestamp per user/channel
create table public.channel_reads (
  id uuid default uuid_generate_v4() primary key,
  channel_id uuid references public.channels(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  last_read_at timestamptz default now(),
  unique(channel_id, user_id)
);

alter table public.channel_reads enable row level security;

create policy "Users can manage their own read receipts"
  on public.channel_reads
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Function to get unread counts for all channels for the current user
create or replace function get_unread_counts()
returns table (channel_id uuid, unread_count bigint)
language plpgsql
security definer
as $$
begin
  return query
  select 
    m.channel_id,
    count(m.id) as unread_count
  from messages m
  left join channel_reads cr on m.channel_id = cr.channel_id and cr.user_id = auth.uid()
  where m.created_at > coalesce(cr.last_read_at, '1970-01-01')
  group by m.channel_id;
end;
$$;
