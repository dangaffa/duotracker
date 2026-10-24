import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-4 border-b border-border pb-3 text-sm font-semibold">
        <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-fg">ADMIN</span>
        <Link href="/admin" className="text-muted hover:text-foreground">Review queue</Link>
        <Link href="/admin/apps" className="text-muted hover:text-foreground">Apps</Link>
      </nav>
      {children}
    </div>
  );
}
