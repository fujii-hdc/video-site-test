import { getBucket } from "@/lib/cf";

/** 動画ファイルとサムネイルをR2へ保存する */
export async function putObject(key: string, body: ArrayBuffer, contentType: string) {
  const bucket = getBucket();
  if (!bucket) throw new Error("R2に接続されていません（Cloudflare上でのみ保存できます）");
  await bucket.put(key, body, { httpMetadata: { contentType } });
}

/** R2からオブジェクトを削除する */
export async function deleteObject(key: string) {
  const bucket = getBucket();
  if (!bucket) throw new Error("R2に接続されていません");
  await bucket.delete(key);
}

/** ファイル名から、URLに使える動画IDを作る */
export function makeId(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const safe = base
    .normalize("NFKC")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return safe || `video-${Date.now()}`;
}
