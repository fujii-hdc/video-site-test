import type { CatalogItem, VideoSource } from "../types";

/**
 * Vimeo で配信する。
 *
 * 事前作業：
 *   1. Vimeo に動画をアップロードする
 *   2. 採番された動画ID（数字）を lib/video/catalog.ts の vimeoId に書く
 *   3. Vimeo 側で「埋め込みドメイン制限」を自社ドメインに設定する
 *
 * それだけで VIDEO_PROVIDER=vimeo に切り替わる。ページ側の変更は不要。
 */
export function vimeoSource(item: CatalogItem): VideoSource {
  if (!item.vimeoId) {
    throw new Error(
      `${item.id} の vimeoId が未設定です。Vimeo にアップロード後、catalog.ts に動画IDを記入してください。`
    );
  }
  const params = new URLSearchParams({
    title: "0",
    byline: "0",
    portrait: "0",
    dnt: "1", // 視聴者の追跡を無効化
  });
  return {
    id: item.id,
    title: item.title,
    durationSec: item.durationSec,
    provider: "vimeo",
    kind: "embed",
    src: `https://player.vimeo.com/video/${item.vimeoId}?${params}`,
  };
}
