"use client";

import Link from "next/link";
import { Play } from "lucide-react";
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
};

export function MediaCard({ title, subtitle, color, accent, coverUrl, href, onPlay }: Props) {
  return (
    <article className="group rounded-lg bg-elevated p-3 transition hover:bg-highlight">
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
          className="absolute bottom-2 right-2 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full bg-green text-black opacity-0 shadow-lift transition duration-200 hover:scale-105 hover:bg-green-hover group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Play className="ml-0.5 h-5 w-5 fill-black" />
        </button>
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
