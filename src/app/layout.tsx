import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JalDrishti - Water-Secure Delhi",
  description: "3D Water-logging Prediction Dashboard",
};

import { Sidebar } from "@/components/dashboard/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased bg-black text-white`}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 relative min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
