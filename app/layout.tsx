import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// STANDAR_UI_UX_MOCKUP_RULES BAB 1: Font tunggal Inter untuk seluruh platform
// Menggantikan Geist — keputusan Philips CASE SESI-14
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ERP Mediator Hyperlocal",
  description: "Platform Marketplace Jasa Reverse Auction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Tabler Icons webfont — React 19 native <link> dengan precedence prop
            membuat React mempertahankan sebagai stylesheet aktif (bukan preload-only).
            CSS untuk class .ti dan .ti-X akan diterapkan ke element <i> di seluruh app. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.24.0/dist/tabler-icons.min.css"
          precedence="default"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
