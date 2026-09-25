"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, Radar, Activity, type LucideIcon } from "lucide-react";
import { usePrefs } from "@/contexts/prefs-context";
import { isCompanionPath } from "@/lib/companion/nav";
import { useT, type TranslationKey } from "@/lib/i18n";

const TABS: { href: string; labelKey: TranslationKey; Icon: LucideIcon }[] = [
  { href: "/", labelKey: "nav.tab.workspace", Icon: Home },
  { href: "/inbox", labelKey: "nav.tab.inbox", Icon: Inbox },
  { href: "/signals", labelKey: "nav.tab.signals", Icon: Radar },
  { href: "/monitor", labelKey: "nav.tab.monitor", Icon: Activity },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { focusMode, language } = usePrefs();
  const t = useT(language);
  if (focusMode) return null;

  // 伴侣版有自己的底部 tab bar
  if (isCompanionPath(pathname)) return null;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm sm:hidden">
      <div className="grid grid-cols-4 safe-area-inset-bottom">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 px-1 py-2 text-center transition-colors ${
                active ? "text-[var(--brand)]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {active && (
                <span className="absolute top-0 inset-x-4 h-0.5 rounded-full" style={{ backgroundColor: "var(--brand)" }} />
              )}
              <tab.Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className={`text-[10px] font-medium leading-tight ${active ? "text-[var(--brand)]" : "text-slate-500"}`}>
                {t(tab.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
