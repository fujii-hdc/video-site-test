import { NextResponse } from "next/server";
import { recordView, getViewable } from "@/lib/db/repo";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SID = "vsid";

/**
 * 再生されたことを記録する。
 * 個人は特定しない。同じ人の重複を除くためだけに、ランダムな目印を1年Cookieで持つ。
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      videoId?: string;
      secondsWatched?: number;
      completed?: boolean;
    };
    if (!body.videoId) {
      return NextResponse.json({ message: "videoId がありません。" }, { status: 400 });
    }
    // 存在しない／非公開の動画は記録しない
    if (!(await getViewable(body.videoId))) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const jar = await cookies();
    let sid = jar.get(SID)?.value;
    if (!sid) {
      sid = crypto.randomUUID();
      jar.set(SID, sid, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    const ua = req.headers.get("user-agent") ?? "";
    const device = /Mobi|Android|iPhone/i.test(ua)
      ? "mobile"
      : /iPad|Tablet/i.test(ua)
        ? "tablet"
        : "desktop";

    await recordView({
      videoId: body.videoId,
      sessionId: sid,
      secondsWatched: body.secondsWatched,
      completed: body.completed,
      device,
      country: req.headers.get("cf-ipcountry") ?? undefined,
      referrer: req.headers.get("referer") ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // 計測の失敗で再生を止めない
    return NextResponse.json({ ok: false });
  }
}
