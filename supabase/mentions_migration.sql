
-- Add mentions column to messages
alter table public.messages add column mentions uuid[] default array[]::uuid[];

-- Update RPC to count mentions
create or replace function get_unread_mentions_count()
returns bigint
language plpgsql
security definer
as $$
declare
  total_mentions bigint;
begin
  select count(*) into total_mentions
  from messages m
  left join channel_reads cr on m.channel_id = cr.channel_id and cr.user_id = auth.uid()
  where 
    m.created_at > coalesce(cr.last_read_at, '1970-01-01')
    and
    auth.uid() = any(m.mentions);
  
  return total_mentions;
end;
$$;
