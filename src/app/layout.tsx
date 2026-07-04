import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Gully Trader - Trade with Discipline",
  description: "A mobile-first trading journal designed to enforce rules and discipline.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gully Trader",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full bg-slate-950 antialiased`}
    >
      <body className="min-h-full flex justify-center bg-slate-950 font-sans">
        <div className="w-full max-w-md min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24 relative border-x border-slate-900 md:border-slate-900/40 shadow-2xl shadow-slate-950/80">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
