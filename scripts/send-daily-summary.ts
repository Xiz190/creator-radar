// 每天发一封日报邮件（GitHub Actions 定时调用，见 .github/workflows/daily-summary.yml）。
// 取数和模板与 /digest 预览页共用；经 Resend 发送。
// 需要环境变量：DATABASE_URL、RESEND_API_KEY、DAILY_SUMMARY_EMAIL；可选 DAILY_SUMMARY_LANG=zh|en（默认 en）、DRY_RUN=1（只打印不发）
import { getPgPool } from "@/lib/db";
import { getDigestItems } from "@/lib/monitor/db/digest";
import { renderDigestEmail } from "@/lib/monitor/digest-email";

async function main() {
  const lang = process.env.DAILY_SUMMARY_LANG === "zh" ? "zh" : "en";
  const to = (process.env.DAILY_SUMMARY_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const key = process.env.RESEND_API_KEY ?? "";
  const dryRun = process.env.DRY_RUN === "1";

  const items = await getDigestItems({ lang });
  await getPgPool().end();
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const { subject, html, text } = renderDigestEmail({ date, items, lang });
  console.log(`[daily-summary] ${subject}`);

  if (dryRun) {
    console.log(text);
    return;
  }
  if (!key || to.length === 0) {
    console.error("[daily-summary] 缺少 RESEND_API_KEY 或 DAILY_SUMMARY_EMAIL，未发送");
    process.exit(1);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    // 没有自己的域名时只能用 Resend 的公共发件地址，且只能发到注册 Resend 的邮箱
    body: JSON.stringify({ from: "Creator Radar <onboarding@resend.dev>", to, subject, html, text }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`[daily-summary] Resend 返回 ${res.status}: ${body.slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`[daily-summary] 已发送到 ${to.length} 个地址：${body.slice(0, 120)}`);
}

main().catch((e) => {
  console.error("[daily-summary] 失败：", e);
  process.exit(1);
});
