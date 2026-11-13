import { NextResponse } from "next/server";
import { isDbAvailable } from "@/lib/db";
import { getDigestItems } from "@/lib/monitor/db/digest";
import { renderDigestEmail } from "@/lib/monitor/digest-email";

export const dynamic = "force-dynamic";

// /digest 预览页用：和定时发信脚本走同一份取数 + 同一个模板
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang") === "zh" ? "zh" : "en";
  if (!isDbAvailable()) return NextResponse.json({ ok: false, code: "no-db" }, { status: 503 });
  const items = await getDigestItems({ lang });
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  return NextResponse.json({ ok: true, date, items, ...renderDigestEmail({ date, items, lang }) });
}
