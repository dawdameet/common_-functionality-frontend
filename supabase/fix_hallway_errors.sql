-- Fix 1: Infinite Recursion Helper
create or replace function public.is_public_channel(_channel_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.channels 
    where id = _channel_id and type = 'public'
  );
$$;

-- Fix 2: Update participants policy to use helper (breaks recursion)
drop policy if exists "View participants" on public.channel_participants;

create policy "View participants"
  on public.channel_participants for select
  to authenticated
  using (
    public.is_public_channel(channel_id)
    or
    user_id = auth.uid()
  );

-- Fix 3: Update channels policy to allow creator to see their own hallway chats immediately
-- (Essential for the INSERT ... SELECT flow to work before participants are added)
drop policy if exists "Read channels" on public.channels;

create policy "Read channels"
  on public.channels for select
  to authenticated
  using (
    type = 'public'
    or
    created_by = auth.uid()
    or
    (
      type = 'hallway' 
      and 
      id in (select channel_id from public.channel_participants where user_id = auth.uid())
      and
      last_activity_at > (now() - interval '3 hours')
    )
  );
