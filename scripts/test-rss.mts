import { readFileSync } from "node:fs";
const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
import { fetchRssFeed } from "../src/lib/monitor/rss-fetcher.ts";
const items = await fetchRssFeed("https://splice.com/blog/feed", 5);
console.log("Splice RSS 抓到", items.length, "条");
for (const it of items.slice(0,3)) {
  console.log(`  ${it.listPublishedAt} ${it.title.slice(0,35)}`);
  console.log(`    URL: ${it.url}`);
}
