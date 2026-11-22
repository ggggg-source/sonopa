"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { CoverArt, ytCover } from "@/components/cover";
import { formatTime } from "@/lib/format";
import type { Track } from "@/types";

type Props = {
  title: string;
  subtitle?: string;
  notice?: string;
  tracks: Track[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  href?: string;
  onPlay: (track: Track, queue: Track[]) => void;
};

function Card({ track, onPlay }: { track: Track; onPlay: () => void }) {
  const playable = track.source !== "youtube" || Boolean(track.youtubeId);
  const play = () => {
    if (!playable) return;
    console.log("🎵 КЛИК:", track.title, track.youtubeId);
    onPlay();
  };
  return (
    <article onClick={play} className="group w-40 shrink-0 cursor-pointer rounded-lg bg-elevated p-3 transition hover:bg-highlight">
      <div className="relative">
        <CoverArt title={track.title} color={track.coverColor} accent={track.coverAccent} coverUrl={track.coverUrl} fallbackUrl={ytCover(track.youtubeId)} className="aspect-square w-full shadow-lift" />
        <button
          type="button"
          aria-label={`Слушать ${track.title}`}
          disabled={!playable}
          onClick={(event) => {
            event.stopPropagation();
            play();
          }}
          className="absolute bottom-2 right-2 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-green text-black opacity-0 shadow-lift transition duration-200 hover:scale-105 hover:bg-green-hover group-hover:translate-y-0 group-hover:opacity-100 disabled:opacity-40"
        >
          <Play className="ml-0.5 h-4 w-4 fill-black" />
        </button>
      </div>
      <h3 className="mt-3 truncate text-sm font-semibold">{track.title}</h3>
      <p className="mt-1 truncate text-xs text-muted">
        {track.artist}
        <span className="text-white/40"> · {formatTime(track.duration)}</span>
      </p>
    </article>
  );
}

export function ChartSection({ title, subtitle, notice, tracks, loading, error, onRetry, href, onPlay }: Props) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {href ? (
          <Link href={href} className="shrink-0 text-sm font-semibold text-muted hover:underline">
            Показать все
          </Link>
        ) : null}
      </div>
      {notice ? <p className="mt-2 text-xs font-medium text-amber-300/90">{notice}</p> : null}
      {loading ? (
        <div className="mt-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 w-40 shrink-0 animate-pulse rounded-lg bg-elevated" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg bg-elevated p-6 text-sm text-muted">
          <p>{error}</p>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="mt-3 font-semibold text-green hover:underline">
              Повторить
            </button>
          ) : null}
        </div>
      ) : tracks.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Пока пусто</p>
      ) : (
        <div className="scrollbar-thin mt-4 flex gap-3 overflow-x-auto pb-2">
          {tracks.map((track) => (
            <Card key={track.id} track={track} onPlay={() => onPlay(track, tracks)} />
          ))}
        </div>
      )}
    </section>
  );
}
