import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AgentationProvider } from "@/components/dev/AgentationProvider";

export const metadata: Metadata = {
  title: "OutreachPilot | Production Cold Email & Campaign Automation",
  description: "High-Performance Cold Outreach & Bulk Email Campaign Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-white text-[#111111] antialiased" suppressHydrationWarning>
        <ToastProvider>
          {children}
          <AgentationProvider />
        </ToastProvider>
      </body>
    </html>
  );
}
