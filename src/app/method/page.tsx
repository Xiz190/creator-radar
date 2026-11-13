import { SiteHeader } from "@/components/site-header";
import { MethodContent } from "@/components/method-content";

export const metadata = {
  title: "Method · Creator Radar",
  description: "How Creator Radar finds signals, scores items and writes the creator lens.",
};

export default function MethodPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <MethodContent />
    </main>
  );
}
