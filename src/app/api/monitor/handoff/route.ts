import { NextResponse } from "next/server";
import { isDbAvailable } from "@/lib/db";
import {
  ensureMonitorSchema,
  createHandoff,
  getPendingHandoffs,
  consumeHandoff,
  expireStaleHandoffs,
} from "@/lib/monitor/db";

export const dynamic = "force-dynamic";

/**
 * 「交接」接口：手机端把一条推给桌面端。
 *
 *   POST { sourceId, url, title }  → 排入一条（伴侣版的 On desktop）
 *   POST { ack: <id> }             → 桌面端展示完之后确认消费
 *   GET                            → 桌面端轮询：取还没消费的
 *
 * ⚠️ 这是**轮询**不是推送——桌面端每 8 秒问一次。桌面标签页关着就不会弹。
 * 见 db/handoffs.ts 里更完整说明。别在文案里说成"随时送达的系统通知"。
 *
 * 不加 requireAdminToken：读接口本来就不鉴权（站内检索也一样），
 * 而写接口只写一条交接记录，没有破坏性。与 PATCH /items/[sourceId] 的
 * isRead/isStarred 同级。
 */
export async function GET() {
  await ensureMonitorSchema();
  if (!isDbAvailable()) return NextResponse.json({ ok: true, handoffs: [] });
  try {
    // 顺手作废过期的，避免几天后打开桌面突然弹出一条上周的
    await expireStaleHandoffs(24);
    const handoffs = await getPendingHandoffs(5);
    return NextResponse.json({ ok: true, handoffs });
  } catch {
    return NextResponse.json({ ok: true, handoffs: [] });
  }
}

export async function POST(request: Request) {
  await ensureMonitorSchema();
  const body = await request.json().catch(() => ({}));

  // ack：桌面端展示完，标记消费
  const ack = Number(body?.ack);
  if (Number.isFinite(ack) && ack > 0) {
    if (isDbAvailable()) await consumeHandoff(ack).catch(() => {});
    return NextResponse.json({ ok: true, acked: ack });
  }

  const sourceId = String(body?.sourceId ?? "").trim();
  const url = String(body?.url ?? "").trim();
  const title = String(body?.title ?? "").trim();
  if (!sourceId || !url) {
    return NextResponse.json({ ok: false, error: "sourceId and url required" }, { status: 400 });
  }
  if (!isDbAvailable()) {
    return NextResponse.json({ ok: false, error: "数据库不可用" }, { status: 503 });
  }

  const id = await createHandoff(sourceId, url, title || sourceId);
  return NextResponse.json({ ok: true, id });
}
