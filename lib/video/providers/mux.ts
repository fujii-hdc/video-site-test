import type { CatalogItem, VideoSource } from "../types";

/**
 * Mux で配信する。
 *
 * 事前作業：
 *   1. Mux に動画をアップロードする（API 経由）
 *   2. 採番された playbackId を lib/video/catalog.ts の muxPlaybackId に書く
 *
 * 有料コンテンツに進む段階では、playbackPolicy を signed にして
 * ここでサーバー側で再生トークン（JWT）を発行する。
 */
export function muxSource(item: CatalogItem): VideoSource {
  if (!item.muxPlaybackId) {
    throw new Error(
      `${item.id} の muxPlaybackId が未設定です。Mux にアップロード後、catalog.ts に記入してください。`
    );
  }
  return {
    id: item.id,
    title: item.title,
    durationSec: item.durationSec,
    provider: "mux",
    kind: "hls",
    src: `https://stream.mux.com/${item.muxPlaybackId}.m3u8`,
    poster: `https://image.mux.com/${item.muxPlaybackId}/thumbnail.webp`,
  };
}
