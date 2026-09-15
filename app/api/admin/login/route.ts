import { NextResponse } from "next/server";
import { verifyCredentials, createSession, adminConfigured } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/** 総当たりを遅くするための待機（成功・失敗どちらも同じだけ待つ） */
const DELAY_MS = 700;

export async function POST(req: Request) {
  const started = Date.now();
  const pause = async () => {
    const rest = DELAY_MS - (Date.now() - started);
    if (rest > 0) await new Promise((r) => setTimeout(r, rest));
  };

  if (!adminConfigured()) {
    await pause();
    return NextResponse.json(
      { message: "管理者パスワードが未設定です。README の手順で設定してください。" },
      { status: 503 }
    );
  }

  let user = "";
  let password = "";
  try {
    const body = (await req.json()) as { user?: string; password?: string };
    user = String(body.user ?? "");
    password = String(body.password ?? "");
  } catch {
    /* 空のまま照合失敗させる */
  }

  if (!verifyCredentials(user, password)) {
    await pause();
    // IDが違うのかパスワードが違うのかは知らせない
    return NextResponse.json({ message: "IDまたはパスワードが違います。" }, { status: 401 });
  }

  await createSession(user);
  await pause();
  return NextResponse.json({ ok: true });
}
