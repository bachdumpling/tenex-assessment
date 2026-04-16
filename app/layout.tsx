import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppSessionProvider } from "@/components/providers/app-session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talk to a Folder",
  description: "RAG chat over your Google Drive folder with citations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark h-full min-h-dvh antialiased",
        geistSans.variable,
        geistMono.variable
      )}
    >
      <body className="flex min-h-dvh min-h-full flex-col">
        <TooltipProvider>
          <AppSessionProvider>{children}</AppSessionProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
