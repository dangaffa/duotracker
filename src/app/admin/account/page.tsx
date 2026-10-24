import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Account</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const { user } = await requireAdmin();
  return (
    <>
      <p className="text-muted">
        Signed in as <strong className="text-foreground">{user.email}</strong>.
      </p>
      <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Password</h2>
        <p className="text-sm text-muted">
          Lets you sign in without waiting for an email. The email link still works as a backup.
        </p>
        <PasswordForm email={user.email ?? ""} />
      </section>
    </>
  );
}
