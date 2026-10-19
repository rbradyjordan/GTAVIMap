import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pricedown = localFont({
  src: "../fonts/pricedown.otf",
  variable: "--font-pricedown",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Blip VI",
  description: "A Magic City map of every launch-week spot worth a pin, Brickell to South Beach.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120d26",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={pricedown.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
