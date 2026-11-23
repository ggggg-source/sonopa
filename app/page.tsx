import { PageFade } from "@/components/page-fade";
export const metadata = { title: "Sonopa — музыка СНГ и Европы" };

import { HomeView } from "@/components/views/home-view";

export default function HomePage() {
  return (
    <PageFade>
      <HomeView />
    </PageFade>
  );
}
