import { NextResponse } from "next/server";
import { getPgPool } from "@/lib/db";
import { createMonitorSource } from "@/lib/monitor/db/sources";

const DEMO_SOURCES = [
  {
    departmentName: "国家版权局",
    channelName: "政策法规",
    displayName: "国家版权局·政策法规",
    type: "html_list",
    listUrl: "http://www.ncac.gov.cn/chinacopyright/channels/4026.html",
    enabled: false,
    autoMonitor: false,
    isKey: true,
    notes: "版权政策权威来源。启用前请确认 URL 可访问。",
    language: "zh" as const,
    region: "domestic" as const,
    contentCategory: "policy" as const,
  },
  {
    departmentName: "文化和旅游部",
    channelName: "通知公告",
    displayName: "文旅部·通知公告",
    type: "html_list",
    listUrl: "https://www.mct.gov.cn/whzx/tzgg/",
    enabled: false,
    autoMonitor: false,
    isKey: true,
    notes: "演出许可、行业扶持政策。启用前请确认 URL 可访问。",
    language: "zh" as const,
    region: "domestic" as const,
    contentCategory: "performance" as const,
  },
  {
    departmentName: "国家广播电视总局",
    channelName: "政策文件",
    displayName: "广电总局·政策文件",
    type: "html_list",
    listUrl: "https://www.nrta.gov.cn/col/col2047/index.html",
    enabled: false,
    autoMonitor: false,
    isKey: true,
    notes: "音乐类内容播出规范、平台监管政策。启用前请确认 URL 可访问。",
    language: "zh" as const,
    region: "domestic" as const,
    contentCategory: "policy" as const,
  },
  {
    departmentName: "中国音乐著作权协会 MCSC",
    channelName: "行业资讯",
    displayName: "MCSC·行业资讯",
    type: "html_list",
    listUrl: "http://www.mcsc.com.cn/info/1021/",
    enabled: false,
    autoMonitor: false,
    isKey: true,
    notes: "版权登记、授权费率、维权动态。启用前请确认 URL 可访问。",
    language: "zh" as const,
    region: "domestic" as const,
    contentCategory: "policy" as const,
  },
  {
    departmentName: "中国演出行业协会 CAPA",
    channelName: "行业动态",
    displayName: "CAPA·行业动态",
    type: "html_list",
    listUrl: "https://www.capa.com.cn/news/",
    enabled: false,
    autoMonitor: false,
    isKey: false,
    notes: "演出市场数据、赛事申报信息。启用前请确认 URL 可访问。",
    language: "zh" as const,
    region: "domestic" as const,
    contentCategory: "performance" as const,
  },
  {
    departmentName: "中国演出行业协会 CAPA",
    channelName: "赛事信息",
    displayName: "CAPA·赛事信息",
    type: "html_list",
    listUrl: "https://www.capa.com.cn/competition/",
    enabled: false,
    autoMonitor: false,
    isKey: false,
    notes: "音乐类赛事报名公告。启用前请确认 URL 可访问。",
    language: "zh" as const,
    region: "domestic" as const,
    contentCategory: "competition" as const,
  },
] as const;

export async function POST() {
  try {
    const pool = getPgPool();
    const results: { name: string; status: "created" | "exists" }[] = [];

    for (const src of DEMO_SOURCES) {
      const existing = await pool.query(
        `select id from monitor_sources where list_url = $1 limit 1`,
        [src.listUrl],
      );
      if (existing.rows.length > 0) {
        results.push({ name: src.displayName, status: "exists" });
        continue;
      }
      await createMonitorSource({
        ...src,
        startDate: "2024-01-01",
        maxItems: 20,
      });
      results.push({ name: src.displayName, status: "created" });
    }

    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "exists").length;

    return NextResponse.json({
      ok: true,
      message: `已写入 ${created} 个示例来源，跳过已存在 ${skipped} 个`,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
