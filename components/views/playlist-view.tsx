"use client";

import Link from "next/link";
import { Clock3, Download, Pause, Pencil, Play, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { CoverArt } from "@/components/cover";
import { useAuth } from "@/components/auth-provider";
import { useLibrary } from "@/components/library-provider";
import { usePlayback } from "@/components/player-provider";
import { TrackTable } from "@/components/track-row";
import { formatTime, totalDuration } from "@/lib/format";

export function PlaylistView({ id }: { id: string }) {
  const { user } = useAuth();
  const library = useLibrary();
  const { current, playing, playlistId, playTrack, toggle } = usePlayback();
  const playlist = library.playlistById(id);

  if (!playlist) {
    return (
      <div className="px-6 py-16">
        <h1 className="text-3xl font-bold">Плейлист не найден</h1>
        <Link href="/library" className="mt-4 inline-block font-semibold text-green hover:underline">
          В библиотеку
        </Link>
      </div>
    );
  }

  const tracks = library.tracksIn(playlist);
  const addedAt = playlist.items.map((item) => item.addedAt);
  const duration = totalDuration(tracks.map((track) => track.duration));
  const active = playing && playlistId === playlist.id && tracks.some((track) => track.id === current?.id);
  const offline = library.offlineIds.includes(playlist.id);

  return (
    <div>
      <header className="flex flex-col gap-6 px-4 pb-6 pt-4 md:flex-row md:items-end md:px-6" style={{ background: `linear-gradient(180deg, ${playlist.coverColor}cc 0%, #0a0a0a 100%)` }}>
        <CoverArt title={playlist.name} color={playlist.coverColor} accent={playlist.coverAccent} className="h-44 w-44 shadow-lift md:h-56 md:w-56" rounded="rounded-md" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest">Плейлист</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-6xl">{playlist.name}</h1>
          {playlist.description ? <p className="mt-3 max-w-2xl text-sm text-white/80">{playlist.description}</p> : null}
          <p className="mt-3 text-sm">
            <span className="font-semibold">{user?.name ?? "Вы"}</span>
            <span className="text-white/70"> · {tracks.length} треков, {formatTime(duration)}</span>
            {offline ? <span className="text-white/70"> · офлайн</span> : null}
          </p>
        </div>
      </header>
      <div className="px-4 pb-8 md:px-6">
        <div className="flex items-center gap-4 py-4">
          <button
            type="button"
            aria-label={active ? "Пауза" : "Слушать"}
            disabled={!tracks.length}
            onClick={() => {
              if (!tracks[0]) return;
              if (active) toggle();
              else playTrack(tracks[0], tracks, { playlistId: playlist.id });
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green text-black transition hover:scale-105 hover:bg-green-hover disabled:opacity-40"
          >
            {active ? <Pause className="h-7 w-7 fill-black" /> : <Play className="ml-1 h-7 w-7 fill-black" />}
          </button>
          <button type="button" onClick={() => library.openEdit(playlist)} className="rounded-full p-2 text-muted hover:text-white" aria-label="Редактировать">
            <Pencil className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => library.toggleOffline(playlist.id)}
            disabled={library.cachingId === playlist.id}
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-white disabled:opacity-60"
          >
            <Download className="h-5 w-5" />
            {library.cachingId === playlist.id ? "Сохраняем…" : offline ? "Убрать офлайн" : "Скачать офлайн"}
          </button>
          <button
            type="button"
            aria-label="Репостнуть плейлист"
            title="Репостнуть плейлист"
            onClick={async () => {
              if (!user || user.provider !== "supabase") {
                toast("Войдите, чтобы делать репосты");
                return;
              }
              try {
                const res = await fetch("/api/reposts", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ type: "playlist", playlistId: playlist.id, title: playlist.name, artist: "", cover: "" }),
                });
                const json = (await res.json()) as { success?: boolean; error?: string };
                if (!res.ok || json.success === false) {
                  toast.error(json.error === "already reposted" ? "Уже репостнуто" : json.error ?? "Ошибка репоста");
                  return;
                }
                toast.success("Репост добавлен");
              } catch {
                toast.error("Нет сети");
              }
            }}
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-white"
          >
            <Share2 className="h-5 w-5" />
            Репост
          </button>
        </div>
        {tracks.length === 0 ? (
          <div className="rounded-lg bg-white/5 p-8 text-muted">
            В плейлисте пока пусто. Найдите треки и добавьте их через меню строки.
            <Link href="/search" className="mt-3 block font-semibold text-white hover:underline">
              Перейти к поиску
            </Link>
          </div>
        ) : (
          <TrackTable tracks={tracks} playlistId={playlist.id} addedAt={addedAt} canRemove />
        )}
        <p className="mt-6 flex items-center gap-2 text-xs text-muted">
          <Clock3 className="h-3.5 w-3.5" />
          Длительность считается по каталогу. У демо-треков она уточняется, когда файл начинает играть.
        </p>
      </div>
    </div>
  );
}
