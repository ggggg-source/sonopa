"use client";

import { AuthProvider } from "@/components/auth-provider";
import { LibraryProvider, useLibrary } from "@/components/library-provider";
import { MobileNav } from "@/components/mobile-nav";
import { Player } from "@/components/Player";
import { PlayerProvider } from "@/components/player-provider";
import { PlaylistDialog } from "@/components/playlist-dialog";
import { PwaRegister } from "@/components/pwa-register";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

function Frame({ children }: { children: React.ReactNode }) {
  const { notice } = useLibrary();
  return (
    <div className="relative flex h-dvh flex-col bg-black text-white">
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        <Sidebar />
        <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto rounded-lg bg-base">
          <TopBar />
          {children}
        </main>
      </div>
      <Player />
      <MobileNav />
      <PlaylistDialog />
      <PwaRegister />
      {notice ? <div className="fixed bottom-24 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-full bg-highlight px-4 py-2 text-center text-sm shadow-lift md:bottom-28">{notice}</div> : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LibraryProvider>
        <PlayerProvider>
          <Frame>{children}</Frame>
        </PlayerProvider>
      </LibraryProvider>
    </AuthProvider>
  );
}
