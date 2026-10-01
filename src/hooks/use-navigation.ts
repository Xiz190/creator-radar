"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { TranslationKey } from "@/lib/i18n";
import {
  Bell, Calculator, ChartColumn, ClipboardList, House, Inbox, Mail, Pin, Smartphone,
  RadioTower, Rocket, Save, Settings, TrendingUp, type LucideIcon,
} from "lucide-react";
import { isOwnerOnlyPage } from "@/lib/owner-only";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  i18nKey?: TranslationKey;
};

type MenuItem = {
  href: string;
  label: string;
  labelEn: string;
  icon: LucideIcon;
  desc: string;
  descEn: string;
};

type MenuDivider = { type: "divider"; groupLabel?: string; groupLabelEn?: string };

type MenuEntry = MenuItem | MenuDivider;

const primaryNav: NavItem[] = [
  { href: "/", label: "我的工作台", icon: House, i18nKey: "nav.workspace" },
  { href: "/inbox", label: "全部动态", icon: Inbox, i18nKey: "nav.inbox" },
  { href: "/subscribe", label: "关注设置", icon: Bell, i18nKey: "nav.subscribe" },
];

const settingsMenu: MenuEntry[] = [
  { type: "divider", groupLabel: "数据洞察", groupLabelEn: "Insights" },
  { href: "/signals", label: "高价值信号", labelEn: "Signal Radar", icon: RadioTower, desc: "AI工具更新、演出机会、申报截止预警", descEn: "AI tool updates, gigs, deadline alerts" },
  { href: "/dashboard", label: "数据趋势", labelEn: "Trends", icon: ChartColumn, desc: "两个模块的动态更新趋势与分布", descEn: "How updates trend and spread over time" },
  { type: "divider", groupLabel: "管理后台", groupLabelEn: "Admin" },
  { href: "/monitor", label: "系统管理", labelEn: "Admin", icon: Settings, desc: "监测任务、来源、关键词、诊断（管理员）", descEn: "Crawl jobs, sources, keywords, diagnostics (admin)" },
  { type: "divider", groupLabel: "设置与帮助", groupLabelEn: "Settings & help" },
  { href: "/stats", label: "个人统计", labelEn: "My stats", icon: TrendingUp, desc: "阅读完成率、关键词、最活跃来源", descEn: "Reading rate, keywords, most active sources" },
  { href: "/readinglist", label: "稍后读清单", labelEn: "Read later", icon: Pin, desc: "在收件箱标记「稍后读」的条目", descEn: "Items you marked to read later" },
  { href: "/alerts", label: "提醒规则", labelEn: "Alert rules", icon: Bell, desc: "设置关键词频率提醒规则", descEn: "Keyword frequency alert rules" },
  { href: "/digest", label: "今日日报预览", labelEn: "Daily digest preview", icon: Mail, desc: "生成并预览 HTML 邮件摘要", descEn: "Build and preview the HTML email digest" },
  { href: "/settings/data", label: "数据备份/恢复", labelEn: "Backup & restore", icon: Save, desc: "导出便签、标签、偏好为 JSON，可再导入", descEn: "Export notes, tags and prefs as JSON and import them back" },
  { href: "/changelog", label: "更新日志", labelEn: "Changelog", icon: ClipboardList, desc: "查看各版本新增功能", descEn: "What's new in each version" },
  { href: "/subscribe#roadmap", label: "版本规划", labelEn: "Roadmap", icon: Rocket, desc: "了解即将上线的功能", descEn: "What's coming next" },
  { href: "/m", label: "手机伴侣版", labelEn: "Phone companion", icon: Smartphone, desc: "专为手机设计的速读版（英文界面）", descEn: "A quick-reading version built for phones" },
  { href: "/method", label: "方法说明", labelEn: "How it works", icon: Calculator, desc: "信号识别、评分权重、创作者视角的后台机制说明", descEn: "How signals, scoring and the creator lens work" },
];

function isNavActiveFn(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  const basePath = href.split("?")[0];
  if (basePath === "/inbox") {
    return (
      pathname === "/inbox" ||
      pathname.startsWith("/inbox/") ||
      pathname.startsWith("/items/") ||
      pathname.startsWith("/compare") ||
      pathname.startsWith("/departments")
    );
  }
  return pathname === basePath || pathname.startsWith(basePath + "/");
}

export function isMenuDivider(entry: MenuEntry): entry is MenuDivider {
  return "type" in entry && entry.type === "divider";
}

/** 演示站访客看到的设置菜单：去掉作者专属页（清单见 lib/owner-only.ts），再去掉因此变空的分组标题 */
export function visitorSettingsMenu(menu: MenuEntry[]): MenuEntry[] {
  const kept = menu.filter((e) => isMenuDivider(e) || !isOwnerOnlyPage(e.href));
  return kept.filter((e, i) => !isMenuDivider(e) || (i + 1 < kept.length && !isMenuDivider(kept[i + 1])));
}

export function computeActiveNavLabel(pathname: string): string {
  const active = primaryNav.find((n) => isNavActiveFn(n.href, pathname));
  if (active) return active.label;
  if (
    pathname.startsWith("/compare") ||
    pathname.startsWith("/items") ||
    pathname.startsWith("/departments") ||
    pathname.startsWith("/signals")
  ) {
    return "动态资讯";
  }
  if (
    pathname.startsWith("/monitor") ||
    pathname.startsWith("/keywords") ||
    pathname.startsWith("/sources")
  ) {
    return "系统管理";
  }
  if (pathname.startsWith("/research")) {
    return "我的工作台";
  }
  if (pathname.startsWith("/dashboard")) {
    return "数据洞察";
  }
  return "未知";
}

export { isNavActiveFn, primaryNav, settingsMenu };

export function useNavigation() {
  const pathname = usePathname();

  const isNavActive = (href: string) => {
    if (pathname === null) return false;
    return isNavActiveFn(href, pathname);
  };

  const activeNavLabel = useMemo(() => {
    if (pathname === null) return "未知";
    return computeActiveNavLabel(pathname);
  }, [pathname]);

  return {
    pathname,
    primaryNav,
    settingsMenu,
    isNavActive,
    activeNavLabel,
    isMenuDivider,
  };
}
