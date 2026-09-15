import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare の実行環境（環境変数とR2）を取り出す。
 *
 * ローカルの `npm run dev` では Cloudflare の環境が無いので null を返す。
 * 呼び出し側は「無いかもしれない」前提で書くこと。
 */
type CfEnv = {
  ADMIN_USER?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  VIDEO_PROVIDER?: string;
  R2_PUBLIC_BASE_URL?: string;
  /** wrangler.jsonc の r2_buckets で結びつけたバケット */
  VIDEOS?: R2Bucket;
  /** wrangler.jsonc の d1_databases で結びつけたデータベース */
  DB?: D1Database;
};

export function getEnv(): CfEnv | null {
  let cf: Partial<CfEnv> = {};
  try {
    cf = getCloudflareContext().env as unknown as CfEnv;
  } catch {
    // ローカルの `npm run dev` では Cloudflare の環境が無い
  }
  // Cloudflare 上の値を優先し、無ければ .env.local を見る
  return {
    ADMIN_USER: cf.ADMIN_USER ?? process.env.ADMIN_USER,
    ADMIN_PASSWORD: cf.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD,
    SESSION_SECRET: cf.SESSION_SECRET ?? process.env.SESSION_SECRET,
    VIDEO_PROVIDER: cf.VIDEO_PROVIDER ?? process.env.VIDEO_PROVIDER,
    R2_PUBLIC_BASE_URL: cf.R2_PUBLIC_BASE_URL ?? process.env.R2_PUBLIC_BASE_URL,
    VIDEOS: cf.VIDEOS,
    DB: cf.DB,
  };
}

export function getBucket(): R2Bucket | null {
  return getEnv()?.VIDEOS ?? null;
}
