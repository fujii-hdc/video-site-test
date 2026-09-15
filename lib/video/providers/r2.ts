import type { CatalogItem, VideoSource } from "../types";
import { getEnv } from "@/lib/cf";

/**
 * Cloudflare R2 から直接配信する。
 *
 * いまは公開バケットの URL をそのまま返している。
 * 有料コンテンツに進む段階では、ここを「サーバー側で署名付きURLを発行する」実装に
 * 差し替える。呼び出し側（source.ts より外）は一切変更しなくてよい。
 */
/**
 * 既定の配信URL（2026-09-07 時点の開発用 r2.dev）。
 *
 * 速度制限があるため本番では使えない。自社ドメインを R2 のカスタムドメインに
 * 設定したら、環境変数 R2_PUBLIC_BASE_URL で上書きすること：
 *   - ローカル … .env.local に記述
 *   - Cloudflare … wrangler.jsonc の vars に記述
 * 環境変数があれば常にそちらが優先される。
 */
const DEFAULT_BASE_URL = "https://pub-350471895cda4dca98be21340dcc4f56.r2.dev";

export function r2Source(item: CatalogItem): VideoSource {
  const base =
    getEnv()?.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL || DEFAULT_BASE_URL;
  return {
    id: item.id,
    title: item.title,
    durationSec: item.durationSec,
    provider: "r2",
    kind: "file",
    src: `${base.replace(/\/+$/, "")}/${item.r2Key}`,
  };
}
