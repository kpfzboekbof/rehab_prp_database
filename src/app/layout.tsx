import type { Metadata } from "next";

import { CLINIC_DESCRIPTION, CLINIC_NAME } from "@/lib/clinic";
import "./globals.css";

export const metadata: Metadata = {
  title: CLINIC_NAME,
  description: CLINIC_DESCRIPTION,
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
