import { CATALOG as SEED } from "@/lib/video/catalog";
import type { VideoRow, VideoStats, Visibility } from "./repo";

/**
 * ローカル開発用の代替。
 *
 * `npm run dev` には Cloudflare の D1 が無いので、その場合だけ
 * メモリ上で同じように動かす。サーバーを止めると消える。
 * Cloudflare 上では一切使われない。
 */
const now = () => new Date().toISOString();

let rows: VideoRow[] = SEED.map((v, i) => ({
  id: v.id,
  title: v.title,
  description: "",
  durationSec: v.durationSec,
  r2Key: v.r2Key,
  thumbKey: null,
  vimeoId: v.vimeoId,
  muxPlaybackId: v.muxPlaybackId,
  visibility: "public" as Visibility,
  position: i,
  createdAt: now(),
  updatedAt: now(),
}));

const views = new Map<string, number>();

export const memoryDb = {
  listAll(): VideoRow[] {
    return [...rows].sort((a, b) => a.position - b.position);
  },
  get(id: string): VideoRow | null {
    return rows.find((r) => r.id === id) ?? null;
  },
  insert(v: { id: string; title: string; durationSec: number; r2Key: string; thumbKey?: string | null }) {
    rows.push({
      id: v.id,
      title: v.title,
      description: "",
      durationSec: v.durationSec,
      r2Key: v.r2Key,
      thumbKey: v.thumbKey ?? null,
      vimeoId: null,
      muxPlaybackId: null,
      visibility: "private",
      position: rows.length,
      createdAt: now(),
      updatedAt: now(),
    });
  },
  update(id: string, patch: { title?: string; description?: string; visibility?: Visibility }) {
    rows = rows.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r));
  },
  remove(id: string) {
    rows = rows.filter((r) => r.id !== id);
  },
  reorder(ids: string[]) {
    const order = new Map(ids.map((id, i) => [id, i]));
    rows = rows.map((r) => (order.has(r.id) ? { ...r, position: order.get(r.id)! } : r));
  },
  recordView(videoId: string) {
    views.set(videoId, (views.get(videoId) ?? 0) + 1);
  },
  totals(): VideoStats[] {
    return rows.map((r) => ({
      videoId: r.id,
      views: views.get(r.id) ?? 0,
      uniqueViewers: views.get(r.id) ? 1 : 0,
      totalSeconds: 0,
      completions: 0,
      lastViewedAt: null,
    }));
  },
};
