# DuoTracker

Community-tracked compatibility of iPhone apps with the iPhone Duo, in the spirit of ProtonDB.

Every app gets one of four ratings:

| Value in DB   | Label                       |
| ------------- | --------------------------- |
| `unoptimized` | Fully Unoptimized           |
| `ios27`       | iOS 27 Optimized            |
| `duo_issues`  | Duo Optimized (with issues) |
| `duo`         | Designed for Duo            |

Built with Next.js 16 (App Router, Cache Components) and Supabase (Postgres + auth).

## Running locally

```bash
npm install
npm run dev
```

Without Supabase credentials the site runs on two demo apps, so you can work on the UI right away.

## Connecting Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`
   (edit the admin email in `seed.sql` to your own first).
3. In **Authentication → URL Configuration**, set the Site URL to your site (e.g. `http://localhost:3000`)
   and add `http://localhost:3000/auth/callback` plus your production `/auth/callback` URL to the redirect allow list.
4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key
   (**Project Settings → API Keys**).
5. Restart `npm run dev`.

## How submissions work

- Anyone can use **/submit** to propose a status change for a listed app or to add a new app. No login.
- Suggestions go through the `submit_suggestion()` database function, which rate-limits to 10 per hour per
  (hashed) IP and rejects duplicate app names. A hidden honeypot field drops most bots.
- Nothing is published until an admin approves it. Submissions aren't readable by the public.

## Admin

Sign in at **/admin/login** with an email listed in the `admins` table (you'll get a magic link).

- **/admin**: the review queue. Approve (optionally overriding the proposed rating) or reject, with an optional note.
  Approving a new app creates it, and approving an update changes its status and "last verified" date.
- **/admin/apps**: every app, with a status dropdown that saves instantly, a full edit form per app,
  **+ Add app**, and a **bulk CSV import** (`name,status,developer,app_store_url`; you can paste rows from a spreadsheet).

To add another admin:

```sql
insert into public.admins (email) values ('someone@example.com');
```

All write permissions are enforced in Postgres with row-level security. The Supabase dashboard's Table Editor
runs with full access, so you can also edit rows there directly.

Every status change, whether from an approval or a direct edit, is logged in `app_status_history` and shown on
the app's public page.

## Project layout

```
supabase/migrations/0001_init.sql   schema, RLS policies, submit/approve/reject functions
supabase/seed.sql                   admin email + starter apps
src/lib/status.ts                   the four ratings: labels, descriptions, colours
src/lib/data.ts                     cached public reads (tag: "apps")
src/app/about/                      About page + rating comparer
src/components/duo/DuoMockup.tsx    illustrated Duo inner display running the fictional "Fieldnote" app
src/app/submit/                     public suggestion form + server action
src/app/admin/                      review queue, app editor, CSV import
```

`reference/` holds the screenshots and device bezels the illustrations are modelled on. They aren't served by the site.
