import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CCF — Crescent Club of Finance",
  description:
    "The Crescent Club of Finance (CCF) — events, registration, and admin platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
