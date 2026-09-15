import { getEnv } from "@/lib/cf";
import { CATALOG as SEED } from "@/lib/video/catalog";
import { memoryDb } from "./memory";

/** 公開状態。YouTube と同じ3段階 */
export type Visibility = "public" | "unlisted" | "private";

export type VideoRow = {
  id: string;
  title: string;
  description: string;
  durationSec: number;
  r2Key: string;
  thumbKey: string | null;
  vimeoId: string | null;
  muxPlaybackId: string | null;
  visibility: Visibility;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type VideoStats = {
  videoId: string;
  views: number;
  uniqueViewers: number;
  totalSeconds: number;
  completions: number;
  lastViewedAt: string | null;
};

function db(): D1Database | null {
  return getEnv()?.DB ?? null;
}

type Raw = Record<string, unknown>;

function toRow(r: Raw): VideoRow {
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    durationSec: Number(r.duration_sec ?? 0),
    r2Key: String(r.r2_key ?? ""),
    thumbKey: (r.thumb_key as string | null) ?? null,
    vimeoId: (r.vimeo_id as string | null) ?? null,
    muxPlaybackId: (r.mux_playback_id as string | null) ?? null,
    visibility: (r.visibility as Visibility) ?? "private",
    position: Number(r.position ?? 0),
    createdAt: String(r.created_at ?? ""),
    updatedAt: String(r.updated_at ?? ""),
  };
}

/**
 * 最初の1回だけ、catalog.ts の17本をデータベースへ移す。
 * 2回目以降は何もしない（件数を見て判断する）。
 */
async function seedIfEmpty(d: D1Database) {
  const row = await d.prepare("SELECT COUNT(*) AS n FROM videos").first<{ n: number }>();
  if (row && row.n > 0) return;

  const stmt = d.prepare(
    `INSERT INTO videos
       (id, title, duration_sec, r2_key, thumb_key, vimeo_id, mux_playback_id, visibility, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'public', ?)`
  );
  await d.batch(
    SEED.map((v, i) =>
      stmt.bind(v.id, v.title, v.durationSec, v.r2Key, null, v.vimeoId, v.muxPlaybackId, i)
    )
  );
}

/** 管理画面用。非公開も含めて全部、並び順どおりに返す */
export async function listAll(): Promise<VideoRow[]> {
  const d = db();
  if (!d) return memoryDb.listAll();
  await seedIfEmpty(d);
  const { results } = await d
    .prepare("SELECT * FROM videos ORDER BY position ASC, created_at ASC")
    .all<Raw>();
  return (results ?? []).map(toRow);
}

/** サイト用。トップページに出すのは公開だけ */
export async function listPublic(): Promise<VideoRow[]> {
  const d = db();
  if (!d) return memoryDb.listAll().filter((v) => v.visibility === "public");
  await seedIfEmpty(d);
  const { results } = await d
    .prepare(
      "SELECT * FROM videos WHERE visibility = 'public' ORDER BY position ASC, created_at ASC"
    )
    .all<Raw>();
  return (results ?? []).map(toRow);
}

/** 個別ページ用。限定公開もURLを知っていれば見られる（非公開は不可） */
export async function getViewable(id: string): Promise<VideoRow | null> {
  const d = db();
  if (!d) {
    const v = memoryDb.get(id);
    return v && v.visibility !== "private" ? v : null;
  }
  await seedIfEmpty(d);
  const r = await d
    .prepare("SELECT * FROM videos WHERE id = ? AND visibility != 'private'")
    .bind(id)
    .first<Raw>();
  return r ? toRow(r) : null;
}

export async function getAny(id: string): Promise<VideoRow | null> {
  const d = db();
  if (!d) return memoryDb.get(id);
  const r = await d.prepare("SELECT * FROM videos WHERE id = ?").bind(id).first<Raw>();
  return r ? toRow(r) : null;
}

export async function insert(v: {
  id: string;
  title: string;
  durationSec: number;
  r2Key: string;
  thumbKey?: string | null;
}): Promise<void> {
  const d = db();
  if (!d) return memoryDb.insert(v);
  const max = await d
    .prepare("SELECT COALESCE(MAX(position), -1) AS p FROM videos")
    .first<{ p: number }>();
  await d
    .prepare(
      `INSERT INTO videos (id, title, duration_sec, r2_key, thumb_key, visibility, position)
       VALUES (?, ?, ?, ?, ?, 'private', ?)`
    )
    .bind(v.id, v.title, v.durationSec, v.r2Key, v.thumbKey ?? null, (max?.p ?? -1) + 1)
    .run();
}

export async function update(
  id: string,
  patch: { title?: string; description?: string; visibility?: Visibility }
): Promise<void> {
  const d = db();
  if (!d) return memoryDb.update(id, patch);
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.title !== undefined) { sets.push("title = ?"); args.push(patch.title); }
  if (patch.description !== undefined) { sets.push("description = ?"); args.push(patch.description); }
  if (patch.visibility !== undefined) { sets.push("visibility = ?"); args.push(patch.visibility); }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  args.push(id);
  await d.prepare(`UPDATE videos SET ${sets.join(", ")} WHERE id = ?`).bind(...args).run();
}

export async function remove(id: string): Promise<void> {
  const d = db();
  if (!d) return memoryDb.remove(id);
  await d.batch([
    d.prepare("DELETE FROM video_views WHERE video_id = ?").bind(id),
    d.prepare("DELETE FROM videos WHERE id = ?").bind(id),
  ]);
}

/** 並び替え。渡された順に position を振り直す */
export async function reorder(ids: string[]): Promise<void> {
  const d = db();
  if (!d) return memoryDb.reorder(ids);
  const stmt = d.prepare("UPDATE videos SET position = ?, updated_at = datetime('now') WHERE id = ?");
  await d.batch(ids.map((id, i) => stmt.bind(i, id)));
}

/** 視聴を1件記録する */
export async function recordView(v: {
  videoId: string;
  sessionId: string;
  secondsWatched?: number;
  completed?: boolean;
  device?: string;
  country?: string;
  referrer?: string;
}): Promise<void> {
  const d = db();
  if (!d) return memoryDb.recordView(v.videoId);
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  await d
    .prepare(
      `INSERT INTO video_views
         (video_id, day, hour, session_id, seconds_watched, completed, device, country, referrer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      v.videoId,
      day,
      now.getUTCHours(),
      v.sessionId,
      Math.max(0, Math.round(v.secondsWatched ?? 0)),
      v.completed ? 1 : 0,
      v.device ?? null,
      v.country ?? null,
      (v.referrer ?? "").slice(0, 300) || null
    )
    .run();
}

/** 動画ごとの通算 */
export async function totals(): Promise<VideoStats[]> {
  const d = db();
  if (!d) return memoryDb.totals();
  const { results } = await d.prepare("SELECT * FROM video_totals").all<Raw>();
  return (results ?? []).map((r) => ({
    videoId: String(r.video_id),
    views: Number(r.views ?? 0),
    uniqueViewers: Number(r.unique_viewers ?? 0),
    totalSeconds: Number(r.total_seconds ?? 0),
    completions: Number(r.completions ?? 0),
    lastViewedAt: (r.last_viewed_at as string | null) ?? null,
  }));
}

/** 直近N日の日別再生数（管理画面のグラフ用） */
export async function dailySeries(days = 30): Promise<{ day: string; views: number }[]> {
  const d = db();
  if (!d) return [];
  const { results } = await d
    .prepare(
      `SELECT day, SUM(views) AS views
         FROM video_daily_stats
        WHERE day >= date('now', ?)
        GROUP BY day
        ORDER BY day ASC`
    )
    .bind(`-${days} days`)
    .all<Raw>();
  return (results ?? []).map((r) => ({ day: String(r.day), views: Number(r.views ?? 0) }));
}
