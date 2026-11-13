import { describe, expect, it } from "vitest";
import { renderDigestEmail, type DigestEntry } from "./digest-email";

const item = (over: Partial<DigestEntry> = {}): DigestEntry => ({
  title: "Suno launches v6",
  url: "https://suno.com/blog/v6",
  sourceId: "suno_blog",
  source: "Suno",
  publishedAt: "2026-11-12T08:00:00Z",
  category: "A·AI工具更新",
  lens: "Try it on a short demo.",
  ...over,
});

describe("renderDigestEmail", () => {
  it("英文：主题、分组标题、lens 都是英文", () => {
    const r = renderDigestEmail({ date: "2026-11-13", items: [item()], lang: "en" });
    expect(r.subject).toBe("Creator Radar · 2026-11-13 · 1 new item");
    expect(r.html).toContain("AI tool update · 1");
    expect(r.html).toContain("Try it on a short demo.");
    expect(r.html).not.toMatch(/[一-鿿]/);
  });

  it("中文：主题和分组用中文", () => {
    const r = renderDigestEmail({ date: "2026-11-13", items: [item(), item({ category: "B·创作机会" })], lang: "zh" });
    expect(r.subject).toContain("2 条新动态");
    expect(r.html).toContain("创作机会 · 1");
  });

  it("外站标题里的 HTML 被转义，不会执行", () => {
    const r = renderDigestEmail({ date: "d", items: [item({ title: '<img src=x onerror="alert(1)">' })], lang: "en" });
    expect(r.html).not.toContain("<img src=x");
    expect(r.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("非 http 链接不会进 href", () => {
    const r = renderDigestEmail({ date: "d", items: [item({ url: "javascript:alert(1)" })], lang: "en" });
    expect(r.html).not.toContain("javascript:");
  });

  it("没有条目时给出明确说明", () => {
    const r = renderDigestEmail({ date: "d", items: [], lang: "en" });
    expect(r.subject).toContain("0 new items");
    expect(r.text).toContain("Nothing new");
  });
});
