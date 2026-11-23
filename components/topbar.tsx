"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Menu, Search, WifiOff } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { UserMenu } from "@/components/UserMenu";
import { useOnline } from "@/components/use-online";

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const online = useOnline();
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/80 to-black/20 px-3 py-3 backdrop-blur md:gap-3 md:px-5">
      {onMenu ? (
        <button type="button" aria-label="Открыть меню" onClick={onMenu} className="rounded-full bg-black/70 p-2 hover:bg-highlight md:hidden">
          <Menu className="h-5 w-5" />
        </button>
      ) : null}
      <button type="button" aria-label="Назад" onClick={() => router.back()} className="rounded-full bg-black/70 p-1.5 hover:bg-highlight">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label="Вперёд" onClick={() => router.forward()} className="hidden rounded-full bg-black/70 p-1.5 hover:bg-highlight sm:block">
        <ChevronRight className="h-5 w-5" />
      </button>
      {pathname !== "/search" ? (
        <form
          className="ml-1 hidden min-w-0 flex-1 md:block md:max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
          }}
        >
          <label className="flex items-center gap-2 rounded-full bg-highlight px-4 py-2.5 text-sm text-muted">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Что хочется послушать?"
              className="w-full bg-transparent text-white outline-none placeholder:text-muted"
            />
          </label>
        </form>
      ) : (
        <div className="flex-1" />
      )}
      <div className="ml-auto flex items-center gap-2">
        {!online ? (
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs text-muted">
            <WifiOff className="h-3.5 w-3.5" />
            Офлайн
          </span>
        ) : null}
        {user ? (
          <UserMenu />
        ) : (
          <Link href="/login" className="rounded-full bg-black/70 px-3 py-1.5 text-sm font-semibold hover:bg-highlight">
            Войти
          </Link>
        )}
      </div>
    </header>
  );
}
