-- Starter data. Run after 0001_init.sql.

-- The email that can sign in to /admin. Add more rows for more admins.
insert into public.admins (email) values ('hellochaps.dg@gmail.com')
on conflict do nothing;

insert into public.apps (slug, name, developer, status, notes) values
  ('discord', 'Discord', 'Discord, Inc.', 'unoptimized',
   'Runs in a letterboxed iPhone-sized window in the middle of the inner display.'),
  ('wegmans', 'Wegmans', 'Wegmans Food Markets', 'ios27',
   'Fills the display but stops before the status bar.')
on conflict (slug) do nothing;
