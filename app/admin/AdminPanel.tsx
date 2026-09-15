"use client";

import { useMemo, useRef, useState } from "react";
import type { VideoRow, VideoStats, Visibility } from "@/lib/db/repo";

const VIS: { value: Visibility; label: string; hint: string }[] = [
  { value: "public", label: "公開", hint: "トップページに出ます" },
  { value: "unlisted", label: "限定公開", hint: "URLを知っている人だけ" },
  { value: "private", label: "非公開", hint: "管理者だけ" },
];

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 動画ファイルから尺と1コマを取り出す（サーバー側で映像を処理せずに済むように） */
function inspect(file: File): Promise<{ durationSec: number; thumb: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.src = url;
    const done = (durationSec: number, thumb: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve({ durationSec, thumb });
    };
    v.onloadedmetadata = () => {
      const dur = Number.isFinite(v.duration) ? v.duration : 0;
      v.currentTime = Math.min(2, Math.max(0, dur - 0.2));
    };
    v.onseeked = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 640;
        c.height = Math.round((640 * v.videoHeight) / (v.videoWidth || 1)) || 360;
        c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => done(v.duration, b), "image/jpeg", 0.82);
      } catch {
        done(v.duration, null);
      }
    };
    v.onerror = () => done(0, null);
    setTimeout(() => done(v.duration || 0, null), 20000);
  });
}

export function AdminPanel({
  items,
  stats,
}: {
  items: VideoRow[];
  stats: VideoStats[];
}) {
  const [list, setList] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "ng"; text: string } | null>(null);
  const [dropping, setDropping] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const statMap = useMemo(
    () => new Map(stats.map((s) => [s.videoId, s])),
    [stats]
  );
  const counts = useMemo(() => {
    const c = { public: 0, unlisted: 0, private: 0 } as Record<Visibility, number>;
    for (const v of list) c[v.visibility]++;
    return c;
  }, [list]);
  const totalViews = useMemo(
    () => stats.reduce((n, s) => n + s.views, 0),
    [stats]
  );

  const apply = (r: { items?: VideoRow[] }) => {
    if (r.items) setList(r.items);
  };

  const uploadMany = async (files: File[]) => {
    const videos = files.filter((f) => /^video\//.test(f.type));
    if (videos.length === 0) {
      setMsg({ kind: "ng", text: "動画ファイルが見つかりませんでした。" });
      return;
    }
    setMsg(null);
    let ok = 0;
    for (const [i, file] of videos.entries()) {
      setBusy(`(${i + 1}/${videos.length}) 「${file.name}」を確認中…`);
      const { durationSec, thumb } = await inspect(file);
      if (!durationSec) {
        setMsg({ kind: "ng", text: `「${file.name}」は動画として読み取れませんでした。` });
        continue;
      }
      setBusy(
        `(${i + 1}/${videos.length}) 「${file.name}」を送信中… ${(file.size / 1e6).toFixed(1)}MB`
      );
      const fd = new FormData();
      fd.append("video", file);
      fd.append("durationSec", String(durationSec));
      fd.append("title", file.name.replace(/\.[^.]+$/, ""));
      if (thumb) fd.append("thumb", thumb, "thumb.jpg");
      try {
        const res = await fetch("/api/admin/videos", { method: "POST", body: fd });
        const body = (await res.json()) as { items?: VideoRow[]; message?: string };
        if (!res.ok) throw new Error(body.message ?? "アップロードに失敗しました");
        apply(body);
        ok++;
      } catch (e) {
        setMsg({ kind: "ng", text: e instanceof Error ? e.message : "失敗しました" });
      }
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    if (ok > 0) {
      setMsg({
        kind: "ok",
        text: `${ok}本を追加しました。最初は「非公開」です。公開する動画は下の表で切り替えてください。`,
      });
    }
  };

  const patch = async (payload: Record<string, unknown>, label: string) => {
    setBusy(label);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/videos", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { items?: VideoRow[]; message?: string };
      if (!res.ok) throw new Error(body.message ?? "保存に失敗しました");
      apply(body);
    } catch (e) {
      setMsg({ kind: "ng", text: e instanceof Error ? e.message : "失敗しました" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (v: VideoRow) => {
    if (!confirm(`「${v.title}」を削除します。動画ファイルと視聴ログも消えます。よろしいですか？`))
      return;
    setBusy(`「${v.title}」を削除中…`);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(v.id)}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { items?: VideoRow[]; message?: string };
      if (!res.ok) throw new Error(body.message ?? "削除に失敗しました");
      apply(body);
      setMsg({ kind: "ok", text: `「${v.title}」を削除しました。` });
    } catch (e) {
      setMsg({ kind: "ng", text: e instanceof Error ? e.message : "失敗しました" });
    } finally {
      setBusy(null);
    }
  };

  /* ---- 並び替え ---- */
  const move = (id: string, dir: -1 | 1) => {
    const i = list.findIndex((v) => v.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    void patch({ order: next.map((v) => v.id) }, "並び順を保存中…");
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = list.findIndex((v) => v.id === dragId);
    const to = list.findIndex((v) => v.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setList(next);
    setDragId(null);
    void patch({ order: next.map((v) => v.id) }, "並び順を保存中…");
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <p className="admin-eyebrow">ADMIN</p>
          <h1 className="admin-title">動画の管理</h1>
        </div>
        <div className="admin-head-actions">
          <a className="btn btn-ghost" href="/">サイトを見る</a>
          <button className="btn btn-ghost" type="button" onClick={logout}>ログアウト</button>
        </div>
      </header>

      <section className="stat-row">
        <div className="stat"><span className="stat-n">{list.length}</span><span className="stat-k">登録数</span></div>
        <div className="stat"><span className="stat-n">{counts.public}</span><span className="stat-k">公開</span></div>
        <div className="stat"><span className="stat-n">{counts.unlisted}</span><span className="stat-k">限定公開</span></div>
        <div className="stat"><span className="stat-n">{counts.private}</span><span className="stat-k">非公開</span></div>
        <div className="stat"><span className="stat-n">{totalViews.toLocaleString()}</span><span className="stat-k">総再生回数</span></div>
      </section>

      {/* ---- アップロード（ドラッグ＆ドロップ） ---- */}
      <section
        className={`dropzone${dropping ? " is-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropping(false);
          void uploadMany(Array.from(e.dataTransfer.files));
        }}
      >
        <p className="dz-title">ここに動画をドラッグ＆ドロップ</p>
        <p className="dz-note">
          複数まとめてでも大丈夫です。尺とサムネイルは自動で作ります。
          <br />追加した動画は<strong>まず「非公開」</strong>で入るので、確認してから公開に切り替えてください。
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!!busy}
          onClick={() => fileRef.current?.click()}
        >
          ファイルを選ぶ
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            if (fs.length) void uploadMany(fs);
          }}
        />
        {busy && <p className="admin-busy">{busy}</p>}
        {msg && <p className={msg.kind === "ok" ? "admin-ok" : "admin-ng"}>{msg.text}</p>}
      </section>

      {/* ---- 一覧 ---- */}
      <section className="admin-list-wrap">
        <h2>動画の一覧</h2>
        <p className="admin-note">
          行の左端をつかんで上下にドラッグすると並び替えできます（矢印ボタンでも動かせます）。
          この順番がそのままサイトの表示順になります。
        </p>

        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 58 }}>順番</th>
              <th>タイトル</th>
              <th style={{ width: 130 }}>公開状態</th>
              <th className="num" style={{ width: 74 }}>再生数</th>
              <th className="num" style={{ width: 62 }}>尺</th>
              <th style={{ width: 190 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((v, i) => {
              const s = statMap.get(v.id);
              return (
                <tr
                  key={v.id}
                  draggable
                  onDragStart={() => setDragId(v.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(v.id)}
                  className={dragId === v.id ? "is-dragging" : undefined}
                >
                  <td className="handle">
                    <span className="grip" aria-hidden="true">⋮⋮</span>
                    <span className="pos">{i + 1}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="title-btn"
                      title="クリックでタイトルを変更"
                      onClick={() => {
                        const t = prompt("タイトル", v.title);
                        if (t && t.trim() && t !== v.title)
                          void patch({ id: v.id, title: t.trim() }, "保存中…");
                      }}
                    >
                      {v.title}
                    </button>
                    <span className="id-hint">{v.id}</span>
                  </td>
                  <td>
                    <select
                      className={`vis vis-${v.visibility}`}
                      value={v.visibility}
                      disabled={!!busy}
                      onChange={(e) =>
                        void patch(
                          { id: v.id, visibility: e.target.value },
                          "公開状態を保存中…"
                        )
                      }
                    >
                      {VIS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="num">{(s?.views ?? 0).toLocaleString()}</td>
                  <td className="num">{fmt(v.durationSec)}</td>
                  <td className="row-actions">
                    <button type="button" onClick={() => move(v.id, -1)} disabled={i === 0 || !!busy} aria-label="上へ">↑</button>
                    <button type="button" onClick={() => move(v.id, 1)} disabled={i === list.length - 1 || !!busy} aria-label="下へ">↓</button>
                    <a className="linklike" href={`/videos/${v.id}`} target="_blank" rel="noreferrer">開く</a>
                    <button type="button" className="danger" onClick={() => remove(v)} disabled={!!busy}>削除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="vis-legend">
          {VIS.map((o) => (
            <span key={o.value}>
              <b className={`dot dot-${o.value}`} />{o.label} — {o.hint}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
