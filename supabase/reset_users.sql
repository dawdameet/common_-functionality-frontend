
-- Delete dependent data first to avoid Foreign Key violations
DELETE FROM public.board_items;
DELETE FROM public.tasks;
DELETE FROM public.calendar_events;
DELETE FROM public.scribbles;
DELETE FROM public.profiles;

-- Delete users
DELETE FROM auth.users;
