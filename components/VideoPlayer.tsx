"use client";

import type { VideoSource } from "@/lib/video/types";

/**
 * 配信先を知らないプレイヤー。
 * VideoSource.kind だけを見て、どう再生するかを決める。
 */
export function VideoPlayer({ source }: { source: VideoSource }) {
  if (source.kind === "embed") {
    // Vimeo など、提供元のプレイヤーをそのまま埋め込む
    return (
      <div className="player">
        <iframe
          src={source.src}
          title={source.title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // file（R2 の mp4）と hls（Mux の m3u8）
  // 注意: hls は Safari 以外だと hls.js が必要。Mux に移行する際に導入する。
  return (
    <div className="player">
      <video src={source.src} poster={source.poster} controls playsInline preload="metadata" />
    </div>
  );
}
