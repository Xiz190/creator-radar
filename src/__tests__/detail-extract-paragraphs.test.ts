import { describe, expect, it } from "vitest";
import { extractParagraphs } from "@/lib/monitor/detail";

describe("正文段落提取", () => {
  it("属性值里带 > 时不截断（ElevenLabs 的 Tailwind 类名）", () => {
    const html = `<article>
      <p class="[&>strong]:tw-font-normal tw-text-gray-600">Introducing <strong>Eleven v4</strong>, our fastest and most emotive voice model.</p>
      <p>It lets creators direct pacing and emotion line by line.</p>
      <p>Available today for every plan, including the free tier.</p>
    </article>`;
    const paras = extractParagraphs(html);
    expect(paras[0]).toContain("Introducing Eleven v4");
    expect(paras.join(" ")).not.toMatch(/tw-font-normal|strong\]|">/);
  });

  it("不把 <pre> / <path> 这类 p 开头的标签当成段落", () => {
    const html = `<main>
      <pre>const x = 1; // some code block here</pre>
      <svg><path d="M0 0 L10 10 Z another long path value"></path></svg>
      <p>This is the real first paragraph of the article.</p>
      <p>And this is the second real paragraph of it.</p>
      <p>Third paragraph so the block fallback is not used.</p>
    </main>`;
    const paras = extractParagraphs(html);
    expect(paras[0]).toBe("This is the real first paragraph of the article.");
    expect(paras.some((p) => p.includes("const x"))).toBe(false);
  });
});
