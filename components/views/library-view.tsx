"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { CoverArt } from "@/components/cover";
import { useLibrary } from "@/components/library-provider";

export function LibraryView() {
  const { playlists, openCreate, offlineIds } = useLibrary();
  return (
    <div className="px-4 pb-10 md:px-6">
      <div className="flex items-center justify-between gap-3 pt-2">
        <h1 className="text-3xl font-extrabold">Библиотека</h1>
        <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black hover:scale-105">
          <Plus className="h-4 w-4" />
          Плейлист
        </button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {playlists.map((playlist) => (
          <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="rounded-lg bg-elevated p-3 hover:bg-highlight">
            <CoverArt title={playlist.name} color={playlist.coverColor} accent={playlist.coverAccent} className="aspect-square w-full" />
            <p className="mt-3 truncate font-semibold">{playlist.name}</p>
            <p className="truncate text-sm text-muted">
              {playlist.items.length} треков
              {offlineIds.includes(playlist.id) ? " · офлайн" : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
