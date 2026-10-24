import type { Metadata } from "next";
import { Suspense } from "react";
import { getApps } from "@/lib/data";
import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = { title: "Suggest a change" };

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Suggest a change</h1>
        <p className="text-muted">
          Tell us when an app gets updated for the Duo, or add one that&apos;s missing.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  const apps = await getApps();
  const options = apps.map(({ id, slug, name, status }) => ({ id, slug, name, status }));
  return <SubmitForm apps={options} />;
}
