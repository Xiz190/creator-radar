import { describe, expect, it } from "vitest";
import { parseSunoBlogList } from "@/lib/monitor/suno-list";

const LIST_URL = "https://suno.com/blog";

// 2026-11 改版后的真实结构（img 属性已删减）
const FEATURED = `<section aria-label="Featured"><article class="grid gap-8"><a tabindex="-1" aria-hidden="true" class="group block aspect-video" href="/blog/behind-the-scenes-make-what-moves-you"><img src="x.jpg"/></a><div><a class="uppercase" href="/blog/category/spotlights">Spotlights</a><h2 class="font-serif"><a class="transition-opacity" href="/blog/behind-the-scenes-make-what-moves-you">Behind the Scenes: Make what moves you</a></h2><p class="text-lg">Nina McNeely brings Braylon Browner&#x27;s visions to life.</p><p class="flex"><span>By <span>Team Suno</span></span><span aria-hidden="true">·</span><time dateTime="2026-10-13T19:01:53.802Z">Oct 13, 2026</time></p></div></article></section>`;

const CARD = `<article class="flex flex-col"><a class="group flex flex-col" href="/blog/introducing-speech-beta"><div class="aspect-video"><img src="y.jpg"/></div><p class="mt-5 uppercase">Product updates</p><h3 class="mt-2 font-serif">Introducing Speech (beta)</h3></a><div class="mt-3"><p class="flex"><span>By <span>Jack Brody</span></span><span aria-hidden="true">·</span><time dateTime="2026-10-01T20:35:00.000Z">Oct 1, 2026</time></p></div></article>`;

// 改版前的结构：标题 h2、日期为 <a> 内纯文本
const LEGACY = `<article><a class="group flex flex-col gap-0" href="/blog/suno-v4"><h2 class="x">Introducing v4</h2><p><span>By Team Suno</span><span>·</span><span>Nov 19, 2024</span></p></a></article>`;

describe("parseSunoBlogList", () => {
  it("解析改版后的 featured（h2）和普通卡片（h3 + time dateTime）", () => {
    expect(parseSunoBlogList(FEATURED + CARD, LIST_URL, 10)).toEqual([
      {
        title: "Behind the Scenes: Make what moves you",
        url: "https://suno.com/blog/behind-the-scenes-make-what-moves-you",
        listPublishedAt: "2026-10-13",
      },
      {
        title: "Introducing Speech (beta)",
        url: "https://suno.com/blog/introducing-speech-beta",
        listPublishedAt: "2026-10-01",
      },
    ]);
  });

  it("兼容改版前的纯文本日期", () => {
    expect(parseSunoBlogList(LEGACY, LIST_URL, 10)).toEqual([
      { title: "Introducing v4", url: "https://suno.com/blog/suno-v4", listPublishedAt: "2024-11-19" },
    ]);
  });

  it("同一篇只收一次，并遵守 limit", () => {
    expect(parseSunoBlogList(CARD + CARD + FEATURED, LIST_URL, 10)).toHaveLength(2);
    expect(parseSunoBlogList(FEATURED + CARD, LIST_URL, 1)).toHaveLength(1);
  });

  it("缺标题或日期的卡片跳过", () => {
    const noDate = CARD.replace(/<time[\s\S]*?<\/time>/, "");
    expect(parseSunoBlogList(noDate, LIST_URL, 10)).toEqual([]);
  });
});
