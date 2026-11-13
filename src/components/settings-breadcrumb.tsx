import Link from "next/link";
import { LangText } from "@/components/lang-text";

type SettingsBreadcrumbProps = {
  current: string;
  className?: string;
};

export function SettingsBreadcrumb({ current, className = "" }: SettingsBreadcrumbProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm text-slate-500 ${className}`}>
      <Link href="/monitor" className="hover:text-slate-900">
        <LangText zh="系统设置" en="Admin" />
      </Link>
      <span>/</span>
      <span className="text-slate-900">{current}</span>
    </div>
  );
}
