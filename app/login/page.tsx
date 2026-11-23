export const metadata = { title: "Вход — Sonopa" };

import { LoginView } from "@/components/views/login-view";
import { PageFade } from "@/components/page-fade";

export default function LoginPage() {
  return (
    <PageFade>
      <LoginView />
    </PageFade>
  );
}
