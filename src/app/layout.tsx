import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "DuoTracker", template: "%s · DuoTracker" },
  description: "Community-tracked compatibility of iPhone apps with the iPhone Duo's displays.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span aria-hidden className="inline-flex h-6 w-8 overflow-hidden rounded-md border-2 border-foreground">
                <span className="w-1/2 border-r border-foreground/40 bg-accent" />
                <span className="w-1/2" />
              </span>
              DuoTracker
            </Link>
            <div className="ml-auto flex items-center gap-5 text-sm font-medium text-muted">
              <Link href="/" className="hover:text-foreground">Apps</Link>
              <Link href="/about" className="hover:text-foreground">About</Link>
              <Link href="/submit" className="btn btn-primary !py-1.5">Suggest</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          DuoTracker is a community project and isn&apos;t affiliated with Apple.
        </footer>
      </body>
    </html>
  );
}
