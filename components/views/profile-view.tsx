"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, History, ListMusic, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/auth-provider";
import { useLibrary } from "@/components/library-provider";
import { getHistory } from "@/lib/userHistory";
import { TrackRow } from "@/components/track-row";
import { SocialPanel } from "@/components/social-panel";
import { catalogTrack } from "@/lib/catalog";
import type { Track } from "@/types";

export function ProfileView() {
  const { user, signOut, loading } = useAuth();
  const { playlists } = useLibrary();
  const router = useRouter();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const liked = playlists.find((p) => p.id === "liked");
  const likedCount = liked?.items.length ?? 0;
  const customPlaylists = playlists.filter((p) => !p.system);
  const letter = (user?.name || user?.email || "S").slice(0, 1).toUpperCase();

  const recentTracks = useMemo<Track[]>(() => {
    return history
      .map((id) => catalogTrack(id) ?? ({ id: `yt-${id}`, title: "Трек", artist: "", duration: 0, coverUrl: "", youtubeId: id, source: "youtube" } as Track))
      .slice(0, 10);
  }, [history]);

  if (loading || !user) {
    return <div className="flex h-full items-center justify-center text-muted">Загрузка…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-5">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl font-black text-black">{letter}</span>
        <div>
          <h1 className="text-3xl font-extrabold">{user.name}</h1>
          <p className="text-muted">{user.email}</p>
          <p className="mt-1 text-sm text-muted">{user.provider === "supabase" ? "Аккаунт Sonora" : "Демо-режим (данные только на этом устройстве)"}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-card p-4 text-center">
          <Heart className="mx-auto h-5 w-5 text-white" />
          <p className="mt-2 text-2xl font-bold">{likedCount}</p>
          <p className="text-xs text-muted">лайков</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card p-4 text-center">
          <ListMusic className="mx-auto h-5 w-5 text-white" />
          <p className="mt-2 text-2xl font-bold">{customPlaylists.length}</p>
          <p className="text-xs text-muted">плейлистов</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card p-4 text-center">
          <History className="mx-auto h-5 w-5 text-white" />
          <p className="mt-2 text-2xl font-bold">{history.length}</p>
          <p className="text-xs text-muted">в истории</p>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            await signOut();
            toast.success("Вы вышли");
            router.push("/");
          }}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/90"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>

      <SocialPanel />

      {recentTracks.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Недавно прослушанные</h2>
          <div className="mt-3 space-y-1">
            {recentTracks.map((track) => (
              <TrackRow key={track.id} track={track} index={0} queue={recentTracks} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
