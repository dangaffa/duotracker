-- App Store data: filled in from Apple's public lookup service (itunes.apple.com/lookup).
-- Run in the Supabase SQL editor after 0001_init.sql.

alter table public.apps
  add column if not exists app_store_id       bigint unique,
  add column if not exists store_version      text,        -- latest version on the App Store
  add column if not exists store_version_date timestamptz, -- when that version was released
  add column if not exists store_checked_at   timestamptz; -- when we last asked the App Store
