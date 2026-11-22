"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pause, Play } from "lucide-react";
import { CoverArt, sourceLabel, ytCover } from "@/components/cover";
import { useLibrary } from "@/components/library-provider";
import { usePlayback } from "@/components/player-provider";
import { formatAdded, formatTime, cn } from "@/lib/format";
import type { Track } from "@/types";

function Bars() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      <span className="eq-bar h-4 w-[3px] rounded-full bg-green" />
      <span className="eq-bar h-4 w-[3px] rounded-full bg-green" />
      <span className="eq-bar h-4 w-[3px] rounded-full bg-green" />
    </span>
  );
}

type Props = {
  track: Track;
  index: number;
  queue: Track[];
  playlistId?: string;
  addedAt?: string;
  canRemove?: boolean;
};

export function TrackRow({ track, index, queue, playlistId, addedAt, canRemove }: Props) {
  const { playlists, addTrack, removeTrack } = useLibrary();
  const { current, playing, playTrack, toggle } = usePlayback();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = current?.id === track.id;

  useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  const play = () => {
    if (active) toggle();
    else playTrack(track, queue, { playlistId });
  };

  return (
    <div
      className={cn(
        "group grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2 hover:bg-white/10 sm:grid-cols-[32px_minmax(0,4fr)_minmax(0,2fr)_auto] lg:grid-cols-[32px_minmax(0,4fr)_minmax(0,2fr)_minmax(0,1.4fr)_auto]",
        active && "bg-white/[0.07]"
      )}
      onDoubleClick={play}
    >
      <button type="button" onClick={play} className="flex h-8 w-8 items-center justify-center text-muted" aria-label={active && playing ? "Пауза" : "Слушать"}>
        <span className="group-hover:hidden">{active && playing ? <Bars /> : <span className={cn(active && "text-green")}>{index + 1}</span>}</span>
        <span className="hidden group-hover:block">
          {active && playing ? <Pause className="h-4 w-4 fill-white text-white" /> : <Play className="h-4 w-4 fill-white text-white" />}
        </span>
      </button>
      <div className="flex min-w-0 items-center gap-3">
        <CoverArt title={track.title} color={track.coverColor} accent={track.coverAccent} coverUrl={track.coverUrl} fallbackUrl={ytCover(track.youtubeId)} className="h-10 w-10 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn("truncate font-medium", active && "text-green")}>{track.title}</p>
            {track.explicit ? <span className="rounded-sm bg-white/20 px-1 text-[10px] font-bold text-white/80">E</span> : null}
          </div>
          <p className="truncate text-sm text-muted">{track.artist}</p>
        </div>
      </div>
      <p className="hidden truncate text-sm text-muted sm:block">{track.album}</p>
      <p className="hidden truncate text-sm text-muted lg:block">{addedAt ? formatAdded(addedAt) : sourceLabel(track)}</p>
      <div className="flex items-center gap-2">
        <span className="w-12 text-right text-sm text-muted">{formatTime(track.duration)}</span>
        <button
          type="button"
          aria-label="Ещё"
          className="rounded-full p-1 text-muted opacity-0 hover:text-white group-hover:opacity-100"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setMenu({ x: Math.min(rect.right, window.innerWidth - 220), y: rect.bottom + 8 });
          }}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      {menu ? (
        <div
          ref={menuRef}
          className="fixed z-50 w-56 rounded-md bg-[#282828] p-1 text-sm shadow-lift"
          style={{ left: Math.max(8, menu.x - 200), top: Math.min(menu.y, window.innerHeight - 280) }}
        >
          <p className="px-3 py-2 text-xs uppercase tracking-wide text-muted">Добавить в плейлист</p>
          <div className="max-h-40 overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                className="block w-full truncate rounded px-3 py-2 text-left hover:bg-white/10"
                onClick={() => {
                  addTrack(playlist.id, track);
                  setMenu(null);
                }}
              >
                {playlist.name}
              </button>
            ))}
          </div>
          {canRemove && playlistId ? (
            <button
              type="button"
              className="mt-1 block w-full rounded px-3 py-2 text-left hover:bg-white/10"
              onClick={() => {
                removeTrack(playlistId, track.id);
                setMenu(null);
              }}
            >
              Удалить из плейлиста
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TrackTable({
  tracks,
  playlistId,
  addedAt,
  canRemove,
}: {
  tracks: Track[];
  playlistId?: string;
  addedAt?: string[];
  canRemove?: boolean;
}) {
  return (
    <div>
      <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] gap-3 border-b border-white/10 px-2 pb-2 text-xs uppercase tracking-wide text-muted sm:grid-cols-[32px_minmax(0,4fr)_minmax(0,2fr)_auto] lg:grid-cols-[32px_minmax(0,4fr)_minmax(0,2fr)_minmax(0,1.4fr)_auto]">
        <span>#</span>
        <span>Название</span>
        <span className="hidden sm:block">Альбом</span>
        <span className="hidden lg:block">Добавлен</span>
        <span className="text-right">Время</span>
      </div>
      <div className="mt-2">
        {tracks.map((track, index) => (
          <TrackRow
            key={`${track.id}-${index}`}
            track={track}
            index={index}
            queue={tracks}
            playlistId={playlistId}
            addedAt={addedAt?.[index]}
            canRemove={canRemove}
          />
        ))}
      </div>
    </div>
  );
}
