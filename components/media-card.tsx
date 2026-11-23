"use client";

import Link from "next/link";
import { Play, Shuffle } from "lucide-react";
import { CoverArt } from "@/components/cover";
import { cn } from "@/lib/format";

type Props = {
  title: string;
  subtitle: string;
  color: string;
  accent: string;
  coverUrl?: string;
  href?: string;
  onPlay: () => void;
  onShuffle?: () => void;
};

export function MediaCard({ title, subtitle, color, accent, coverUrl, href, onPlay, onShuffle }: Props) {
  return (
    <article className="group rounded-lg border border-white/10 bg-elevated p-3 transition duration-200 hover:scale-[1.03] hover:bg-highlight">
      <div className="relative">
        <CoverArt title={title} color={color} accent={accent} coverUrl={coverUrl} className="aspect-square w-full shadow-lift" />
        <button
          type="button"
          aria-label={`Слушать ${title}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPlay();
          }}
          className="absolute bottom-2 right-2 flex h-12 w-12 translate-y-2 scale-75 items-center justify-center rounded-full bg-green text-black opacity-0 shadow-lift transition duration-200 hover:scale-105 hover:bg-green-hover group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
        >
          <Play className="ml-0.5 h-5 w-5 fill-black" />
        </button>
        {onShuffle ? (
          <button
            type="button"
            aria-label={`Перемешать ${title}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onShuffle();
            }}
            className="absolute bottom-2 left-2 flex h-10 w-10 translate-y-2 scale-75 items-center justify-center rounded-full bg-black/70 text-white opacity-0 shadow-lift backdrop-blur transition duration-200 hover:bg-white hover:text-black group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {href ? (
        <Link href={href} className="mt-3 block truncate font-semibold hover:underline">
          {title}
        </Link>
      ) : (
        <h3 className="mt-3 truncate font-semibold">{title}</h3>
      )}
      <p className="mt-1 line-clamp-2 text-sm text-muted">{subtitle}</p>
    </article>
  );
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-4 md:grid-cols-4", className)}>{children}</div>;
}
