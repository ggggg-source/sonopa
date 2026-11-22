import { Suspense } from "react";
import { SearchView } from "@/components/views/search-view";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-muted">Загрузка поиска…</div>}>
      <SearchView />
    </Suspense>
  );
}
