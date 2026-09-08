import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0a0d14",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Voltflow ERP | Elektrik Ticaret & Şantiye Komuta Merkezi",
  description:
    "Elektrik Malzemecileri ve Taahhüt Şantiyeleri için Dikey ERP & Tezgâh Satış Sistemi",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Voltflow ERP",
  },
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
