# video-site

Cloudflare 上で動かす Next.js の動画サイト。
R2 / Vimeo / Mux を**環境変数ひとつで切り替えて**配信できる構造になっている。

作成 2026-09-07。関連ドキュメント: 「Notion脱出計画」（動画配信の移行計画）

---

## いちばん大事なこと

**動画の配信先を知っているのは `lib/video/source.ts` だけ。**

ページやコンポーネントは `getVideoSource(id)` を呼ぶだけで、R2 なのか Vimeo なのか Mux なのかを一切知らない。だから配信先を乗り換えるときに触るのは 1 ファイルで済む。

```
app/videos/[id]/page.tsx
        ↓ getVideoSource(id)
lib/video/source.ts          ← ここだけが配信先を知っている
        ↓
lib/video/providers/r2.ts    ← いま使っている
lib/video/providers/vimeo.ts ← 動画IDを入れれば動く
lib/video/providers/mux.ts   ← 動画IDを入れれば動く
```

**この構造を崩さないこと。** ページの中に動画URLを直接書いた瞬間、Vimeo や Mux への移行コストが 2〜3 日から 2 週間以上に跳ね上がる。

---

## 起動

```bash
npm install
npm run dev
```

http://localhost:3000 を開く。16本の一覧が出て、クリックすると再生される。
**設定ファイルは不要。** R2の配信URLは既定値が入っているのでそのまま動く。

---

## 配信先を切り替える

プロジェクト直下に `.env.local` を作り、`VIDEO_PROVIDER` を書いてサーバーを再起動する。
ファイルが無ければ `r2` として動く。

```bash
# .env.local
VIDEO_PROVIDER=vimeo

# R2の配信先を変えるとき（自社ドメインへ移行したら）
R2_PUBLIC_BASE_URL=https://videos.example.com
```

Cloudflare 上での値は `wrangler.jsonc` の `vars` で設定する。

| 値 | 配信先 | 状態 |
|---|---|---|
| `r2` | Cloudflare R2 | **稼働中**（既定値） |
| `vimeo` | Vimeo | 未接続（下記の手順が必要） |
| `mux` | Mux | 未接続（下記の手順が必要） |

### Vimeo につなぐには

1. Vimeo に 16 本アップロードする
2. 採番された動画ID（数字）を `lib/video/catalog.ts` の `vimeoId` に記入する
3. Vimeo 側で「埋め込みドメイン制限」を自社ドメインに設定する
4. `.env.local` を `VIDEO_PROVIDER=vimeo` にする

コードの変更は不要。

### Mux につなぐには

1. Mux に 16 本アップロードする（API 経由）
2. 採番された `playbackId` を `lib/video/catalog.ts` の `muxPlaybackId` に記入する
3. `.env.local` を `VIDEO_PROVIDER=mux` にする

**注意:** Mux は HLS（`.m3u8`）で配信する。Safari 以外のブラウザでは `hls.js` の導入が必要になるので、`components/VideoPlayer.tsx` に追加すること。

---

## Cloudflare へのデプロイ

```bash
npx wrangler login   # 初回のみ
npm run preview      # ローカルで Workers 環境を再現して確認
npm run deploy       # 本番へ
```

`wrangler.jsonc` の `vars` が Cloudflare 上での環境変数になる。
**APIトークンなどの秘密情報は `vars` に書かず**、`npx wrangler secret put NAME` で登録すること。

---

## いまの状態と残作業

**動いているもの**

- 16 本のカタログ（尺は 2026-09-07 に ffprobe で実測した値）
- R2 からの配信・再生
- 一覧ページと再生ページ

**残っていること**

| 項目 | 内容 |
|---|---|
| **ドメイン** | いまは開発用の `r2.dev` を使っている。**速度制限があり本番では使えない。** 自社ドメインを Cloudflare に登録し、R2 のカスタムドメインに設定して `R2_PUBLIC_BASE_URL` を差し替える |
| **有料化** | Stripe 決済（吉本さん担当）と接続する際は、動画URLをページに直接埋め込まず、購入状態を確認したうえで**サーバー側で短命の再生URLを発行する**形にする。実装場所は `lib/video/providers/*.ts` の中だけで済む |
| **画質** | 元素材が平均 506kbps とかなり圧縮されている（1080p としては通常の 1/6〜1/10）。高画質の元データがあるなら差し替えたほうがよい |
| **動画の追加** | 50 本まで増える予定。`lib/video/catalog.ts` に追記し、R2 の `samples/` に同じ命名で置く |

---

## ファイル構成

```
app/
  page.tsx                    一覧ページ
  videos/[id]/page.tsx        再生ページ
  globals.css
components/
  VideoPlayer.tsx             配信先を知らないプレイヤー（kind だけを見る）
lib/video/
  source.ts                   ★ 動画の窓口。配信先を知っているのはここだけ
  catalog.ts                  16本のカタログ（ID・尺・各サービスの動画ID）
  types.ts                    型定義
  providers/
    r2.ts                     Cloudflare R2
    vimeo.ts                  Vimeo
    mux.ts                    Mux
wrangler.jsonc                Cloudflare の設定
.env.example                  環境変数のひな形
```
