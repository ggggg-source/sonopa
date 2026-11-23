export const metadata = { title: "Поиск — Sonopa" };

import { Suspense } from "react";
import { SearchView } from "@/components/views/search-view";
import { PageFade } from "@/components/page-fade";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-muted">Загрузка поиска…</div>}>
      <PageFade>
        <SearchView />
      </PageFade>
    </Suspense>
  );
}
