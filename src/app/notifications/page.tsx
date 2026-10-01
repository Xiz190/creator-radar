import { SiteHeader } from "@/components/site-header";
import {
  NotificationsClient,
  NotificationsFooter,
  NotificationsIntro,
} from "@/components/notifications-client";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <NotificationsIntro />

        <NotificationsClient />

        <footer className="mt-12 border-t border-slate-200 pt-6 pb-4">
          <NotificationsFooter />
        </footer>
      </div>
    </main>
  );
}
