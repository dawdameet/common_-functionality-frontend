-- Fix mark_messages_seen to handle NULLs
create or replace function public.mark_messages_seen(p_message_ids uuid[])
returns void
language plpgsql
security definer
as $$
begin
  update public.messages
  set seen_by = array_append(coalesce(seen_by, array[]::uuid[]), auth.uid())
  where id = any(p_message_ids)
  and (seen_by is null or not (seen_by @> array[auth.uid()]));
end;
$$;

-- Repair existing NULLs
update public.messages 
set seen_by = array[]::uuid[] 
where seen_by is null;
