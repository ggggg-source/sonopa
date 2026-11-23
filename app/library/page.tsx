export const metadata = { title: "Библиотека — Sonopa" };

import { LibraryView } from "@/components/views/library-view";
import { PageFade } from "@/components/page-fade";

export default function LibraryPage() {
  return (
    <PageFade>
      <LibraryView />
    </PageFade>
  );
}
