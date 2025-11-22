import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { Navigation } from "./navigation";
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
  metadataBase: new URL('https://32qki-jaaaa-aaaai-q4a7a-cai.icp0.io'),
  title: "PokedBots Racing | Wasteland Racing on ICP",
  description: "Race your PokedBots in the wasteland. Upgrade with scrap parts, compete in events, and win ICP prizes.",
  icons: {
    icon: '/pokedbots-racing-logo.webp',
    apple: '/pokedbots-racing-logo.webp',
  },
  openGraph: {
    title: "PokedBots Racing | Wasteland Racing on ICP",
    description: "Race your PokedBots in the wasteland. Upgrade with scrap parts, compete in events, and win ICP prizes.",
    url: "https://32qki-jaaaa-aaaai-q4a7a-cai.icp0.io",
    siteName: "PokedBots Racing",
    images: [
      {
        url: "/pokedbots-racing-logo.webp",
        width: 600,
        height: 200,
        alt: "PokedBots Racing - Wasteland Racing on ICP",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PokedBots Racing | Wasteland Racing on ICP",
    description: "Race your PokedBots in the wasteland. Upgrade with scrap parts, compete in events, and win ICP prizes.",
    images: ["/pokedbots-racing-logo.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-6">
            <div className="flex h-20 items-center justify-between">
              <Link href="/" className="flex items-center gap-3 font-semibold text-foreground hover:text-primary transition-colors">
                <Image src="/pokedbots-racing-icon.webp" alt="PokedBots Racing" width={150} height={50} className="h-9 w-auto translate-y-1" />
              </Link>
              <Navigation />
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t-2 py-12 mt-20 bg-muted/20">
          <div className="container mx-auto px-4 text-center">
            <p className="text-base text-muted-foreground font-medium">
              Built with ❤️ on the Internet Computer
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
