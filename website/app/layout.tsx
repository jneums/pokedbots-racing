import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
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
  title: "PokedBots Racing | Wasteland Racing on ICP",
  description: "Race your PokedBots in the wasteland. Upgrade with scrap parts, compete in events, and win ICP prizes.",
  icons: {
    icon: '/pokedbots-racing-logo.webp',
    apple: '/pokedbots-racing-logo.webp',
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
        <header className="sticky top-0 z-50 w-full border-b bg-card/50 backdrop-blur-lg">
          <div className="container mx-auto px-6">
            <div className="flex h-20 items-center justify-between">
              <Link href="/" className="flex items-center gap-3 font-semibold text-foreground hover:text-primary transition-colors">
                <Image src="/pokedbots-racing-icon.webp" alt="PokedBots Racing" width={150} height={50} className="h-9 w-auto translate-y-1" />
              </Link>
              <nav className="flex items-center gap-6">
                <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Docs
                </Link>
                <Link href="/guides" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Guides
                </Link>
                <Link 
                  href="https://github.com/jneums/pokedbots-racing" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </Link>
              </nav>
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
