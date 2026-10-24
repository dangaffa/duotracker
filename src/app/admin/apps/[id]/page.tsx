import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import type { App } from "@/lib/types";
import { deleteApp } from "../../actions";
import { AppForm } from "../AppForm";

export const metadata: Metadata = { title: "Edit app" };

export default function EditAppPage({ params }: PageProps<"/admin/apps/[id]">) {
  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/apps" className="text-sm text-muted hover:text-foreground">
        ← Apps
      </Link>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Editor params={params} />
      </Suspense>
    </div>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("apps").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const app = data as App;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{app.name}</h1>
        <Link href={`/apps/${app.slug}`} target="_blank" className="text-sm font-semibold text-accent">
          View public page ↗
        </Link>
      </div>
      <AppForm app={app} />
      <form action={deleteApp} className="flex justify-end">
        <input type="hidden" name="id" value={app.id} />
        <button className="btn text-[var(--status-unoptimized)]">Delete app</button>
      </form>
    </>
  );
}
