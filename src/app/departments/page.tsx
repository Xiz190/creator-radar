"use client";

import { usePrefs } from "@/contexts/prefs-context";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export default function DepartmentsPage() {
  const en = usePrefs().language === "en";
  const router = useRouter();

  useEffect(() => {
    router.replace("/inbox?view=byDepartment");
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <div className="text-sm text-slate-500">{en ? "Redirecting…" : "正在跳转…"}</div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{en ? "Sources" : "来源目录"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {en ? "This page now lives in the News Feed. Taking you to the by-source view…" : "已并入「全部动态」，即将跳转到按来源视图…"}
        </p>
      </div>
    </main>
  );
}
