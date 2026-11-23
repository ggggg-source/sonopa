"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Library, Search } from "lucide-react";
import { cn } from "@/lib/format";

const links = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/search", label: "Поиск", icon: Search },
  { href: "/charts", label: "Чарты", icon: BarChart3 },
  { href: "/library", label: "Библиотека", icon: Library },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="grid h-14 grid-cols-4 border-t border-white/10 bg-black md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Основная навигация"
    >
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.label}
            aria-current={active ? "page" : undefined}
            className={cn("flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] text-muted", active && "text-white")}
          >
            <Icon className="h-5 w-5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
