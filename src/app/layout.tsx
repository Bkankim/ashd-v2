import type { ReactNode } from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { WebVitals } from "./_components/WebVitals";
import { Analytics } from "@vercel/analytics/next";

// W4: self-hosted Pretendard replaces the render-blocking cdn.jsdelivr <link> pair.
// next/font handles preloading + display:swap, so first paint no longer blocks on a
// third-party DNS/TLS/fetch. Exposes --font-pretendard, consumed by --font-sans in globals.css.
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "ASHD - AS/환불/보증 관리",
  description:
    "영수증·보증서를 업로드하면 OCR로 자동 추출하여 환불·보증 기한을 알려주는 서비스",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster richColors position="top-center" />
        <WebVitals />
        <Analytics />
      </body>
    </html>
  );
}
