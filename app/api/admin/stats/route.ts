import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/admin/auth";
import { totals, dailySeries } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isLoggedIn())) {
    return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
  }
  const [byVideo, daily] = await Promise.all([totals(), dailySeries(30)]);
  return NextResponse.json({ byVideo, daily });
}
