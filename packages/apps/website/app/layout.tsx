import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { Navigation } from "./navigation";
import { Providers } from "./providers";
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
        <Providers>
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
     <footer className="border-t-2 border-primary/20 py-12 bg-card/30">
            <div className="container mx-auto px-4">
              <div className="flex flex-col items-start sm:items-center gap-6">
                <div className="flex flex-col items-start sm:items-center gap-2 text-sm sm:text-base text-muted-foreground font-medium text-left sm:text-center">
                  <div className="flex items-center gap-1">
                    <span>Live on</span>
                    <a 
                      href="https://prometheusprotocol.org/app/io.github.jneums.final-score" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                    >
                      Prometheus Protocol
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Powered by</span>
                    <a 
                      href="https://internetcomputer.org" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                    >
                      Internet Computer
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="w-full sm:max-w-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">MCP URL</span>
                    <code className="text-xs sm:text-sm font-mono text-foreground break-all">
                      https://ilyol-uqaaa-aaaai-q34kq-cai.icp0.io/mcp
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
