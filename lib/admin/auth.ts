import { cookies } from "next/headers";
import { getEnv } from "@/lib/cf";

/**
 * 管理者ログイン。
 *
 * ・利用者IDとパスワードは環境変数で設定する（コードには書かない）
 * ・ログイン後は署名付きのCookieでログイン状態を保持する
 * ・Cookieは HttpOnly / Secure / SameSite=Strict なので、
 *   JavaScript から盗めず、他サイトからも送られない
 */

const COOKIE = "admin_session";
const MAX_AGE_SEC = 60 * 60 * 8; // 8時間で自動ログアウト

function enc(s: string) {
  return new TextEncoder().encode(s);
}

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc(data)));
}

/** 長さに依存しない比較（タイミング攻撃を避ける） */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function secret() {
  const env = getEnv();
  // SESSION_SECRET が未設定でも動くよう、パスワードから鍵を導出する
  return (env?.SESSION_SECRET as string) || (env?.ADMIN_PASSWORD as string) || "";
}

export function adminConfigured(): boolean {
  const env = getEnv();
  return Boolean(env?.ADMIN_USER && env?.ADMIN_PASSWORD);
}

/** IDとパスワードを照合する */
export function verifyCredentials(user: string, password: string): boolean {
  const env = getEnv();
  const u = (env?.ADMIN_USER as string) ?? "";
  const p = (env?.ADMIN_PASSWORD as string) ?? "";
  if (!u || !p) return false;
  return safeEqual(user, u) && safeEqual(password, p);
}

export async function createSession(user: string) {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payload = `${user}.${exp}`;
  const sig = await hmac(secret(), payload);
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sig}`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** ログイン済みかどうか。ページとAPIの両方で必ずこれを通す */
export async function isLoggedIn(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;
  const i = raw.lastIndexOf(".");
  if (i < 0) return false;
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = await hmac(secret(), payload);
  if (!safeEqual(sig, expected)) return false;
  const exp = Number(payload.split(".")[1]);
  return Number.isFinite(exp) && Date.now() < exp;
}
