# Data sources & known limitations

**English** · [中文](数据源说明-已知局限.md)

> A transparent account of where the data comes from, written for reviewers. The ground rule: **everything comes from public APIs, public RSS feeds, or public web pages. Nothing behind a login, no getting around anti-bot protection, no private data.**

---

## 1. Sources at a glance

There are **15 active sources**, and everything collected is from 2026. The live site grows every 6 hours; current counts are at [`/api/monitor/corpus-stats`](https://creator-radar-xiz.vercel.app/api/monitor/corpus-stats). The sources fall into three groups.

### Official channels of AI creative tools (first-hand)
| Source | What it is | How it's collected |
|---|---|---|
| Suno / ElevenLabs / Pika / Krea / Luma | Official blogs of AI music, video and image tools | Server-rendered HTML |
| Runway | Official news from the AI video tool | sitemap.xml |
| Mubert / Splice / Stability AI | Official blogs of AI audio and creative tools | Public RSS |

### Industry and tech media (reviews, industry news)
| Source | What it is | How it's collected |
|---|---|---|
| CDM (Create Digital Music) | Independent musicians and electronic music tools | Public RSS |
| Synthtopia | Music tech and synthesizers | Public RSS |
| Music Ally | Music industry intelligence | Public RSS |
| PetaPixel | Photography and AI imaging tools | Public RSS |
| QbitAI (量子位) | Leading Chinese AI tech outlet | Public RSS |

### Public arts funding (opportunities for creators)
| Source | What it is | How it's collected |
|---|---|---|
| China National Arts Fund | Government arts fund that posts calls for applications | Public static pages |

---

## 2. Collection methods & compliance

- **Public RSS**: feeds that media sites publish on purpose (largely for SEO). Standard, legitimate, stable.
- **Server-rendered HTML (SSR)**: official blogs whose list pages arrive fully rendered from the server, so they can be parsed statically.
- **Public APIs**: list endpoints an institution exposes openly.
- **Not collected**: anything that needs a login (WeChat official accounts, Weibo, etc.), sites that would require getting around anti-bot protection (Midjourney, Ideogram and Leonardo were dropped for this reason), and any private or personal data.

---

## 3. Data quality

- Body-text extraction quality (snapshot from September 2026): **high 475 / medium 73 / low 59 / minimal 3 / empty 2**, with about 43 items still unscored.
- Every item comes with an **AI creator-lens take** (written by an LLM from the creator-lens knowledge base) and a **value tier: core / key / medium / normal**. See §4.3 for how tiers are assigned.
- Binary attachments (PDFs, images, Office files) are detected and filed as attachments with an empty body. They **never get mistaken for body text** (see the post-mortem in §4.1).

---

## 4. Known limitations & deliberate trade-offs

> **Selection principle: fewer sources, all of them real.** A source only gets in if its body text can be extracted cleanly. If it can't (empty SPA shells, scanned PDFs, login walls, heavy anti-bot protection), I'd rather leave it out than let empty pages and garbled text into the data. The value of this tool is in the interpretation layer, *what this means for a creator*, not in raw volume. So I deliberately don't chase source count; every item should be real, readable, and worth interpreting. It's the same rule the product follows in its writing (when information is thin, say "check the original," never make things up), applied one layer down to the data.

### 4.1 Dropping CAPA (China Association of Performing Arts): a source-vetting post-mortem
- **The problem**: CAPA's site is a **single-page app** whose content is **rendered client-side**, so a plain request only gets an empty shell. Detail links are **hash-route dead links** (`#/` always bounces to the home page). The list API returns only **metadata (titles and dates)**. There's no body text and no working link to the original. Classic "you can get the list, but not the articles": **100% extraction failure**.
- **What I got wrong at first**: I marked it usable because the list API returned titles and dates. I **hadn't checked it end to end** (detail link plus body text).
- **Neither kind of detail page is extractable** (re-tested): ① the on-site `news/{id}` pages are empty Vue shells with zero paragraphs extracted; ② some details are PDF attachments that turn out to be **scanned images with no text layer**, so there's nothing to extract before OCR even enters the picture.
- **The most relevant section is dead anyway**: the "music talent support" section, the one most useful to creators, stopped updating in **2021–2022**.
- **A false-positive bug fixed along the way**: the body-quality check used to rate a scanned PDF as `high`, reading its binary bytes as 20 "paragraphs." The detail fetcher now **short-circuits on binary documents** using three signals (Content-Type, the `%PDF` magic number, and the share of garbled characters). A hit gets filed as an attachment with an `empty` body, so binary junk can't pollute the data.
- **The fix**: after testing link reachability and body quality, I **dropped the source on purpose** (keeping a title only as a lead when it's genuinely useful, never as displayable content).
- **Lesson**: vet a source **end to end** (list, detail page, link and readable body all working), not just "does the list come back."

### 4.2 Few Chinese sources for AI creative opportunities
- Most Chinese opportunity sources are government-style SPAs with the same "can't be structured" problem as above.
- For now the focus is official tool sources plus international media. **I won't add sources just to pad the list** (see the selection principle). A Chinese opportunity source gets added only if its body text extracts cleanly and it fills a specific gap in perspective, not for breadth.

### 4.3 Accuracy ceiling on categories and genres
- Genre tagging uses keyword matching, so headlines without an obvious genre word land in "Other." Coverage has a hard ceiling.
- Value tiers combine two judgments. Each is stored separately, and the final tier is always computed from both by the same rule:
  - **Keyword signal score**: matched keywords add up by weight (tool names, launch verbs, version numbers, etc., with **headline matches weighted higher**), and thresholds split items into core / key / medium / normal. It catches major launches, but it can't read, so general AI news with nothing to do with making music can still score high.
  - **LLM value judgment**: when the creator lens is written, the LLM also rates the item as high / medium / low value for creators.
  - **The rule**: the LLM has the final say (high → key, medium → medium, low → normal). When keywords rate an item core, LLM high → **core**, medium → key (so major launches don't get buried), low → normal (off-topic news still drops). Until the LLM has weighed in, the keyword tier stands.
  - This rule came out of a bug fix in October 2026: the two judgments used to write the same field, and whichever wrote last won, which pushed major launches like Suno v6 down to "medium."
- Moving categories onto LLM judgment too is on the roadmap (§6.3).
- Categories and genres could likewise move to LLM judgment for better accuracy.

### 4.4 The region dimension is weak
- A "China vs. global" split doesn't mean much for a creator radar built mostly around international tools (Chinese sources are thin). It may be replaced with a source-type dimension: official tool channel / industry media / creative opportunity.

### 4.5 No crawlable release feed for the big Chinese generators (Kling, Jimeng/Dreamina): a deliberate trade-off
- **The goal**: a creator radar should cover **major releases** of the most popular Chinese video and image generators, Kling and Jimeng (Dreamina).
- **What testing showed (going direct doesn't work)**:
  - Kling's `klingai.com/release-notes` is a **marketing page**, not a dated changelog. No `releaseNote / changelog / publishTime` fields, zero dates on the page, just one `modelUpgradeNotice` marketing string. The only APIs the page exposes are **product feature APIs** (text-to-video, image-to-video, etc.), with **no news or release endpoint**. Even reverse-engineering it wouldn't produce a dated release history.
  - Jimeng / Dreamina (`dreamina.capcut.com`) is a **pure SPA shell**. The only visible text is styling code, with zero release or date fields.
  - Neither has **RSS, a public news API, or a structured changelog**. It's "a marketing page plus feature APIs," nothing more.
- **The trade-off (not forcing it)**: connecting directly would mean **reverse-engineering, ongoing maintenance, and breaking on every redesign**, and it **still wouldn't yield a clean release feed**. The return isn't worth it. So I **deliberately don't collect their official channels** (same "fewer but real" principle) and rely on **established Chinese AI media (QbitAI, already a source)** to cover their major launches.
- **The supporting mechanism (media for coverage, ranking for visibility)**: ranking includes **launch-signal detection**, which looks for "tool name × launch verb × version number" in headlines (e.g. `launches / 发布 / v6`). That way, when the media covers a **major release** from one of these tools, it **automatically rises to the key or core tier** instead of getting buried in daily news.
- **Honest limits**: coverage of Kling and Jimeng updates has **some lag** (it depends on when the media reports) and **coarser granularity** (not an item-by-item official changelog). That's a **known trade-off I chose on technical grounds**, not an oversight.

---

## 5. Glossary

| Term | Meaning |
|---|---|
| **SPA (single-page app)** | The whole site is one page that swaps content with JavaScript. Deep URLs often don't load on their own |
| **CSR (client-side rendering)** | Content is built by JavaScript in the browser. The raw HTML from the server is an empty shell, so static scraping gets nothing |
| **Dead link** | A link whose target page has no real content |
| **Metadata** | Descriptive fields like title and date, as opposed to the body itself |
| **End-to-end usability** | Whether the whole chain (list → detail → link) actually works |

---

## 6. Future work

1. Add Chinese creative-opportunity sources as needed (not for expansion's sake), only ones whose body text extracts cleanly and that fill a specific gap.
2. Move category and genre tagging to LLM judgment.
3. Demote the keyword library to a helper for highlighting matches in body text, with categories handled by the LLM.
4. If Kling or Jimeng ever publish a changelog, RSS feed or news API, re-evaluate connecting directly (there's no crawlable release feed today; see §4.5).
