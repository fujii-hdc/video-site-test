import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getVideoSource } from "@/lib/video/source";
import { formatDuration } from "@/lib/video/catalog";

export const dynamic = "force-dynamic";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getVideoSource(id);
  if (!source) notFound();

  return (
    <main className="wrap">
      <Link href="/" className="back">← 一覧へ戻る</Link>

      <h1>{source.title}</h1>
      <p className="sub">
        {formatDuration(source.durationSec)} ・ 配信元 <code>{source.provider}</code>
      </p>

      <VideoPlayer source={source} />
    </main>
  );
}
