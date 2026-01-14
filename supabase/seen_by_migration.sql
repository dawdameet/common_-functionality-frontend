-- Add seen_by column to messages
alter table public.messages 
add column if not exists seen_by uuid[] default array[]::uuid[];

-- Function to mark messages as seen (bulk)
create or replace function public.mark_messages_seen(p_message_ids uuid[])
returns void
language plpgsql
security definer
as $$
begin
  -- Update messages: append current user's ID to seen_by if not already present
  update public.messages
  set seen_by = array_append(seen_by, auth.uid())
  where id = any(p_message_ids)
  and not (seen_by @> array[auth.uid()]); -- Check if array contains auth.uid()
end;
$$;
