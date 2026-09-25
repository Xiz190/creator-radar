import { getPgPool } from "@/lib/db";

/**
 * 「交接」——手机端把一条推给桌面端。
 *
 * 场景：伴侣版（手机）只做接收与快速浏览，重操作留在桌面。你在手机上看到
 * 一条想深挖的，点 On desktop，桌面端的标签页就弹出这条的入口。
 *
 * ⚠️ **这是队列 + 轮询，不是 Web Push。** 桌面端每 8 秒问一次有没有新交接。
 * 因此它依赖桌面端的标签页开着——浏览器完全关掉时不会弹。
 * 真推送要 VAPID 密钥 + 推送服务，且 iOS Safari 要求站点先装到主屏；
 * 那是另一个量级的工作。**别在文案里说成"随时送达的系统通知"。**
 *
 * 单用户场景，所以不做用户维度；将来多用户时在这里加 user_id。
 */

export type Handoff = {
  id: number;
  sourceId: string;
  url: string;
  title: string;
  createdAt: string;
};

/** 手机端调用：排入一条交接。 */
export async function createHandoff(sourceId: string, url: string, title: string): Promise<number> {
  const pool = getPgPool();
  const res = await pool.query<{ id: string }>(
    `insert into handoffs (source_id, url, title) values ($1, $2, $3) returning id`,
    [sourceId, url, title],
  );
  return Number(res.rows[0]?.id ?? 0);
}

/**
 * 桌面端轮询调用：取还没被消费的交接，新的在前。
 *
 * **只取不消费**——由调用方在真的展示出来之后再 ack。
 * 取的时候就标记已消费的话，一次渲染失败就把这条丢了。
 */
export async function getPendingHandoffs(limit = 5): Promise<Handoff[]> {
  const pool = getPgPool();
  const res = await pool.query<{
    id: string;
    source_id: string;
    url: string;
    title: string;
    created_at: Date | string;
  }>(
    `select id, source_id, url, title, created_at
       from handoffs
      where consumed_at is null
      order by created_at desc
      limit $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    sourceId: r.source_id,
    url: r.url,
    title: r.title,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

/** 桌面端展示完之后 ack。 */
export async function consumeHandoff(id: number): Promise<void> {
  const pool = getPgPool();
  await pool.query(`update handoffs set consumed_at = now() where id = $1 and consumed_at is null`, [id]);
}

/**
 * 清理：超过一天的交接直接作废。
 *
 * 不然你手机关掉、桌面端从没打开过，这条会一直挂着，几天后打开桌面突然弹出
 * 一条上周的——那不是"交接"，是骚扰。
 */
export async function expireStaleHandoffs(olderThanHours = 24): Promise<void> {
  const pool = getPgPool();
  await pool.query(
    `update handoffs set consumed_at = now()
      where consumed_at is null and created_at < now() - ($1 || ' hours')::interval`,
    [String(olderThanHours)],
  );
}
