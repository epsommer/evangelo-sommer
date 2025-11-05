// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import SessionProviderWrapper from "../components/providers/SessionProviderWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Evangelo Sommer | Portfolio",
  description: "Portfolio and professional showcase of Evangelo Sommer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="neomorphic-window" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/xmz8zog.css" />
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const colorTheme = localStorage.getItem('color-theme') || 'light';
                  const windowTheme = localStorage.getItem('window-theme') || 'neomorphic';

                  // Apply color theme
                  const root = document.documentElement;
                  root.classList.remove('dark', 'mocha-mode', 'overkast-mode', 'true-night-mode');

                  if (colorTheme === 'mocha') {
                    root.classList.add('dark', 'mocha-mode');
                  } else if (colorTheme === 'overkast') {
                    root.classList.add('overkast-mode');
                  } else if (colorTheme === 'true-night') {
                    root.classList.add('dark', 'true-night-mode');
                  }

                  // Apply window theme
                  root.classList.remove('neomorphic-window', 'tactical-window');
                  root.classList.add(windowTheme + '-window');

                  root.setAttribute('data-color-theme', colorTheme);
                  root.setAttribute('data-window-theme', windowTheme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-hud-ui antialiased" suppressHydrationWarning>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
