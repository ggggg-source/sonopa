"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Library, Plus, Search } from "lucide-react";
import { CoverArt } from "@/components/cover";
import { useLibrary } from "@/components/library-provider";
import { usePlayback } from "@/components/player-provider";
import { cn } from "@/lib/format";

const links = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/search", label: "Поиск", icon: Search },
  { href: "/charts", label: "Чарты", icon: BarChart3 },
  { href: "/library", label: "Библиотека", icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();
  const { playlists, openCreate } = useLibrary();
  const { playlistId, playing } = usePlayback();

  return (
    <aside className="hidden w-[272px] shrink-0 flex-col gap-2 md:flex lg:w-[320px]">
      <nav className="rounded-lg bg-black p-2">
        <Link href="/" className="flex items-center gap-3 px-3 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green text-sm font-black text-black">S</span>
          <span className="text-lg font-extrabold tracking-tight">Sonora</span>
        </Link>
        <ul className="mt-1 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-4 rounded-md px-3 py-2.5 text-sm font-semibold text-muted transition hover:text-white",
                    active && "bg-highlight text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-black">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold text-muted">Мои плейлисты</p>
          <button type="button" onClick={openCreate} className="rounded-full p-1.5 text-muted hover:bg-highlight hover:text-white" aria-label="Создать плейлист">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {playlists.map((playlist) => {
            const active = pathname === `/playlist/${playlist.id}`;
            const sounding = playing && playlistId === playlist.id;
            return (
              <Link
                key={playlist.id}
                href={`/playlist/${playlist.id}`}
                className={cn("flex items-center gap-3 rounded-md px-2 py-2 hover:bg-highlight", active && "bg-highlight")}
              >
                <CoverArt title={playlist.name} color={playlist.coverColor} accent={playlist.coverAccent} className="h-12 w-12 shrink-0" />
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm font-medium", sounding && "text-green")}>{playlist.name}</span>
                  <span className="block truncate text-xs text-muted">{playlist.system ? "Плейлист" : `${playlist.items.length} треков`}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
