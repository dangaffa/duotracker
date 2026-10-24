-- Fix: approving a "new app" submission failed with
--   new row for relation "submissions" violates check constraint "kind_shape"
-- because approve_submission() links the submission to the app it created, and the
-- original rule required new-app submissions to never have an app_id.
-- New rule: a new-app suggestion has no app while it's pending; once reviewed it may
-- point at the app it became.

alter table public.submissions drop constraint kind_shape;

alter table public.submissions add constraint kind_shape check (
  (kind = 'update'  and app_id is not null) or
  (kind = 'new_app' and name is not null and (app_id is null or state <> 'pending'))
);
