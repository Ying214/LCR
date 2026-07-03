import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "石墨晶舟量測數據顯示與分析系統",
  description: "石墨晶舟量測資料管理、查詢與分析平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <SettingsProvider>
          <AppShell>{children}</AppShell>
        </SettingsProvider>
      </body>
    </html>
  );
}
