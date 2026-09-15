// ============================================================================
//  動画の窓口
// ----------------------------------------------------------------------------
//  サイト全体で、動画の配信先を知っているのはこのファイルだけ。
//  ページやコンポーネントは getVideoSource(id) を呼ぶだけで、
//  R2 なのか Vimeo なのか Mux なのかを一切知らない。
// ============================================================================

import { listPublic, getViewable, type VideoRow } from "@/lib/db/repo";
import { r2Source } from "./providers/r2";
import { vimeoSource } from "./providers/vimeo";
import { muxSource } from "./providers/mux";
import { getEnv } from "@/lib/cf";
import type { CatalogItem, VideoProvider, VideoSource } from "./types";

/** いまどの配信先を使っているか。環境変数 VIDEO_PROVIDER で決まる。 */
export function getVideoProvider(): VideoProvider {
  const v = getEnv()?.VIDEO_PROVIDER ?? process.env.VIDEO_PROVIDER;
  if (v === "vimeo" || v === "mux") return v;
  return "r2";
}

function asCatalogItem(row: VideoRow): CatalogItem {
  return {
    id: row.id,
    title: row.title,
    durationSec: row.durationSec,
    r2Key: row.r2Key,
    thumbKey: row.thumbKey ?? undefined,
    vimeoId: row.vimeoId,
    muxPlaybackId: row.muxPlaybackId,
  };
}

function resolve(row: VideoRow): VideoSource {
  const item = asCatalogItem(row);
  let source: VideoSource;
  switch (getVideoProvider()) {
    case "vimeo":
      source = vimeoSource(item);
      break;
    case "mux":
      source = muxSource(item);
      break;
    default:
      source = r2Source(item);
  }
  return source.poster ? source : { ...source, poster: posterFor(item) };
}

function posterFor(item: CatalogItem): string {
  // 管理画面から追加したものは R2、最初から入っている16本はアプリ内の画像
  return item.thumbKey ? `${r2Base()}/${item.thumbKey}` : `/thumbs/${item.id}.jpg`;
}

function r2Base(): string {
  const base =
    getEnv()?.R2_PUBLIC_BASE_URL ??
    process.env.R2_PUBLIC_BASE_URL ??
    "https://pub-350471895cda4dca98be21340dcc4f56.r2.dev";
  return base.replace(/\/+$/, "");
}

/** 個別ページ用。限定公開はURLを知っていれば見られる。非公開は返さない。 */
export async function getVideoSource(id: string): Promise<VideoSource | null> {
  const row = await getViewable(id);
  return row ? resolve(row) : null;
}

/** トップページ用。公開だけを並び順どおりに返す。 */
export async function listVideoSources(): Promise<VideoSource[]> {
  return (await listPublic()).map(resolve);
}

export type { VideoSource, VideoProvider } from "./types";
