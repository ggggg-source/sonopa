"use client";

import { memo } from "react";
import { Play } from "lucide-react";
import { RepostButton } from "@/components/RepostButton";
import { CoverArt, ytCover } from "@/components/cover";
import { formatTime } from "@/lib/format";
import type { Track } from "@/types";

type Props = {
  track: Track;
  onPlay: () => void;
};

function TrackCardInner({ track, onPlay }: Props) {
  const play = () => {
    onPlay();
  };
  return (
    <article onClick={play} className="group cursor-pointer rounded-lg border border-white/10 bg-elevated p-3 transition duration-200 hover:scale-[1.03] hover:bg-highlight">
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
          className="absolute bottom-2 right-2 flex h-12 w-12 translate-y-2 scale-75 items-center justify-center rounded-full bg-green text-black opacity-0 shadow-lift transition duration-200 hover:scale-105 hover:bg-green-hover group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
        >
          <Play className="ml-0.5 h-5 w-5 fill-black" />
        </button>
        <RepostButton
          track={track}
          className="absolute bottom-2 left-2 flex h-10 w-10 translate-y-2 scale-75 items-center justify-center rounded-full bg-black/70 text-white opacity-0 shadow-lift backdrop-blur transition duration-200 hover:bg-white hover:text-black group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
        />
      </div>
      <h3 className="mt-3 truncate font-semibold text-white">{track.title}</h3>
      <p className="mt-1 truncate text-sm text-muted">
        {track.artist}
        <span className="text-white/40"> · {formatTime(track.duration)}</span>
      </p>
    </article>
  );
}


export const TrackCard = memo(TrackCardInner);
