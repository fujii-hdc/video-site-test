import type { CatalogItem } from "./types";

/**
 * 動画カタログ。
 *
 * 配信先（R2 / Vimeo / Mux）が変わっても、この表は作り直さない。
 * 新しい配信先に上げたら、その列（vimeoId / muxPlaybackId）を埋めるだけ。
 *
 * durationSec は 2026-09-07 に ffprobe で実測した値。
 * 元データ: video-master/video-inventory.csv
 */
export const CATALOG: CatalogItem[] = [
  { id: "sample-01", title: "ゼップバウンドはなぜ「2.5mg」から始めるの？", durationSec: 218.2, r2Key: "samples/sample-01.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-02", title: "ゼップバウンド投与の秘訣", durationSec: 251.9, r2Key: "samples/sample-02.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-03", title: "ゼップバウンドの落とし穴：油ものが苦手になったのに、痩せない理由", durationSec: 224.7, r2Key: "samples/sample-03.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-04", title: "「痩せる薬」の落とし穴：治療で陥りやすい心理の罠", durationSec: 213.6, r2Key: "samples/sample-04.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-05", title: "ダイエットのパラドックス：痩せたのに「老け見え」する理由", durationSec: 181.2, r2Key: "samples/sample-05.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-06", title: "急激なダイエット後のたるみ肌、時間が経てば元に戻る？", durationSec: 205.0, r2Key: "samples/sample-06.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-07", title: "急に痩せて「癌じゃないの？」と心配された時の【4つの神対応】", durationSec: 225.2, r2Key: "samples/sample-07.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-08", title: "ゼップバウンドで急に痩せた…これって薬の効果？それとも「がん」？", durationSec: 257.4, r2Key: "samples/sample-08.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-09", title: "家族でゼップバウンドを使い回す？絶対に知っておくべき重大なリスク", durationSec: 195.7, r2Key: "samples/sample-09.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-10", title: "糖尿病の僕のマンジャロ、太っている彼女にあげてもいい？", durationSec: 229.8, r2Key: "samples/sample-10.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-11", title: "ゼップバウンドの高額処方は「ぼったくり」なのか", durationSec: 229.7, r2Key: "samples/sample-11.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-26", title: "睡眠時無呼吸や不整脈は改善しますか？", durationSec: 237.9, r2Key: "samples/sample-26.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-27", title: "用量は、なぜ簡単に動かせないのか", durationSec: 469.9, r2Key: "samples/sample-27.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-28", title: "ゼップバウンド注射後の食欲変化について", durationSec: 345.4, r2Key: "samples/sample-28.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-29", title: "海外出張中のゼップバウンド管理戦略", durationSec: 365.9, r2Key: "samples/sample-29.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "sample-30", title: "海外旅行と注射薬の持ち込みについて", durationSec: 199.1, r2Key: "samples/sample-30.mp4", vimeoId: null, muxPlaybackId: null },
  { id: "zepbound-injection", title: "ゼップバウンド 注射方法", durationSec: 480.6, r2Key: "samples/zepbound-injection.mp4", vimeoId: null, muxPlaybackId: null },
];

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((v) => v.id === id);
}

/** 秒を「4:12」の形にする。 */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
