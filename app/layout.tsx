import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonora",
  description: "Музыкальный стриминг для СНГ и Европы",
  applicationName: "Sonora",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Sonora",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
