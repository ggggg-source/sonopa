export const metadata = { title: "Плейлист — Sonopa" };

import { PlaylistView } from "@/components/views/playlist-view";
import { PageFade } from "@/components/page-fade";

export default function PlaylistPage({ params }: { params: { id: string } }) {
  return (
    <PageFade>
      <PlaylistView id={params.id} />
    </PageFade>
  );
}
