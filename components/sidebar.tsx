"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Library, LogIn, Plus, Search, Users, X } from "lucide-react";
import { CoverArt } from "@/components/cover";
import { useLibrary } from "@/components/library-provider";
import { usePlayback } from "@/components/player-provider";
import { useAuth } from "@/components/auth-provider";
import { AuthModal } from "@/components/AuthModal";
import { FriendsBadge } from "@/components/friends-badge";
import { cn } from "@/lib/format";

const links = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/search", label: "Поиск", icon: Search },
  { href: "/charts", label: "Чарты", icon: BarChart3 },
  { href: "/library", label: "Библиотека", icon: Library },
  { href: "/friends", label: "Друзья", icon: Users },
];

export function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { playlists, openCreate } = useLibrary();
  const { playlistId, playing } = usePlayback();
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const body = (
    <>
      <nav className={cn("bg-black p-2", mobile ? "rounded-none" : "rounded-lg")}>
        <div className="flex items-center justify-between">
          <Link href="/" onClick={onClose} className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green text-sm font-black text-black">S</span>
            <span className="text-lg font-extrabold tracking-tight">Sonora</span>
          </Link>
          {mobile ? (
            <button type="button" onClick={onClose} aria-label="Закрыть меню" className="rounded-full p-2 text-muted hover:bg-highlight hover:text-white">
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
        <ul className="mt-1 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-4 rounded-md px-3 py-2.5 text-sm font-semibold text-muted transition hover:text-white",
                    active && "bg-highlight text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                  {link.href === "/friends" ? <FriendsBadge /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex min-h-0 flex-1 flex-col bg-black">
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
                onClick={onClose}
                className={cn("flex items-center gap-3 rounded-md px-2 py-2 hover:bg-highlight", active && "bg-highlight")}
              >
                <CoverArt title={playlist.name} color={playlist.coverColor} accent={playlist.coverAccent} className="h-12 w-12 shrink-0" />
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm font-medium", sounding && "text-white")}>{playlist.name}</span>
                  <span className="block truncate text-xs text-muted">{playlist.system ? "Плейлист" : `${playlist.items.length} треков`}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      {!loading && !user ? (
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-white/90"
          >
            <LogIn className="h-4 w-4" />
            Войти
          </button>
        </div>
      ) : null}
      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );

  if (mobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} aria-hidden />
        <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col gap-2 bg-black p-2 md:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          {body}
        </aside>
      </>
    );
  }

  return (
    <aside className="hidden w-[272px] shrink-0 flex-col gap-2 md:flex lg:w-[320px]">
      {body}
    </aside>
  );
}
