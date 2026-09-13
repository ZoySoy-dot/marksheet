import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Archivo, IBM_Plex_Mono, Newsreader } from "next/font/google";
import Masthead from "@/components/Masthead";
import "katex/dist/katex.min.css";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Marksheet — turn plain text into a quiz",
    template: "%s — Marksheet",
  },
  description: "Paste your questions as plain text. Get an interactive quiz you can share with a link.",
};

/** Sets the theme before first paint so the page never flashes the wrong one. */
const themeScript = `(function(){try{var t=localStorage.getItem("marksheet.theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

/** Clerk's own UI, dressed in the sheet's tokens so it does not arrive as a stranger. */
const clerkAppearance = {
  variables: {
    colorPrimary: "var(--graphite)",
    colorBackground: "var(--stock-2)",
    colorText: "var(--graphite)",
    colorTextSecondary: "var(--graphite-2)",
    colorInputBackground: "var(--stock)",
    colorInputText: "var(--graphite)",
    borderRadius: "3px",
    fontFamily: "var(--ff-body)",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`${archivo.variable} ${newsreader.variable} ${plexMono.variable}`}
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body>
          <a className="skip" href="#main">Skip to content</a>
          <Masthead />
          <main id="main">{children}</main>
          <footer className="footer">
            <p>Marksheet grades in your browser. Your answers are never stored.</p>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
