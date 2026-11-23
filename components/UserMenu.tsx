"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;
  const letter = (user.name || user.email || "S").slice(0, 1).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Меню пользователя"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white hover:bg-white/20"
      >
        {letter}
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-white/10 bg-[#1a1a1a] p-2 shadow-lift">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link href="/profile" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-highlight">
            Профиль
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/");
            }}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-highlight hover:text-white"
          >
            Выйти
          </button>
        </div>
      ) : null}
    </div>
  );
}
