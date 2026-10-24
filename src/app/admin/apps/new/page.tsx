import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { AppForm } from "../AppForm";

export const metadata: Metadata = { title: "Add app" };

export default function NewAppPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/apps" className="text-sm text-muted hover:text-foreground">
        ← Apps
      </Link>
      <h1 className="text-2xl font-bold">Add app</h1>
      <Suspense>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  await requireAdmin();
  return <AppForm />;
}
