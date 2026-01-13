
-- Drop existing policy
drop policy "Read approved or own items" on public.board_items;

-- Re-create policy with Moderator access
create policy "Read approved or own, or moderator view all"
  on public.board_items for select
  using ( 
    status = 'approved' 
    or 
    author_id = auth.uid() 
    or
    (select role from public.profiles where id = auth.uid()) = 'moderator'
  );
