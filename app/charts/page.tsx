import { Suspense } from "react";
import { ChartsView } from "@/components/views/charts-view";

export default function ChartsPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-muted">Загрузка чартов…</div>}>
      <ChartsView />
    </Suspense>
  );
}
