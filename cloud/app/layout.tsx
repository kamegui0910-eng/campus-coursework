import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Coursework · 随身课程库",
  description: "用自己的课程资料和模型，在手机上整理课程、准备和检查作业。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
