import { NextResponse } from "next/server";
import { requireAdminToken, isDbAvailable } from "@/lib/db";
import {
  ensureMonitorSchema,
  setItemRead,
  setItemStarred,
  setItemNote,
  markAllReadByDepartment,
  getItemDetailBySourceAndUrl,
} from "@/lib/monitor/db";
import { mockDelay, generateMockDetail } from "@/lib/monitor/mock";

export const dynamic = "force-dynamic";

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "1" || value === "true";
  return Boolean(value);
}

// —— 新增：GET /api/monitor/items/:sourceId?url=xxx  返回单条 item 详情 ——
//    收件箱展开详情、/items/[itemId] 页面都通过此接口获取正文段落 / 附件 / 分类信息
export async function GET(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  await ensureMonitorSchema();
  const { sourceId } = await params;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url") ?? "";
  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (!isDbAvailable()) {
    await mockDelay();
    const detail = generateMockDetail(sourceId, targetUrl);
    return NextResponse.json(detail);
  }

  const detail = await getItemDetailBySourceAndUrl(sourceId, targetUrl);
  if (!detail) {
    return NextResponse.json({ error: "Not found", sourceId, url: targetUrl }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const auth = requireAdminToken(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  await ensureMonitorSchema();
  const { sourceId } = await params;
  const body = await request.json();

  if (body.action === "markAllRead" && body.departmentName) {
    if (!isDbAvailable()) {
      await mockDelay();
      return NextResponse.json({ ok: true, action: "markAllRead", departmentName: body.departmentName });
    }
    await markAllReadByDepartment(String(body.departmentName));
    return NextResponse.json({ ok: true, action: "markAllRead", departmentName: body.departmentName });
  }

  const url = String(body.url ?? "");
  if (!url) {
    return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
  }

  if (!isDbAvailable()) {
    await mockDelay();
    return NextResponse.json({ ok: true, sourceId, url, mock: true });
  }

  if (typeof body.isRead === "boolean" || body.isRead !== undefined) {
    await setItemRead(sourceId, url, asBoolean(body.isRead));
  }
  if (typeof body.isStarred === "boolean" || body.isStarred !== undefined) {
    await setItemStarred(sourceId, url, asBoolean(body.isStarred));
  }
  // 我的备注（伴侣版 Saved 屏）。只有明确传了字符串才写——传 null/undefined
  // 表示"这次不动备注"，而不是"清空"。清空要显式传空串。
  if (typeof body.userNote === "string") {
    await setItemNote(sourceId, url, body.userNote);
  }

  return NextResponse.json({ ok: true, sourceId, url });
}
