import type { Metadata, Viewport } from "next";

import { CLINIC_DESCRIPTION, CLINIC_NAME } from "@/lib/clinic";
import "./globals.css";

export const metadata: Metadata = {
  title: CLINIC_NAME,
  description: CLINIC_DESCRIPTION,
};

// Without this, iOS Safari assumes a ~980px page and the user has to pinch-zoom
// to read anything. `device-width` makes the layout reflow to the real screen
// width; `viewportFit: "cover"` lets us pad around the notch via env(safe-area-*)
// so landscape goes edge-to-edge instead of letterboxed.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
