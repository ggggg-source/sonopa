export const metadata = { title: "Чарты — Sonopa" };

import { Suspense } from "react";
import { ChartsView } from "@/components/views/charts-view";
import { PageFade } from "@/components/page-fade";

export default function ChartsPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-muted">Загрузка чартов…</div>}>
      <PageFade>
        <ChartsView />
      </PageFade>
    </Suspense>
  );
}
