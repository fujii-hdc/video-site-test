import { VideoBrowse } from "@/components/VideoBrowse";
import { listVideoSources } from "@/lib/video/source";

// カタログはR2に置いてあり、管理画面から更新できるため、毎回読みにいく
export const dynamic = "force-dynamic";

export default async function Home() {
  // 配信先の解決はサーバー側で完結させる。
  // クライアントには「再生に必要な情報」だけを渡すので、
  // 将来 Vimeo / Mux に切り替えても、この行より下は一切変わらない。
  const videos = await listVideoSources();
  return (
    <>
      <p style={{ textAlign: "center", fontSize: 12, color: "#888" }}>
        デプロイ確認テスト
      </p>
      <VideoBrowse videos={videos} />
    </>
  );
}
