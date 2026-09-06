import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GAG Platform | Next.js 16 & TypeScript 7",
  description: "Deterministik Öncelikli Fullstack Geliştirme Platformu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
