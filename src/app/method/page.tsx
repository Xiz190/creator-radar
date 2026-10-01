import { SiteHeader } from "@/components/site-header";
import { MethodContent } from "@/components/method-content";

export const metadata = {
  title: "方法说明 · 创作者雷达",
  description: "创作者雷达如何识别信号、如何给内容评分、创作者视角如何生成——后台方法的一次性说明。",
};

export default function MethodPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <MethodContent />
    </main>
  );
}
