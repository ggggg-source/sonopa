"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Toaster } from "react-hot-toast";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setShowTop(el.scrollTop > 500);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative flex h-dvh flex-col bg-black text-white">
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        <Sidebar />
        <main ref={mainRef} className="scrollbar-thin relative min-w-0 flex-1 overflow-y-auto rounded-lg bg-base">
          <TopBar onMenu={() => setMenuOpen(true)} />
          {children}
          {showTop ? (
            <button
              type="button"
              aria-label="Наверх"
              onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-28 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lift transition hover:bg-white/90 md:bottom-32"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          ) : null}
        </main>
      </div>
      {menuOpen ? <Sidebar mobile onClose={() => setMenuOpen(false)} /> : null}
      <Player />
      <MobileNav />
      <PlaylistDialog />
      <PwaRegister />
      <Toaster position="bottom-center" toastOptions={{ style: { background: "#1a1a1a", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999 } }} />
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
