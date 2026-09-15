// 動画配信まわりで使う型。ここと source.ts だけが「配信先の違い」を知っている。

/** 配信先。環境変数 VIDEO_PROVIDER で切り替える。 */
export type VideoProvider = "r2" | "vimeo" | "mux";

/** プレイヤーがどう再生すればよいか。 */
export type PlaybackKind =
  | "file"  // mp4 などを <video> で直接再生（R2）
  | "hls"   // .m3u8 を配信（Mux）
  | "embed" // 提供元の iframe を埋め込む（Vimeo）
  ;

/** カタログ上の1本。配信先が変わっても不変の情報だけを持つ。 */
export type CatalogItem = {
  id: string;
  title: string;
  durationSec: number;
  /** R2 のオブジェクトキー */
  r2Key: string;
  /** サムネイルのR2キー。未設定なら public/thumbs/<id>.jpg を使う */
  thumbKey?: string;
  /** Vimeo に上げたら採番される動画ID。未アップロードなら null。 */
  vimeoId: string | null;
  /** Mux に上げたら採番される再生ID。未アップロードなら null。 */
  muxPlaybackId: string | null;
};

/** ページに渡す最終形。ここまで解決すればプレイヤーは配信先を知らなくてよい。 */
export type VideoSource = {
  id: string;
  title: string;
  durationSec: number;
  provider: VideoProvider;
  kind: PlaybackKind;
  /** 再生に使うURL（file/hls なら動画URL、embed なら iframe の src） */
  src: string;
  poster?: string;
};
