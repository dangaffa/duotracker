import type { DuoStatus } from "./status";

export type App = {
  id: string;
  slug: string;
  name: string;
  developer: string | null;
  app_store_url: string | null;
  icon_url: string | null;
  status: DuoStatus;
  notes: string | null;
  app_version: string | null;
  verified_at: string;
  updated_at: string;
  app_store_id: number | null;
  /** Latest version on the App Store, from the lookup service. */
  store_version: string | null;
  store_version_date: string | null;
  store_checked_at: string | null;
};

export type StatusHistoryEntry = {
  id: number;
  status: DuoStatus;
  app_version: string | null;
  note: string | null;
  changed_at: string;
};

export type Submission = {
  id: string;
  kind: "new_app" | "update";
  app_id: string | null;
  name: string | null;
  developer: string | null;
  app_store_url: string | null;
  status: DuoStatus;
  app_version: string | null;
  details: string | null;
  submitter_name: string | null;
  state: "pending" | "approved" | "rejected";
  reviewer_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  app: Pick<App, "name" | "slug" | "status"> | null;
};
