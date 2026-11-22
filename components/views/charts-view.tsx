"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Play } from "lucide-react";
import { CoverArt } from "@/components/cover";
import { usePlayback } from "@/components/player-provider";
import { formatTime, cn } from "@/lib/format";
import type { Track } from "@/types";

type ChartArtist = { name: string; playcount: number; cover: string; url: string };
type ChartsResponse = { tracks: Track[]; artists: ChartArtist[]; source: string; fallback?: boolean; error?: string };

const REGIONS = [
  { id: "russia", label: "Россия" },
  { id: "cis", label: "СНГ" },
  { id: "europe", label: "Европа" },
  { id: "global", label: "Мир" },
] as const;

const SOURCES = [
  { id: "lastfm", label: "Last.fm" },
  { id: "youtube", label: "YouTube" },
] as const;

function formatCount(value?: number) {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} тыс.`;
  return String(value);
}

export function ChartsView() {
  const { playTrack } = usePlayback();
  const params = useSearchParams();
  const initialRegion = params.get("region");
  const [region, setRegion] = useState<string>(REGIONS.some((r) => r.id === initialRegion) ? initialRegion! : "russia");
  const [source, setSource] = useState<string>("lastfm");
  const [type, setType] = useState<"tracks" | "artists">("tracks");
  const [data, setData] = useState<ChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ region, type, source });
      const response = await fetch(`/api/charts?${params.toString()}`);
      const json = (await response.json()) as ChartsResponse;
      setData(json);
      if (!response.ok && !json.fallback) setError(json.error ?? "Не удалось загрузить чарты");
    } catch {
      setError("Не удалось загрузить чарты");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [region, type, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const tracks = data?.tracks ?? [];

  return (
    <div className="px-4 pb-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Чарты</h1>
        <div className="flex rounded-full bg-white/10 p-1">
          {SOURCES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSource(item.id)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", source === item.id ? "bg-white text-black" : "text-white/70 hover:text-white")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {REGIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRegion(item.id)}
            className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", region === item.id ? "bg-green text-black" : "bg-white/10 text-white hover:bg-white/20")}
          >
            {item.label}
          </button>
        ))}
        <span className="mx-1 hidden w-px bg-white/15 sm:block" />
        {(["tracks", "artists"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setType(item)}
            className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", type === item ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20")}
          >
            {item === "tracks" ? "Треки" : "Исполнители"}
          </button>
        ))}
      </div>

      {data?.fallback ? <p className="mt-4 rounded-lg bg-white/5 px-4 py-2 text-sm text-muted">Чарты временно недоступны — показан демо-каталог.</p> : null}

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-md bg-elevated" />
          ))}
        </div>
      ) : error && !tracks.length && type === "tracks" ? (
        <div className="mt-8 rounded-lg bg-elevated p-8 text-center">
          <p className="text-muted">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-4 font-semibold text-green hover:underline">
            Повторить
          </button>
        </div>
      ) : type === "artists" ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(data?.artists ?? []).map((artist, index) => (
            <div key={artist.name} className="rounded-lg bg-elevated p-4 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-highlight text-xl font-extrabold text-green">{index + 1}</span>
              <p className="mt-3 truncate font-semibold">{artist.name}</p>
              <p className="text-xs text-muted">{formatCount(artist.playcount)} прослушиваний</p>
            </div>
          ))}
          {!(data?.artists ?? []).length ? <p className="text-sm text-muted">Исполнители недоступны для этого источника.</p> : null}
        </div>
      ) : (
        <div className="mt-4">
          {tracks.map((track, index) => {
            const playable = track.source !== "youtube" || Boolean(track.youtubeId);
            const plays = track.playcount ?? track.viewCount;
            return (
              <div key={`${track.id}-${index}`} className="group grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2.5 hover:bg-white/10 sm:grid-cols-[40px_minmax(0,1fr)_minmax(0,140px)_minmax(0,80px)_auto]">
                <span className="text-center text-sm font-bold text-muted">{index + 1}</span>
                <div className="flex min-w-0 items-center gap-3">
                  <CoverArt title={track.title} color={track.coverColor} accent={track.coverAccent} coverUrl={track.coverUrl} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{track.title}</p>
                    <p className="truncate text-sm text-muted">{track.artist}</p>
                  </div>
                </div>
                <p className="hidden truncate text-sm text-muted sm:block">{plays ? formatCount(plays) : source === "youtube" ? "YouTube" : "Last.fm"}</p>
                <p className="hidden text-sm text-muted sm:block">{formatTime(track.duration)}</p>
                <button
                  type="button"
                  aria-label={`Слушать ${track.title}`}
                  disabled={!playable}
                  onClick={() => playTrack(track, tracks)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-lift transition hover:scale-105 group-hover:opacity-100 disabled:opacity-30"
                >
                  <Play className="ml-0.5 h-4 w-4 fill-black" />
                </button>
              </div>
            );
          })}
          {!tracks.length && !loading ? <p className="mt-6 text-sm text-muted">Ничего не найдено.</p> : null}
        </div>
      )}
    </div>
  );
}
