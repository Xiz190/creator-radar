"use client";

import { getImportanceBadgeMeta } from "@/lib/monitor/priority-levels";
import { usePrefs } from "@/contexts/prefs-context";

type ImportanceBadgeProps = {
  level: string | null | undefined;
  keywordScore?: number | string | null;
  showLegacyTag?: boolean;
  className?: string;
};

export function ImportanceBadge({
  level,
  keywordScore,
  showLegacyTag = false,
  className,
}: ImportanceBadgeProps) {
  const { language } = usePrefs();
  const meta = getImportanceBadgeMeta(level, keywordScore);
  if (!meta) return null;

  const isLegacy = level === "加急推荐";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 ${meta.className} ${className ?? ""}`}
      title={meta.description}
    >
      <span>{language === "en" ? meta.labelEn : meta.label}</span>
      {showLegacyTag && isLegacy ? (
        <span className="ml-1 text-[11px] text-rose-600">{language === "en" ? "(legacy)" : "(旧)"}</span>
      ) : null}
    </span>
  );
}
