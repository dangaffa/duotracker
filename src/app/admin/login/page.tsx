import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-4 py-10">
      <h1 className="text-2xl font-bold">Admin sign in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
