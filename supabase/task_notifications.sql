-- Add last_viewed_tasks_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_viewed_tasks_at TIMESTAMPTZ DEFAULT now();

-- RPC to get unread task count
-- Returns count of tasks created since last view that are assigned to user OR are global (moderator created)
CREATE OR REPLACE FUNCTION get_unread_tasks_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_view timestamptz;
  count INTEGER;
BEGIN
  -- Get user's last view time
  SELECT last_viewed_tasks_at INTO last_view FROM public.profiles WHERE id = auth.uid();
  
  -- If null, assume never viewed (or treat as now? let's treat as epoch to show all? No, default is now() so 0 unread initially)
  IF last_view IS NULL THEN
    last_view := now();
  END IF;

  SELECT count(*) INTO count
  FROM public.tasks
  WHERE created_at > last_view
  AND (
    assignee_id = auth.uid() OR
    assignee_id IS NULL -- Optional: include unassigned?
    -- OR creator_id IN (SELECT id FROM profiles WHERE role = 'moderator') -- Global tasks
  );

  RETURN count;
END;
$$;

-- Function to mark tasks as read
CREATE OR REPLACE FUNCTION mark_tasks_viewed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_viewed_tasks_at = now()
  WHERE id = auth.uid();
END;
$$;
