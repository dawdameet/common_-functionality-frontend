-- --- 6. Vault (Links) ---
create table public.vault_links (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  url text not null,
  description text,
  tags text[],
  owner_id uuid references public.profiles(id) not null,
  is_shared boolean default false, -- If true, visible to everyone (or specific groups later)
  created_at timestamptz default now()
);

alter table public.vault_links enable row level security;

-- Read: Shared OR Own
create policy "Read links"
  on public.vault_links for select
  using ( is_shared = true or owner_id = auth.uid() );

-- Insert: Authenticated
create policy "Insert links"
  on public.vault_links for insert
  with check ( auth.role() = 'authenticated' );

-- Update/Delete: Owner or Moderator
create policy "Manage links"
  on public.vault_links for all
  using ( 
      owner_id = auth.uid() 
      or 
      (select role from public.profiles where id = auth.uid()) = 'moderator' 
  );

-- Realtime
alter publication supabase_realtime add table public.vault_links;
