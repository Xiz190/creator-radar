// 探测机会类源的真实内容（不入库，只打印标题）
import { fetchCcdyColumnLatest } from "@/lib/monitor/ccdy-list";
import { fetchCapaLatest } from "@/lib/monitor/capa-list";

const OPP = /(征集|申报|扶持|大赛|比赛|评选|选拔|招募|资助|基金|计划|遴选|奖|入围|报名|截止)/;

async function show(name: string, items: { title: string; listPublishedAt: string | null }[]) {
  const opp = items.filter((i) => OPP.test(i.title));
  console.log(`\n== ${name} ==  共 ${items.length} 条，疑似机会 ${opp.length} 条`);
  for (const i of items.slice(0, 8)) {
    console.log(`   ${OPP.test(i.title) ? "★" : " "} ${i.listPublishedAt ?? "?"}  ${i.title.slice(0, 44)}`);
  }
}

async function main() {
  try { await show("ccdy 艺术 (10939-mssql)", await fetchCcdyColumnLatest("10939-mssql", 15)); }
  catch (e) { console.log("ccdy 艺术 失败:", (e as Error).message); }
  try { await show("ccdy 非遗 (10937-mssql)", await fetchCcdyColumnLatest("10937-mssql", 15)); }
  catch (e) { console.log("ccdy 非遗 失败:", (e as Error).message); }
  try { await show("CAPA 音乐人才扶持 (17)", await fetchCapaLatest("17", 15)); }
  catch (e) { console.log("CAPA 17 失败:", (e as Error).message); }
  try { await show("CAPA 通知公告 (1552487425756987393)", await fetchCapaLatest("1552487425756987393", 15)); }
  catch (e) { console.log("CAPA 通知 失败:", (e as Error).message); }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
