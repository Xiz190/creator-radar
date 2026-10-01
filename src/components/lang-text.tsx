"use client";

import { usePrefs } from "@/contexts/prefs-context";

// 服务端页面里的双语文字：服务端拿不到用户的语言偏好（存在浏览器里），
// 把中英两份都交给这个小客户端组件，由它按当前语言显示。首屏按默认中文渲染，与其他组件一致。
export function LangText({ zh, en }: { zh: string; en: string }) {
  const { language } = usePrefs();
  return <>{language === "en" ? en : zh}</>;
}
