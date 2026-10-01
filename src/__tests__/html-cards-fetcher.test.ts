import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchHtmlCards } from "@/lib/monitor/html-cards-fetcher";

// ============================================================================
// 通用卡片式博客抓取器：Pika 2026-09 改版后，卡片开头的 <img srcSet> 有一千多字符，
// 标题和日期被挤到旧上限（链接后 1400 字符）之外 → 整个来源连续一个月扫描为 0、且不报错。
// ============================================================================

function card(slug: string, title: string, date: string, srcSetLen: number) {
  const srcSet = Array.from({ length: Math.ceil(srcSetLen / 60) }, (_, i) => `/_next/image?url=%2Fblog%2F${slug}.webp&w=${i}`).join(", ");
  // 与真实 Pika 页面同构：<a> 自带一长串 class，所以上一张卡的标题/日期离下一个链接超过 250 字符
  const cls = "group relative isolate flex w-full flex-col gap-[clamp(24px,1.667vw,32px)] rounded-xs focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-4 motion-reduce:transition-none";
  return `<li class="flex" style="opacity:0;transform:translateY(135px)"><a aria-labelledby="_R_${slug}_" class="${cls}" href="/blog/${slug}"><div><img alt="" srcSet="${srcSet}"/></div>`
    + `<div><h3>${title}</h3><p>${date}</p></div></a></li>`;
}

function mockHtml(html: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(html, { status: 200 })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchHtmlCards", () => {
  it("卡片开头有很长的图片 srcSet 时，仍取到标题和日期", async () => {
    mockHtml(`<ul>${card("pika-music", "Introducing Pika Music", "August 18, 2026", 2500)}${card("new-pika", "Welcome to the New Pika", "September 17, 2026", 2500)}</ul>`);
    const items = await fetchHtmlCards("https://pika.art/blog", 10);
    expect(items).toEqual([
      { title: "Introducing Pika Music", url: "https://pika.art/blog/pika-music", listPublishedAt: "2026-08-18" },
      { title: "Welcome to the New Pika", url: "https://pika.art/blog/new-pika", listPublishedAt: "2026-09-17" },
    ]);
  });

  it("卡片块止于下一篇文章的链接，不会借用后一张卡的日期", async () => {
    // 第一张卡没有日期，第二张有：第一张应被跳过，而不是拿到第二张的日期
    mockHtml(`<a href="/blog/no-date-post"><h3>A post without any date</h3></a><a href="/blog/dated-post"><h3>A dated post here</h3><time datetime="2026-09-01">x</time></a>`);
    const items = await fetchHtmlCards("https://example.com/blog", 10);
    expect(items.map((i) => i.url)).toEqual(["https://example.com/blog/dated-post"]);
  });
});
