// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import SessionProviderWrapper from "../components/providers/SessionProviderWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "COMMAND CENTER | MSCRMS (Multi-service Client Relationship Management Service)",
  description: "Multi-service Client Relationship Management Service - Command Center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/xmz8zog.css" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="font-hud-ui antialiased">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
