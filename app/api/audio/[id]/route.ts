import { NextResponse } from "next/server";
import { remoteAudioFor } from "@/lib/catalog";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const remote = remoteAudioFor(params.id);
  if (!remote) return NextResponse.json({ error: "Трек не найден" }, { status: 404 });

  const range = request.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(remote, { headers: range ? { Range: range } : undefined });
  } catch {
    return NextResponse.json({ error: "Источник недоступен" }, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: "Источник недоступен" }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
  headers.set("Cache-Control", "public, max-age=86400");
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
