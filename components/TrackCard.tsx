"use client";

import { Play } from "lucide-react";
import { CoverArt, ytCover } from "@/components/cover";
import { formatTime } from "@/lib/format";
import type { Track } from "@/types";

type Props = {
  track: Track;
  onPlay: () => void;
};

export function TrackCard({ track, onPlay }: Props) {
  const play = () => {
    console.log("🎵 КЛИК:", track.title, track.youtubeId);
    onPlay();
  };
  return (
    <article onClick={play} className="group cursor-pointer rounded-lg bg-elevated p-3 transition hover:bg-highlight">
      <div className="relative">
        <CoverArt
          title={track.title}
          color={track.coverColor}
          accent={track.coverAccent}
          coverUrl={track.coverUrl}
          fallbackUrl={ytCover(track.youtubeId)}
          className="aspect-square w-full shadow-lift"
        />
        <button
          type="button"
          aria-label={`Слушать ${track.title}`}
          onClick={(event) => {
            event.stopPropagation();
            play();
          }}
          className="absolute bottom-2 right-2 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full bg-green text-black opacity-0 shadow-lift transition duration-200 hover:scale-105 hover:bg-green-hover group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Play className="ml-0.5 h-5 w-5 fill-black" />
        </button>
      </div>
      <h3 className="mt-3 truncate font-semibold text-white">{track.title}</h3>
      <p className="mt-1 truncate text-sm text-muted">
        {track.artist}
        <span className="text-white/40"> · {formatTime(track.duration)}</span>
      </p>
    </article>
  );
}
