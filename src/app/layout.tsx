import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Masthead from "@/components/Masthead";
import ClaimOnSignIn from "@/components/ClaimOnSignIn";
import SessionProvider from "@/components/SessionProvider";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Page titles only. A text face rather than a display one, because the thing
 * this sits on top of is study material, and it should read like the books the
 * material came out of rather than like a product launch.
 */
const serif = Source_Serif_4({
  subsets: ["latin"],
  // 700 is the masthead wordmark; 600 is every page title.
  weight: ["600", "700"],
  variable: "--font-serif",
  display: "swap",
});

/** Only the text box and the format examples. Never the interface. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

/**
 * Absolute URLs for link previews.
 *
 * Every social scraper resolves an image against this, so a relative path
 * silently yields no preview at all. Vercel sets VERCEL_URL per deployment;
 * NEXT_PUBLIC_SITE_URL pins the canonical domain in production.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sagot: turn plain text into a quiz",
    template: "%s · Sagot",
  },
  description: "Paste your questions as plain text. Get an interactive quiz you can share with a link.",
  openGraph: {
    siteName: "Sagot",
    type: "website",
    locale: "en_PH",
  },
  twitter: { card: "summary_large_image" },
};

/** White is the design, so the phone's browser chrome matches the page. */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <SessionProvider>
          <ClaimOnSignIn />
          <a className="skip" href="#main">Skip to content</a>
          <Masthead />
          <main id="main">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
