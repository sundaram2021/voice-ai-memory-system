import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Memory AI Dashboard",
  description: "Supermemory Graph Voice AI Assistant Integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-black text-zinc-100">{children}</body>
    </html>
  );
}
