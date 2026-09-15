#!/usr/bin/env node
/**
 * D1データベースの初期設定。
 *
 *   1. video-site-db が無ければ作る
 *   2. database_id を wrangler.jsonc に書き込む
 *   3. db/schema.sql を流し込む（表とビューを作る）
 *
 * 何度実行しても壊れない（既にあるものは作り直さない）。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const DB_NAME = "video-site-db";
const run = (args, opts = {}) =>
  execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: opts.quiet ? ["ignore", "pipe", "pipe"] : ["inherit", "pipe", "inherit"],
  });

function findId() {
  try {
    const out = run(["d1", "list", "--json"], { quiet: true });
    const list = JSON.parse(out.slice(out.indexOf("[")));
    return list.find((d) => d.name === DB_NAME)?.uuid ?? null;
  } catch {
    return null;
  }
}

console.log("── D1データベースの設定 ──\n");

let id = findId();
if (id) {
  console.log(`既存のデータベースを使います: ${DB_NAME}`);
} else {
  console.log(`データベースを作成します: ${DB_NAME}`);
  try {
    run(["d1", "create", DB_NAME]);
  } catch {
    /* 同名が既にある場合はそのまま進む */
  }
  id = findId();
}

if (!id) {
  console.error("\nデータベースIDを取得できませんでした。");
  console.error("`npx wrangler login` が済んでいるか確認してください。");
  process.exit(1);
}
console.log(`database_id: ${id}`);

// wrangler.jsonc に書き込む
const path = "wrangler.jsonc";
const cfg = readFileSync(path, "utf8");
const next = cfg.replace(
  /("database_name":\s*"video-site-db",\s*"database_id":\s*)"[^"]*"/,
  `$1"${id}"`
);
if (next !== cfg) {
  writeFileSync(path, next);
  console.log("wrangler.jsonc に書き込みました");
}

// 表とビューを作る
console.log("\n表とビューを作ります…");
run(["d1", "execute", DB_NAME, "--remote", "--file", "db/schema.sql", "--yes"]);

console.log("\n完了しました。つづけて `npm run deploy` を実行してください。");
console.log("最初にサイトを開いたとき、いまの17本が自動でデータベースへ移ります。");
