/**
 * トップ画面の並び（Netflix風の横スクロール行）。
 *
 * 動画が増えたらここに id を足す。カタログ（データベース）とは分けてあるので、
 * 「どの動画があるか」と「どう並べるか」を別々に管理できる。
 * ここに載せていない動画は「すべての動画」にだけ出る。
 */
export type Row = {
  /** 行の上に小さく出る英字ラベル */
  eyebrow: string;
  title: string;
  note?: string;
  ids: string[];
};

export const ROWS: Row[] = [
  {
    eyebrow: "START HERE",
    title: "はじめての方へ",
    note: "薬の基本と用量の考え方から",
    ids: [
      "zepbound-injection", // ゼップバウンドについて
      "sample-01",          // なぜ「2.5mg」から始めるの？
      "fig-13",             // 食欲抑制メカニズム
      "fig-1",              // 同じ薬、何が違う？
      "sample-02",          // 投与の秘訣
      "sample-27",          // 用量は、なぜ簡単に動かせないのか
    ],
  },
  {
    eyebrow: "THE FULL STORY",
    title: "第1章から順に学ぶ",
    note: "全7章の連続講座",
    ids: [
      "fig-77-1",           // 第1章 日本医療の限界と新たな希望
      "fig-78-2",           // 第2章 「ゼップバウンド」との出会い
      "fig-79-3-20",        // 第3章 なぜ20%も痩せるのか？
      "fig-80-4",           // 第4章 日本人に特に効果的な理由
      "fig-81-5",           // 第5章 安全に使うための完全ガイド
      "fig-82-6-glp1diet",  // 第6章 独自の解決策 GLP1diet
      "fig-83-7",           // 第7章 会員制が実現した価格革命
    ],
  },
  {
    eyebrow: "YOUR BODY",
    title: "体の変化と副作用",
    note: "治療中に起こりうることを知る",
    ids: [
      "sample-28",          // 注射後の食欲変化
      "fig-14",             // 食の好みが変わる理由
      "sample-03",          // 油ものが苦手になったのに痩せない
      "sample-05",          // 老け見えする理由
      "sample-06",          // たるみ肌は元に戻る？
      "sample-26",          // 睡眠時無呼吸や不整脈
    ],
  },
  {
    eyebrow: "PEACE OF MIND",
    title: "不安との向き合い方",
    note: "まわりの反応にどう答えるか",
    ids: [
      "sample-04",          // 治療で陥りやすい心理の罠
      "sample-07",          // 「癌じゃないの？」への4つの神対応
      "sample-08",          // 薬の効果？それとも「がん」？
      "fig-15",             // 読者からの相談
    ],
  },
  {
    eyebrow: "USE IT SAFELY",
    title: "安全に使うために",
    note: "やってはいけないこと",
    ids: [
      "fig-2",              // 本当に合法？
      "sample-09",          // 家族で使い回す？
      "sample-10",          // 彼女にあげてもいい？
      "fig-19",             // リバウンドと治療中断
      "sample-11",          // 高額処方は「ぼったくり」なのか
    ],
  },
  {
    eyebrow: "ON THE GO",
    title: "旅行・出張に備える",
    note: "持ち込みと保管の実務",
    ids: [
      "sample-29",          // 海外出張中の管理戦略
      "sample-30",          // 海外旅行と注射薬の持ち込み
    ],
  },
];

/** トップのヒーローに出す1本 */
export const FEATURED_ID = "sample-01";
