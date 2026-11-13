// 每日日报邮件：/digest 预览页和定时发信脚本共用同一个模板，保证"预览看到的 = 邮箱收到的"。
// 纯函数，不碰数据库；标题、摘要都来自外站，一律先转义再拼进 HTML。
import { categoryDisplayLabel } from "./content-meta";

export type DigestLang = "zh" | "en";

export type DigestEntry = {
  title: string;
  url: string;
  sourceId: string;
  source: string;
  publishedAt: string | null;
  /** 主信号分类（原始中文 key，如 "A·AI工具更新"）；没有时为 null */
  category: string | null;
  lens: string | null;
};

export const SITE_URL = "https://creator-radar-xiz.vercel.app";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeUrl(u: string): string {
  return /^https?:\/\//i.test(u) ? escapeHtml(u) : "#";
}

export function renderDigestEmail(opts: { date: string; items: DigestEntry[]; lang: DigestLang; siteUrl?: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const { date, items, lang } = opts;
  const site = opts.siteUrl ?? SITE_URL;
  const en = lang === "en";
  const L = (zh: string, e: string) => (en ? e : zh);
  const other = L("其他", "Other");

  // 按主分类分组，组内保持传入顺序（已按重要度排好）
  const groups = new Map<string, DigestEntry[]>();
  for (const it of items) {
    const key = it.category ? categoryDisplayLabel(it.category, lang) : other;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }

  const subject = en
    ? `Creator Radar · ${date} · ${items.length} new ${items.length === 1 ? "item" : "items"}`
    : `创作者雷达日报 · ${date} · ${items.length} 条新动态`;

  const itemHtml = (it: DigestEntry) => `
    <tr><td style="padding:10px 32px">
      <a href="${safeUrl(it.url)}" style="font-size:14px;font-weight:600;color:#1b1a17;text-decoration:none;line-height:1.4">${escapeHtml(it.title)}</a>
      <div style="margin-top:3px;font-size:12px;color:#6b675f">${escapeHtml(it.source)}${it.publishedAt ? " · " + escapeHtml(it.publishedAt.slice(0, 10)) : ""}</div>
      ${it.lens ? `<div style="margin-top:6px;font-family:Georgia,'Songti SC',serif;font-size:14px;line-height:1.5;color:#b23c17">${escapeHtml(it.lens)}</div>` : ""}
    </td></tr>`;

  const sections = [...groups.entries()]
    .map(
      ([label, list]) => `
    <tr><td style="padding:20px 32px 4px">
      <div style="font-size:12px;font-weight:600;color:#6b675f;border-bottom:1px solid #e4e1d9;padding-bottom:6px">${escapeHtml(label)} · ${list.length}</div>
    </td></tr>${list.map(itemHtml).join("")}`,
    )
    .join("");

  const empty = `<tr><td style="padding:28px 32px;font-size:14px;color:#6b675f">${L("过去 24 小时没有新的重点条目。", "Nothing new worth flagging in the last 24 hours.")}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="${en ? "en" : "zh-CN"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f6f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1b1a17">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f6f3;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e4e1d9">
        <tr><td style="padding:28px 32px 18px;border-bottom:3px solid #b23c17">
          <div style="font-size:12px;font-weight:600;color:#b23c17">${L("创作者雷达", "Creator Radar")}</div>
          <div style="margin-top:4px;font-family:Georgia,'Songti SC',serif;font-size:24px;color:#1b1a17">${L("今天值得看的", "Worth your time today")}</div>
          <div style="margin-top:4px;font-size:12px;color:#6b675f">${escapeHtml(date)} · ${en ? `${items.length} from the last 24 hours` : `近 24 小时 ${items.length} 条`}</div>
        </td></tr>
        ${items.length ? sections : empty}
        <tr><td style="padding:22px 32px;border-top:1px solid #efede8;background-color:#fbfaf7">
          <div style="font-size:12px;color:#6b675f;text-align:center">
            <a href="${safeUrl(site)}" style="color:#b23c17;text-decoration:none">${L("打开创作者雷达 →", "Open Creator Radar →")}</a><br>
            <span style="color:#8f897d">${L("红字是 AI 写的创作者视角，只是看法，用不用由你定。", "The red lines are an AI-written creator lens. It comments; you decide.")}</span>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    subject,
    "",
    ...(items.length
      ? [...groups.entries()].flatMap(([label, list]) => [
          `## ${label}`,
          ...list.flatMap((it) => [`- ${it.title} (${it.source})`, ...(it.lens ? [`  ${it.lens}`] : []), `  ${it.url}`]),
          "",
        ])
      : [L("过去 24 小时没有新的重点条目。", "Nothing new worth flagging in the last 24 hours.")]),
    site,
  ].join("\n");

  return { subject, html, text };
}
