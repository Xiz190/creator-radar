import type { Metadata, Viewport } from "next";
import { CompanionTabBar } from "@/components/companion/companion-tab-bar";

export const metadata: Metadata = {
  title: "Creator Radar",
  description: "Creator Radar companion — AI tool and industry signals for independent creators",
  manifest: "/companion-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Radar",
  },
};

export const viewport: Viewport = {
  themeColor: "#b23c17",
  width: "device-width",
  initialScale: 1,
};

export default function CompanionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // 嵌套 layout 改不了 <html lang>（那是 root layout 的），用子树 lang 达到同样效果。
    //
    // 宽度上限：伴侣版是手机界面，但在桌面浏览器里铺满 1440px 会看起来像坏了。
    // 限到 480px 并居中——手机上（<480）照旧全屏，桌面上显示为居中一列。
    // 固定定位的底部导航与弹层不受这里约束，要各自收窄（见 companion-tab-bar
    // 与 filter-sheet 里的 left-1/2 -translate-x-1/2 max-w-[480px]）。
    <div
      data-companion
      lang="en"
      className="mx-auto min-h-screen w-full max-w-[480px] bg-slate-50 text-slate-900 antialiased sm:border-x sm:border-slate-200"
    >
      {/* 底部 tab bar 是 fixed，给内容留出等高的下边距 */}
      <div className="pb-[82px]">{children}</div>
      <CompanionTabBar />
    </div>
  );
}
