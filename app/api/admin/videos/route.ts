import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/admin/auth";
import { putObject, deleteObject, makeId } from "@/lib/video/store";
import {
  listAll,
  getAny,
  insert,
  update,
  remove,
  reorder,
  type Visibility,
} from "@/lib/db/repo";

export const dynamic = "force-dynamic";

const MAX_BYTES = 95 * 1024 * 1024; // Workers のリクエスト上限に収まる範囲
const VISIBILITIES: Visibility[] = ["public", "unlisted", "private"];

async function guard() {
  if (await isLoggedIn()) return null;
  return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
}

function fail(e: unknown) {
  const message = e instanceof Error ? e.message : "処理に失敗しました";
  return NextResponse.json({ message }, { status: 500 });
}

/** 一覧を返す（操作のあと画面を更新するため） */
export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({ items: await listAll() });
}

/** 動画を追加する。追加直後は「非公開」から始まる（YouTube と同じ） */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const form = await req.formData();
    const file = form.get("video");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "動画ファイルがありません。" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { message: `ファイルが大きすぎます（上限 ${Math.floor(MAX_BYTES / 1e6)}MB）。` },
        { status: 413 }
      );
    }
    if (!/^video\//.test(file.type || "")) {
      return NextResponse.json({ message: "動画ファイルを選んでください。" }, { status: 400 });
    }

    let id = makeId(file.name);
    if (await getAny(id)) id = `${id}-${Date.now().toString(36)}`;

    const videoKey = `samples/${id}.mp4`;
    await putObject(videoKey, await file.arrayBuffer(), file.type || "video/mp4");

    let thumbKey: string | null = null;
    const thumb = form.get("thumb");
    if (thumb instanceof File && thumb.size > 0) {
      thumbKey = `thumbs/${id}.jpg`;
      await putObject(thumbKey, await thumb.arrayBuffer(), "image/jpeg");
    }

    await insert({
      id,
      title: String(form.get("title") ?? id),
      durationSec: Math.round(Number(form.get("durationSec") ?? 0) * 10) / 10,
      r2Key: videoKey,
      thumbKey,
    });

    return NextResponse.json({ items: await listAll(), addedId: id });
  } catch (e) {
    return fail(e);
  }
}

/** タイトル・説明・公開状態の変更、および並び替え */
export async function PATCH(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      id?: string;
      title?: string;
      description?: string;
      visibility?: string;
      order?: string[];
    };

    // 並び替え
    if (Array.isArray(body.order)) {
      await reorder(body.order);
      return NextResponse.json({ items: await listAll() });
    }

    if (!body.id) {
      return NextResponse.json({ message: "IDがありません。" }, { status: 400 });
    }
    if (body.visibility && !VISIBILITIES.includes(body.visibility as Visibility)) {
      return NextResponse.json({ message: "公開状態の指定が不正です。" }, { status: 400 });
    }

    await update(body.id, {
      title: body.title,
      description: body.description,
      visibility: body.visibility as Visibility | undefined,
    });
    return NextResponse.json({ items: await listAll() });
  } catch (e) {
    return fail(e);
  }
}

/** 動画を削除する。R2の実体と視聴ログも一緒に消える */
export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "IDがありません。" }, { status: 400 });

    const target = await getAny(id);
    if (!target) {
      return NextResponse.json({ message: "その動画は見つかりません。" }, { status: 404 });
    }

    await remove(id);
    await deleteObject(target.r2Key).catch(() => {});
    if (target.thumbKey) await deleteObject(target.thumbKey).catch(() => {});

    return NextResponse.json({ items: await listAll() });
  } catch (e) {
    return fail(e);
  }
}
