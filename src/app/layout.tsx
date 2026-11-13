import type { Metadata, Viewport } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import { PrefsProvider } from "@/contexts/prefs-context";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { NavigationProgress } from "@/components/navigation-progress";
import { HandoffListener } from "@/components/handoff-listener";
import { DemoModeGate } from "@/components/demo-mode-gate";
import { CompanionHint } from "@/components/companion-hint";
import { ViewportZoomWatcher } from "@/components/viewport-zoom-watcher";

// 编辑台字体系统：衬线标题(Newsreader) + 无衬线正文(IBM Plex Sans) + 等宽数据(IBM Plex Mono)
const serif = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

const sans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Creator Radar",
  description: "Creator Radar: an industry radar for independent music creators. It reads AI-tool and industry news and says what each item means for your own work.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Radar",
  },
};

export const viewport: Viewport = {
  themeColor: "#b23c17",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col pb-16 sm:pb-0">
        <PrefsProvider>
          <NavigationProgress />
          {/* 公开演示站：访客只读提示条（本地开发/作者登录后不渲染） */}
          <DemoModeGate />
          {/* 手机打开桌面站时提示有伴侣版（/m），可关闭，不强制跳转 */}
          <CompanionHint />
          {children}
          <ChatbotWidget />
          <MobileBottomNav />
          <ViewportZoomWatcher />
          {/* 手机端推过来的条目在这里弹出来。组件自己会在 /m 下返回 null */}
          <HandoffListener />
          <ServiceWorkerRegistration />
        </PrefsProvider>
      </body>
    </html>
  );
}
