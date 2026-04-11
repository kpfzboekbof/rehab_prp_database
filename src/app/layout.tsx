import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "龜山康澤PRP管理系統",
  description: "龜山康澤復健科 自費 PRP 病人追蹤與管理系統",
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
