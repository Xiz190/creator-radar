import { SiteHeader } from "@/components/site-header";
import { NotFoundContent } from "@/components/not-found-content";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <NotFoundContent />
      </div>
    </main>
  );
}
