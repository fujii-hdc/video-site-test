"use client";

import { useState } from "react";

export function LoginForm({ configured }: { configured: boolean }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setError(body.message ?? "IDまたはパスワードが違います。");
    } catch {
      setError("通信に失敗しました。時間をおいてお試しください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-login">
      <form className="login-card" onSubmit={submit}>
        <p className="login-eyebrow">ADMIN</p>
        <h1 className="login-title">管理画面</h1>
        <p className="login-note">動画の追加・削除ができます。</p>

        {!configured && (
          <p className="login-alert">
            管理者IDとパスワードがまだ設定されていません。README の手順で
            <code>ADMIN_PASSWORD</code> を登録してください。
          </p>
        )}

        <label className="field">
          <span>ログインID</span>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span>パスワード</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button className="btn btn-gold" type="submit" disabled={busy}>
          {busy ? "確認中…" : "ログイン"}
        </button>

        <a className="login-back" href="/">← サイトへ戻る</a>
      </form>
    </main>
  );
}
