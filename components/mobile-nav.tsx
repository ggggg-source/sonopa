"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Search } from "lucide-react";
import { cn } from "@/lib/format";

const links = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/search", label: "Поиск", icon: Search },
  { href: "/library", label: "Медиатека", icon: Library },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="grid h-14 grid-cols-3 border-t border-white/10 bg-black md:hidden">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link key={link.href} href={link.href} className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px] text-muted", active && "text-white")}>
            <Icon className="h-5 w-5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
